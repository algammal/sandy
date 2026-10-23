import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { describe, test } from 'node:test';
import { createHandler } from '../src/app.js';
import { ADMIN_TOKEN, NOW, buildService, postCallPayload, sign, silentLogger } from './helpers.js';

const SECRET = 'test-sales-flow-secret-0123456789';

// Fake ElevenLabs that hands out a new conversation id per call.
function sequentialFetch() {
  let n = 0;
  const fn = async (url, init) => {
    fn.calls.push(JSON.parse(init.body));
    n += 1;
    return new Response(JSON.stringify({ success: true, conversation_id: `conv_${n}`, callSid: `CA${n}` }), { status: 200 });
  };
  fn.calls = [];
  return fn;
}

async function flowService(configOverrides = {}) {
  return buildService({ configOverrides: { salesFlowToolSecret: SECRET, ...configOverrides }, fetchImpl: sequentialFetch() });
}

const step = (service, conversationId, intent, extra = {}) =>
  service.handleFlowTool({ body: { conversation_id: conversationId, intent, ...extra }, secretHeader: SECRET });

const webhook = (service, raw) => service.handleWebhook({ rawBody: raw, signatureHeader: sign(raw) });

describe('in-call controller (sales_flow_step tool)', () => {
  test('the backend, not the model, decides each next node; context is persisted', async () => {
    const { service, store, fetchImpl } = await flowService();
    await service.startCall({ lead_id: 'lead-1', campaign_id: 'pilot', confirm: true });
    assert.equal(fetchImpl.calls[0].conversation_initiation_client_data.dynamic_variables.flow_next_node, 'permission');

    // "أيوه اتفضلي"
    let r = await step(service, 'conv_1', 'permission_granted');
    assert.deepEqual([r.accepted, r.next_node, r.stage_changed], [true, 'discovery', true]);
    assert.deepEqual(r.guidance.still_missing, ['current_lead_process', 'primary_challenge']);

    // "الفريق بيكلم الليدز من شيت" — one required fact: stays in discovery.
    r = await step(service, 'conv_1', 'discovery_answer', { field: 'current_lead_process', value: 'manual calls from a sheet' });
    assert.equal(r.next_node, 'discovery');
    assert.deepEqual(r.guidance.still_missing, ['primary_challenge']);

    // The model claims discovery is done too early: rejected, stage unchanged.
    r = await step(service, 'conv_1', 'discovery_complete');
    assert.equal(r.accepted, false);
    assert.equal(r.next_node, 'discovery');
    assert.match(r.reason, /missing primary_challenge/);

    r = await step(service, 'conv_1', 'discovery_answer', { field: 'primary_challenge', value: 'slow first response' });
    assert.equal(r.next_node, 'presentation');

    // "طيب بكام؟" -> registry strategy is handed to the model, then escalation to a next step.
    r = await step(service, 'conv_1', 'objection_raised', { objection_ids: 'asks_for_pricing' });
    assert.equal(r.next_node, 'objection');
    assert.equal(r.guidance.handle_now, 'asks_for_pricing');
    assert.match(r.guidance.strategy, /Never give a number/);
    r = await step(service, 'conv_1', 'objection_resolved');
    assert.equal(r.next_node, 'next_step');

    const ctx = store.getFlowContext('conv_1');
    assert.deepEqual(ctx.history, [
      'PRE_CALL_CHECK', 'CALL_INITIATED', 'IDENTITY_DISCLOSURE', 'PERMISSION_CHECK', 'DISCOVERY',
      'SOLUTION_PRESENTATION', 'OBJECTION_HANDLING', 'NEXT_STEP_SELECTION',
    ]);
    assert.equal(ctx.consentStatus, 'existing_enquiry');
  });

  test('do-not-call ends the flow; nothing can restart it', async () => {
    const { service } = await flowService();
    await service.startCall({ lead_id: 'lead-1', campaign_id: 'pilot', confirm: true });
    await step(service, 'conv_1', 'permission_granted');
    const r = await step(service, 'conv_1', 'dnc_requested'); // "شيلوا رقمي لو سمحتي"
    assert.equal(r.next_node, 'dnc');
    const after = await step(service, 'conv_1', 'permission_granted');
    assert.deepEqual([after.accepted, after.next_node], [false, 'dnc']);
  });

  test('tool arguments are validated, not trusted', async () => {
    const { service } = await flowService();
    await service.startCall({ lead_id: 'lead-1', campaign_id: 'pilot', confirm: true });
    await assert.rejects(step(service, 'conv_1', 'book_meeting_now'), (e) => e.status === 400);
    await assert.rejects(step(service, 'conv_1', 'objection_raised', { objection_ids: 'made_up_objection' }), (e) => e.status === 400);
    await step(service, 'conv_1', 'permission_granted');
    await assert.rejects(step(service, 'conv_1', 'discovery_answer', { field: 'budget', value: 'big' }), (e) => e.status === 400);
    // An "unknown" answer is stored as no value.
    await step(service, 'conv_1', 'discovery_answer', { field: 'primary_challenge', value: 'unknown' });
    assert.equal('primary_challenge' in service.store.getFlowContext('conv_1').data, false);
  });

  test('authentication, disabled endpoint and unknown conversations', async () => {
    const live = await flowService({ callMode: 'live' });
    await assert.rejects(live.service.handleFlowTool({ body: { conversation_id: 'x', intent: 'permission_granted' }, secretHeader: 'wrong' }), (e) => e.status === 401);
    await assert.rejects(step(live.service, 'conv_never_started', 'permission_granted'), (e) => e.status === 400 && /unknown conversation/.test(e.message));

    // Test mode: ElevenLabs simulations (not started by us) get a sandbox context with no lead.
    const sandbox = await flowService();
    const r = await step(sandbox.service, 'sim_1', 'permission_granted');
    assert.equal(r.next_node, 'discovery');
    assert.equal(sandbox.store.getFlowContext('sim_1').sandbox, true);

    const off = await buildService();
    await assert.rejects(step(off.service, 'conv_1', 'permission_granted'), (e) => e.status === 404);
  });

  test('HTTP route requires the shared secret header', async () => {
    const { service, config } = await flowService();
    const server = createServer(createHandler({ service, config, logger: silentLogger }));
    await new Promise((r) => server.listen(0, r));
    const url = `http://127.0.0.1:${server.address().port}/tools/sales-flow`;
    const post = (headers) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ conversation_id: 'sim_9', intent: 'permission_granted' }) });
    assert.equal((await post({ authorization: `Bearer ${ADMIN_TOKEN}` })).status, 401, 'admin token is not the tool secret');
    const ok = await post({ 'x-sales-flow-secret': SECRET });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).next_node, 'discovery');
    server.close();
  });
});

