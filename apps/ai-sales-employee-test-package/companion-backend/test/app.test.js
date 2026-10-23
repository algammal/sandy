import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, describe, test } from 'node:test';
import { createHandler } from '../src/app.js';
import { verifySignature } from '../src/elevenlabs/webhook.js';
import { ADMIN_TOKEN, NOW, WEBHOOK_SECRET, buildService, fakeFetch, postCallPayload, sign, silentLogger } from './helpers.js';

async function startServer(service, config) {
  const server = createServer(createHandler({ service, config, logger: silentLogger }));
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (method, path, { body, token = ADMIN_TOKEN, headers = {} } = {}) =>
    fetch(`${base}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, json: await r.json() }));
  return { server, request };
}

const webhook = (request, raw, signature = sign(raw)) =>
  request('POST', '/webhooks/elevenlabs', { body: raw, token: null, headers: { 'elevenlabs-signature': signature } });

describe('webhook signature', () => {
  const raw = '{"a":1}';
  test('accepts a valid signature', () => {
    assert.equal(verifySignature({ rawBody: raw, header: sign(raw), secret: WEBHOOK_SECRET, now: NOW.getTime() }), true);
  });
  test('rejects a tampered body, wrong secret, or stale timestamp', () => {
    assert.equal(verifySignature({ rawBody: '{"a":2}', header: sign(raw), secret: WEBHOOK_SECRET, now: NOW.getTime() }), false);
    assert.equal(verifySignature({ rawBody: raw, header: sign(raw, { secret: 'x' }), secret: WEBHOOK_SECRET, now: NOW.getTime() }), false);
    const stale = sign(raw, { t: Math.floor(NOW.getTime() / 1000) - 3600 });
    assert.equal(verifySignature({ rawBody: raw, header: stale, secret: WEBHOOK_SECRET, now: NOW.getTime() }), false);
    assert.equal(verifySignature({ rawBody: raw, header: undefined, secret: WEBHOOK_SECRET }), false);
  });
});

describe('HTTP API', () => {
  let ctx;
  before(async () => {
    const built = await buildService();
    ctx = { ...built, ...(await startServer(built.service, built.config)) };
  });
  after(() => ctx.server.close());

  test('health is public and reports safety switches', async () => {
    const res = await ctx.request('GET', '/health', { token: null });
    assert.deepEqual(res.json, { ok: true, call_mode: 'test', dry_run: false });
  });

  test('unauthorised users cannot start calls or read leads', async () => {
    assert.equal((await ctx.request('POST', '/api/calls', { token: null, body: {} })).status, 401);
    assert.equal((await ctx.request('GET', '/api/leads/lead-1', { token: 'wrong-token-wrong-token-wrong' })).status, 401);
  });

  test('lead responses never expose the full phone number', async () => {
    const res = await ctx.request('GET', '/api/leads/lead-1');
    assert.equal(res.status, 200);
    assert.equal(res.json.phone, '********0001');
  });

  test('invalid lead input returns 400 with details', async () => {
    const res = await ctx.request('POST', '/api/leads', { body: { id: 'bad', phone: '123' } });
    assert.equal(res.status, 400);
    assert.ok(res.json.details.length > 0);
  });

  test('a call needs explicit confirmation', async () => {
    const res = await ctx.request('POST', '/api/calls', { body: { lead_id: 'lead-1', campaign_id: 'pilot' } });
    assert.equal(res.status, 400);
    assert.equal(ctx.fetchImpl.calls.length, 0);
  });

  test('full flow: call, post-call webhook, duplicate webhook, do-not-call suppression', async () => {
    const start = await ctx.request('POST', '/api/calls', { body: { lead_id: 'lead-1', campaign_id: 'pilot', confirm: true } });
    assert.equal(start.status, 200);
    assert.equal(start.json.conversation_id, 'conv_1');
    const sent = ctx.fetchImpl.calls[0];
    assert.equal(sent.url, 'https://api.elevenlabs.test/v1/convai/twilio/outbound-call');
    assert.equal(sent.init.headers['xi-api-key'], 'xi-test');
    assert.equal(sent.body.conversation_initiation_client_data.dynamic_variables.lead_id, 'lead-1');

    // A second call while the first is in progress is blocked.
    const dup = await ctx.request('POST', '/api/calls', { body: { lead_id: 'lead-1', campaign_id: 'pilot', confirm: true } });
    assert.equal(dup.status, 422);
    assert.ok(dup.json.reasons.includes('call_already_in_progress'));

    // Unsigned webhook is rejected and changes nothing.
    const raw = postCallPayload('conv_1', { interest_expressed: true, do_not_call_requested: true, call_outcome: 'do_not_call' }, { nodes: ['permission', 'discovery', 'dnc'] });
    assert.equal((await webhook(ctx.request, raw, 't=1,v0=00')).status, 401);
    assert.equal(ctx.store.getLead('lead-1').do_not_call, false);

    const processed = await webhook(ctx.request, raw);
    assert.equal(processed.status, 200);
    assert.equal(processed.json.lead_category, 'do_not_call');
    assert.deepEqual(processed.json.events, ['call.completed', 'lead.do_not_call']);

    const replay = await webhook(ctx.request, raw);
    assert.deepEqual(replay.json, { duplicate: true });
    assert.equal(ctx.store.listEvents().length, 2);

    assert.equal(ctx.store.isSuppressed('+15550000001'), true);
    const again = await ctx.request('POST', '/api/calls', { body: { lead_id: 'lead-1', campaign_id: 'pilot', confirm: true } });
    assert.equal(again.status, 422);
    assert.ok(again.json.reasons.includes('do_not_call'));
    assert.equal(ctx.fetchImpl.calls.length, 1);

    // Re-importing the lead must not clear the do-not-call flag.
    await ctx.request('POST', '/api/leads', {
      body: { id: 'lead-1', name: 'Karim', company_name: 'Test Developments', phone: '+15550000001', timezone: 'UTC', consent: { basis: 'explicit_consent', recorded_at: '2026-10-19' } },
    });
    assert.equal(ctx.store.getLead('lead-1').do_not_call, true);
  });

  test('webhooks for conversations this service did not start are ignored', async () => {
    const raw = postCallPayload('conv_unknown', { interest_expressed: true });
    const res = await webhook(ctx.request, raw);
    assert.deepEqual(res.json, { ignored: 'unknown_conversation' });
  });
});

describe('integration events are generated but never sent', () => {
  test('hot lead produces outbox entries marked not_sent', async () => {
    const { service, store } = await buildService();
    await service.startCall({ lead_id: 'lead-1', campaign_id: 'pilot', confirm: true });
    store.getLead('lead-1').channel_consent = { whatsapp: true };
    const raw = postCallPayload(
      'conv_1',
      {
        interest_expressed: true,
        relevant_need_identified: true,
        preferred_next_step: 'demo_requested',
        consent_to_follow_up: true,
        follow_up_channel: 'whatsapp',
        preferred_callback_time: 'Sunday 10am',
      },
      { nodes: ['permission', 'discovery', 'presentation', 'next_step', 'follow_up', 'close'] },
    );
    const res = await service.handleWebhook({ rawBody: raw, signatureHeader: sign(raw) });
    assert.equal(res.lead_category, 'hot');
    assert.equal(store.getCall('conv_1').flow_valid, true);
    const outbox = store.listOutbox();
    assert.ok(outbox.length > 0);
    assert.ok(outbox.every((o) => o.status === 'not_sent' && o.detail === 'integration_disabled'));
    assert.ok(outbox.some((o) => o.adapter === 'whatsapp' && o.plan.template === 'demo_request_ack_v1'));
    assert.ok(outbox.some((o) => o.adapter === 'crm' && o.plan.payload.upsert_key === 'lead-1'));
  });

  test('WhatsApp follow-up without channel opt-in is blocked', async () => {
    const { service, store } = await buildService();
    await service.startCall({ lead_id: 'lead-1', campaign_id: 'pilot', confirm: true });
    const raw = postCallPayload('conv_1', { preferred_next_step: 'information_requested', consent_to_follow_up: true, follow_up_channel: 'whatsapp' });
    await service.handleWebhook({ rawBody: raw, signatureHeader: sign(raw) });
    const wa = store.listOutbox().filter((o) => o.adapter === 'whatsapp');
    assert.ok(wa.length > 0 && wa.every((o) => o.status === 'blocked' && o.detail === 'no_whatsapp_opt_in'));
  });
});

describe('safety switches and failures', () => {
  test('dry run validates everything but never contacts ElevenLabs', async () => {
    const fetchImpl = fakeFetch();
    const { service, store } = await buildService({ configOverrides: { dryRun: true }, fetchImpl });
    const res = await service.startCall({ lead_id: 'lead-1', campaign_id: 'pilot', confirm: true });
    assert.equal(res.dry_run, true);
    assert.equal(res.would_send.body.to_number, '********0001');
    assert.equal(fetchImpl.calls.length, 0);
    assert.equal(store.getLead('lead-1').attempts, 0);
  });

  test('disabled mode blocks calls', async () => {
    const { service } = await buildService({ configOverrides: { callMode: 'disabled' } });
    await assert.rejects(service.startCall({ lead_id: 'lead-1', campaign_id: 'pilot', confirm: true }), (err) =>
      err.details.reasons.includes('calling_disabled'),
    );
  });

  test('ElevenLabs failure returns 502, counts the attempt, and does not leave a call in progress', async () => {
    const fetchImpl = fakeFetch({ detail: 'quota exceeded' }, 429);
    const { service, store } = await buildService({ fetchImpl });
    await assert.rejects(service.startCall({ lead_id: 'lead-1', campaign_id: 'pilot', confirm: true }), (err) => {
      assert.equal(err.status, 502);
      assert.equal(err.details.retryable, true);
      return true;
    });
    const lead = store.getLead('lead-1');
    assert.equal(lead.attempts, 1);
    assert.equal(lead.status, 'retry_scheduled');
    assert.equal(store.activeCallForLead('lead-1'), null);
  });

  test('outcome save failure is not reported as success; retry completes without duplicates', async () => {
    const { service, store } = await buildService();
    await service.startCall({ lead_id: 'lead-1', campaign_id: 'pilot', confirm: true });
    const raw = postCallPayload('conv_1', {
      interest_expressed: true,
      relevant_need_identified: true,
      preferred_next_step: 'human_callback_requested',
      consent_to_follow_up: true,
    });
    const realPut = store.putLead.bind(store);
    let failOnce = true;
    store.putLead = async (lead) => {
      if (failOnce) {
        failOnce = false;
        throw new Error('disk full');
      }
      return realPut(lead);
    };
    await assert.rejects(service.handleWebhook({ rawBody: raw, signatureHeader: sign(raw) }), /disk full/);
    assert.equal(store.data.processed_webhooks['post_call_transcription:conv_1'], undefined, 'not marked processed');
    assert.equal(store.listEvents().length, 0, 'no business events published');

    const retry = await service.handleWebhook({ rawBody: raw, signatureHeader: sign(raw) });
    assert.equal(retry.processed, true);
    assert.equal(retry.lead_category, 'hot');
    const again = await service.handleWebhook({ rawBody: raw, signatureHeader: sign(raw) });
    assert.deepEqual(again, { duplicate: true });
    assert.equal(store.listEvents().filter((e) => e.type === 'lead.follow_up_requested').length, 1);
  });

  test('call initiation failure webhook marks the lead unreachable', async () => {
    const { service, store } = await buildService();
    await service.startCall({ lead_id: 'lead-1', campaign_id: 'pilot', confirm: true });
    const raw = JSON.stringify({ type: 'call_initiation_failure', data: { agent_id: 'agent_test', conversation_id: 'conv_1', failure_reason: 'no-answer' } });
    const res = await service.handleWebhook({ rawBody: raw, signatureHeader: sign(raw) });
    assert.equal(res.lead_category, 'unreachable');
    assert.equal(store.getLead('lead-1').status, 'retry_scheduled');
    assert.equal(store.getCall('conv_1').status, 'failed');
  });
});
