import { createHmac } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SalesCallService } from '../src/app.js';
import { ElevenLabsClient } from '../src/elevenlabs/client.js';
import { EventDispatcher } from '../src/events/dispatcher.js';
import { defaultAdapters } from '../src/integrations/adapters.js';
import { JsonStore } from '../src/store/json-store.js';
import { loadPlaybook } from '../src/domain/playbook.js';

export const PLAYBOOK = loadPlaybook();

// Monday 2026-10-19 12:00 UTC: inside the default calling window.
export const NOW = new Date('2026-10-19T12:00:00Z');
export const WEBHOOK_SECRET = 'test-webhook-secret';
export const ADMIN_TOKEN = 'test-admin-token-0123456789abcdef';
export const TEST_PHONE = '+15550000001';

export const silentLogger = { info() {}, error() {} };

export function testConfig(overrides = {}) {
  return {
    port: 0,
    adminApiToken: ADMIN_TOKEN,
    callMode: 'test',
    testAllowlist: [TEST_PHONE],
    dryRun: false,
    companyName: 'Demo Realty',
    agentPersonaName: 'Sam',
    retentionDays: 365,
    elevenlabs: {
      apiKey: 'xi-test',
      agentId: 'agent_test',
      phoneNumberId: 'phnum_test',
      provider: 'twilio',
      webhookSecret: WEBHOOK_SECRET,
      baseUrl: 'https://api.elevenlabs.test',
    },
    ...overrides,
  };
}

export const campaignInput = {
  id: 'pilot',
  name: 'Pilot',
  status: 'active',
  campaign_focus: 'AI Sales Employee for real estate sales teams',
  compliance_approved: false,
  calling_hours: { days: [1, 2, 3, 4, 5], start: '10:00', end: '19:00' },
  retry_policy: { max_attempts: 3, min_hours_between_attempts: 4, cooldown_days_after_conversation: 7 },
};

export const leadInput = {
  id: 'lead-1',
  name: 'Karim Tester',
  company_name: 'Test Developments',
  contact_role: 'Sales Director',
  phone: TEST_PHONE,
  timezone: 'UTC',
  contact_reason: 'you asked about AI sales tools at a real estate event',
  consent: { basis: 'existing_enquiry', recorded_at: '2026-10-01', source: 'website form' },
};

// Fake fetch that records requests and returns a canned ElevenLabs response.
export function fakeFetch(response = { success: true, conversation_id: 'conv_1', callSid: 'CA1' }, status = 200) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify(response), { status });
  };
  fn.calls = calls;
  return fn;
}

export async function buildService({ configOverrides = {}, fetchImpl = fakeFetch(), now = NOW } = {}) {
  const config = testConfig(configOverrides);
  const store = await new JsonStore(await mkdtemp(path.join(tmpdir(), 're-agent-'))).init();
  const elevenlabs = new ElevenLabsClient({ ...config.elevenlabs, fetchImpl });
  const dispatcher = new EventDispatcher({ store, adapters: defaultAdapters(), logger: silentLogger });
  const service = new SalesCallService({ config, store, elevenlabs, dispatcher, playbook: PLAYBOOK, logger: silentLogger, clock: () => now });
  await service.upsertCampaign(campaignInput);
  await service.upsertLead(leadInput);
  return { service, store, config, fetchImpl };
}

export function sign(rawBody, { secret = WEBHOOK_SECRET, t = Math.floor(NOW.getTime() / 1000) } = {}) {
  const v0 = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  return `t=${t},v0=${v0}`;
}

export function postCallPayload(conversationId, results, { summary = 'Sales director discussed lead follow-up challenges.', nodes = [] } = {}) {
  const data_collection_results = Object.fromEntries(
    Object.entries(results).map(([k, value]) => [k, { data_collection_id: k, value, rationale: '' }]),
  );
  return JSON.stringify({
    type: 'post_call_transcription',
    event_timestamp: Math.floor(NOW.getTime() / 1000),
    data: {
      agent_id: 'agent_test',
      conversation_id: conversationId,
      status: 'done',
      metadata: { call_duration_secs: 180 },
      transcript: nodes.map((n, i) => ({ role: 'agent', message: '...', time_in_call_secs: i * 10, agent_metadata: { agent_id: 'agent_test', workflow_node_id: n } })),
      analysis: { transcript_summary: summary, data_collection_results, evaluation_criteria_results: {} },
    },
  });
}
