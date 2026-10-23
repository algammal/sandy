import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STEP_TYPES, loadDeployedIds, loadProcedures, procedureEvidence, renderProcedure, walkSteps } from '../src/elevenlabs/procedures.js';
import { parsePostCall } from '../src/elevenlabs/webhook.js';
import { buildService, postCallPayload, sign } from './helpers.js';
import { PLAYBOOK } from './helpers.js';

const procedures = loadProcedures();
const spoken = (p) => [...walkSteps(p.steps)].filter((s) => s.type === 'say').flatMap((s) => [s.message, ...Object.values(s.message_translations ?? {})]);

test('every procedure is structurally valid for ElevenLabs deterministic procedures', () => {
  for (const p of procedures) {
    assert.ok(p.steps.length > 0, p.key);
    for (const s of walkSteps(p.steps)) {
      assert.ok(STEP_TYPES.includes(s.type), `${p.key}: ${s.type}`);
      if (s.type === 'ask' || s.type === 'tell') assert.ok(s.instruction, p.key);
      if (s.type === 'say') assert.ok(s.message && s.message_translations?.en, `${p.key}: say needs Arabic + English`);
      if (s.type === 'branch') for (const b of s.branches) assert.ok(['llm', 'expression'].includes(b.condition.type) && b.steps.length);
      if (s.type === 'system_tool') assert.equal(s.system_tool_name, 'end_call');
    }
  }
});

test('only the sub-procedure has an empty trigger; all others are triggered', () => {
  for (const p of procedures) assert.equal(p.trigger === '', p.key === 'follow_up_capture', p.key);
});

test('verbatim lines never promise bookings, prices or results', () => {
  // Claims, not words: "won't quote figures that aren't confirmed" is fine; "your demo is confirmed" is not.
  const banned = [/\b(is|are|been|was)\s+(booked|confirmed|scheduled|sent)\b|\bbooked\b|\d+\s*(EGP|جنيه|%|\$)/i, /اتحجز|اتأكد|مضمون|اتبعت/];
  for (const p of procedures) for (const line of spoken(p)) for (const re of banned) assert.ok(!re.test(line), `${p.key}: "${line}"`);
});

test('do-not-call is a fixed sentence followed by ending the call, nothing else', () => {
  const dnc = procedures.find((p) => p.key === 'do_not_call');
  assert.deepEqual(dnc.steps.map((s) => s.type), ['say', 'system_tool']);
});

test('planned integrations are stated as not available', () => {
  const line = procedures.find((p) => p.key === 'integration_question').steps[0];
  assert.match(line.message, /لسه قيد التطوير ومش متاح/);
  assert.match(line.message_translations.en, /not available today/);
  assert.equal(PLAYBOOK.integrations.crm_or_google_sheets, 'planned');
});

test('rendering resolves the sub-procedure id and refuses to render without it', () => {
  const human = procedures.find((p) => p.key === 'human_requested');
  assert.throws(() => renderProcedure(human), /follow-up capture procedure id/);
  const body = renderProcedure(human, { followUpCaptureId: 'agtprc_x' });
  assert.equal(body.type, 'deterministic');
  const steps = JSON.parse(body.content).steps;
  assert.equal(steps[1].procedure_id, 'agtprc_x');
  assert.deepEqual(steps[0].message_translations, { en: { value: "Of course, I'll have someone from our sales team call you personally." } });
});

test('every procedure has a deployed ElevenLabs id', () => {
  const ids = loadDeployedIds();
  for (const p of procedures) assert.match(ids[p.key] ?? '', /^agtprc_/, p.key);
});

test('procedures that ran are read from the transcript and used as evidence over the extraction', async () => {
  const ids = loadDeployedIds();
  const nodes = ['permission', `__xi_procedure__procedure_entry_${ids.do_not_call}`, `__xi_procedure__${ids.do_not_call}/say_1/say_1`];
  const raw = postCallPayload('conv_1', { interest_expressed: true, do_not_call_requested: false }, { nodes });
  assert.deepEqual(parsePostCall(JSON.parse(raw)).proceduresRun, [ids.do_not_call]);
  assert.deepEqual(procedureEvidence([ids.do_not_call, ids.pricing_question], ids), { keys: ['do_not_call', 'pricing_question'], facts: { do_not_call_requested: true } });

  // End to end: the model's extraction missed the opt-out, the structured procedure did not.
  const { service, store } = await buildService();
  await service.startCall({ lead_id: 'lead-1', campaign_id: 'pilot', confirm: true });
  const res = await service.handleWebhook({ rawBody: raw, signatureHeader: sign(raw) });
  assert.equal(res.lead_category, 'do_not_call');
  assert.equal(store.isSuppressed('+15550000001'), true);
  assert.deepEqual(store.getCall('conv_1').procedures_run, ['do_not_call']);
});