describe('scenario 12: disconnection followed by a retry call', () => {
  test('controller path is authoritative, and the retried call creates no duplicate business actions', async () => {
    const { service, store } = await flowService();
    await service.startCall({ lead_id: 'lead-1', campaign_id: 'pilot', confirm: true });

    // Call 1: agrees to a demo, then the line drops before the time is captured.
    await step(service, 'conv_1', 'permission_granted');
    await step(service, 'conv_1', 'discovery_answer', { field: 'current_lead_process', value: 'sheet' });
    await step(service, 'conv_1', 'discovery_answer', { field: 'primary_challenge', value: 'slow follow-up' });
    await step(service, 'conv_1', 'presentation_done');
    let r = await step(service, 'conv_1', 'next_step_agreed', { next_step: 'demo_requested' }); // "ياريت ديمو"
    assert.equal(r.next_node, 'follow_up');

    const demoResults = { interest_expressed: true, relevant_need_identified: true, preferred_next_step: 'demo_requested', consent_to_follow_up: true, follow_up_channel: 'phone' };
    const raw1 = postCallPayload('conv_1', { ...demoResults, call_outcome: 'disconnected' }, { nodes: ['permission', 'discovery', 'presentation', 'next_step', 'follow_up'] });
    const first = await webhook(service, raw1);
    assert.equal(first.lead_category, 'hot');
    assert.ok(first.events.includes('demo.requested'));

    const call1 = store.getCall('conv_1');
    assert.equal(call1.flow_source, 'controller');
    assert.equal(call1.flow_valid, true);
    assert.equal(call1.trace_matches_controller, true);
    assert.deepEqual(call1.state_path.slice(-3), ['FOLLOW_UP_CAPTURE', 'CALL_SUMMARY', 'CALL_COMPLETED']);
    assert.equal(store.getFlowContext('conv_1').currentState, 'CALL_COMPLETED', 'summary completes only after the save');
    assert.equal(store.getFlowContext('conv_1').callOutcome, 'disconnected');

    // ElevenLabs re-delivers the same webhook: ignored.
    assert.deepEqual(await webhook(service, raw1), { duplicate: true });

    // Retry call after the cooldown: the prospect asks for the demo again.
    const later = new Date(NOW.getTime() + 8 * 86400 * 1000);
    service.clock = () => later;
    const started = await service.startCall({ lead_id: 'lead-1', campaign_id: 'pilot', confirm: true });
    assert.equal(started.conversation_id, 'conv_2');
    await step(service, 'conv_2', 'permission_granted');
    await step(service, 'conv_2', 'discovery_declined');
    r = await step(service, 'conv_2', 'next_step_agreed', { next_step: 'demo_requested' });
    await step(service, 'conv_2', 'follow_up_captured', { callback_time: 'Sunday 11am', channel: 'phone' });
    const raw2 = postCallPayload('conv_2', { ...demoResults, preferred_callback_time: 'Sunday 11am' }, { nodes: ['permission', 'discovery', 'next_step', 'follow_up', 'close'] });
    const second = await service.handleWebhook({ rawBody: raw2, signatureHeader: sign(raw2, { t: Math.floor(later.getTime() / 1000) }) });
    assert.ok(!second.events.includes('demo.requested'), 'no second demo request');

    const events = store.listEvents();
    assert.equal(events.filter((e) => e.type === 'demo.requested').length, 1);
    assert.equal(events.filter((e) => e.type === 'lead.follow_up_requested').length, 1);
    assert.equal(events.find((e) => e.id === 'call.completed:conv_2').data.duplicate_follow_up, true);
    assert.equal(store.getLead('lead-1').attempts, 2);
  });

  test('a failed save is recorded on the controller context and completes only after a successful retry', async () => {
    const { service, store } = await flowService();
    await service.startCall({ lead_id: 'lead-1', campaign_id: 'pilot', confirm: true });
    await step(service, 'conv_1', 'permission_declined');
    const raw = postCallPayload('conv_1', { explicit_rejection: true, call_outcome: 'not_interested' });
    const realPut = store.putLead.bind(store);
    let fail = true;
    store.putLead = async (lead) => {
      if (fail) {
        fail = false;
        throw new Error('disk full');
      }
      return realPut(lead);
    };
    await assert.rejects(webhook(service, raw), /disk full/);
    let ctx = store.getFlowContext('conv_1');
    assert.deepEqual([ctx.currentState, ctx.saveAttempts, ctx.saveFailed], ['CALL_SUMMARY', 1, false]);
    await webhook(service, raw);
    ctx = store.getFlowContext('conv_1');
    assert.deepEqual([ctx.currentState, ctx.saveFailed], ['CALL_COMPLETED', false]);
  });
});
