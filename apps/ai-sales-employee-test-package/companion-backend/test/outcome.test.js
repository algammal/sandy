import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCampaign } from '../src/domain/campaign.js';
import { newLeadRecord, parseLeadInput } from '../src/domain/lead.js';
import { applyInitiationFailure, applyOutcome } from '../src/domain/outcome.js';
import { deriveSignals, qualify } from '../src/domain/qualification.js';
import { validateEvent } from '../src/events/catalog.js';
import { NOW, PLAYBOOK, campaignInput, leadInput } from './helpers.js';

const campaign = parseCampaign(campaignInput);
const lead = { ...newLeadRecord(parseLeadInput(leadInput), NOW), attempts: 1 };
const conversation = { id: 'conv_1', summary: 'summary', durationSecs: 120 };
const run = (results, extra = {}) => applyOutcome({ lead, results, conversation, campaign, playbook: PLAYBOOK, now: NOW, ...extra });
const types = (events) => events.map((e) => e.type).sort();
const classify = (data) => qualify(deriveSignals(data), PLAYBOOK.qualification).category;

const HOT = {
  call_outcome: 'demo_requested',
  interest_expressed: true,
  relevant_need_identified: true,
  preferred_next_step: 'demo_requested',
  consent_to_follow_up: true,
  preferred_callback_time: 'Thursday afternoon',
  follow_up_channel: 'phone',
  company_name: 'Test Developments',
  sales_team_size: 12,
  lead_volume: 900,
  current_lead_process: 'Manual calls from a Google Sheet',
  primary_challenge: 'Cannot call every lead quickly',
  current_crm: 'Google Sheets',
  objections: 'asks_for_pricing, made_up_objection',
};

test('deterministic qualification rules', () => {
  assert.equal(classify({ interest_expressed: true, relevant_need_identified: true, preferred_next_step: 'demo_requested' }), 'hot');
  // Politeness and answering questions is not enough for hot.
  assert.equal(classify({ interest_expressed: true, relevant_need_identified: true }), 'warm');
  assert.equal(classify({ interest_expressed: true, preferred_next_step: 'demo_requested' }), 'unknown');
  assert.equal(classify({ preferred_next_step: 'information_requested' }), 'warm');
  assert.equal(classify({ relevant_need_identified: true, needs_internal_approval: true }), 'warm');
  assert.equal(classify({ low_interest: true }), 'cold');
  assert.equal(classify({}), 'unknown');
  assert.equal(classify({ human_requested: true }), 'human_follow_up_required');
  assert.equal(classify({ call_outcome: 'voicemail' }), 'unreachable');
  // Compliance outcomes win over everything and are separate from each other.
  assert.equal(classify({ ...HOT, do_not_call_requested: true }), 'do_not_call');
  assert.equal(classify({ interest_expressed: true, explicit_rejection: true }), 'not_interested');
});

test('qualified prospect requesting a demo: hot, demo.requested unconfirmed, objections filtered', () => {
  const { lead: updated, events, qualification } = run(HOT);
  assert.equal(updated.category, 'hot');
  assert.deepEqual(qualification.reasons, ['interest_expressed', 'relevant_need_identified', 'concrete_next_step_agreed']);
  assert.equal(updated.qualification.sales_team_size, 12);
  assert.deepEqual(updated.qualification.objections, ['asks_for_pricing']);
  assert.deepEqual(types(events), ['call.completed', 'demo.requested', 'lead.follow_up_requested', 'lead.qualified']);
  const demo = events.find((e) => e.type === 'demo.requested');
  assert.equal(demo.data.confirmed, false);
  assert.equal(demo.data.booking_integration, false);
  for (const e of events) assert.deepEqual(validateEvent(e), []);
});

test("the model's own category suggestion is ignored", () => {
  const { lead: updated } = run({ lead_category_suggested: 'hot', interest_expressed: true });
  assert.equal(updated.category, 'unknown');
});

test('do-not-call overrides everything and clears open follow-ups', () => {
  const { lead: updated, events } = run({ ...HOT, do_not_call_requested: true, call_outcome: 'do_not_call' });
  assert.equal(updated.category, 'do_not_call');
  assert.equal(updated.do_not_call, true);
  assert.deepEqual(updated.open_follow_ups, {});
  assert.deepEqual(types(events), ['call.completed', 'lead.do_not_call']);
});

test('contradictory answers are routed to a human, not guessed', () => {
  const { lead: updated, issues } = run({ explicit_rejection: true, preferred_next_step: 'demo_requested', consent_to_follow_up: true });
  assert.equal(updated.category, 'human_follow_up_required');
  assert.ok(issues.some((i) => i.startsWith('contradiction')));
  assert.equal(updated.needs_review, true);
});

test('invalid types are dropped as unknown, not coerced', () => {
  const { lead: updated, issues } = run({ interest_expressed: 'yes', sales_team_size: 'about ten', call_outcome: 'great' });
  assert.equal(updated.category, 'unknown');
  assert.equal('sales_team_size' in updated.qualification, false);
  assert.ok(issues.includes('interest_expressed: not a boolean'));
});

test('consent to follow up is never inferred', () => {
  const { issues } = run({ ...HOT, consent_to_follow_up: undefined });
  assert.ok(issues.includes('follow-up step without explicit consent to be contacted'));
});

test('information request emits information.requested', () => {
  const { events, lead: updated } = run({ preferred_next_step: 'information_requested', follow_up_channel: 'whatsapp', consent_to_follow_up: true });
  assert.equal(updated.category, 'warm');
  assert.ok(types(events).includes('information.requested'));
});

test('repeat request across a retried call does not duplicate business actions', () => {
  const first = run(HOT);
  const second = applyOutcome({ lead: first.lead, results: HOT, conversation: { ...conversation, id: 'conv_2' }, campaign, playbook: PLAYBOOK, now: NOW });
  assert.deepEqual(types(second.events), ['call.completed', 'lead.qualified']);
  assert.equal(second.events[0].data.duplicate_follow_up, true);
  assert.equal(second.lead.open_follow_ups.demo_requested.conversation_id, 'conv_1');
});

test('workflow path is validated; violations flag the lead for review', () => {
  const ok = run(HOT, { path: ['PRE_CALL_CHECK', 'CALL_INITIATED', 'IDENTITY_DISCLOSURE', 'PERMISSION_CHECK', 'CALL_SUMMARY', 'CALL_COMPLETED'] });
  assert.equal(ok.flow.valid, true);
  const bad = run(HOT, { path: ['PRE_CALL_CHECK', 'CALL_INITIATED', 'IDENTITY_DISCLOSURE', 'PERMISSION_CHECK', 'SOLUTION_PRESENTATION'] });
  assert.equal(bad.flow.valid, false);
  assert.equal(bad.lead.needs_review, true);
  assert.equal(bad.events[0].data.flow_valid, false);
  const none = run(HOT);
  assert.equal(none.flow.valid, null, 'no trace means unknown, not valid');
});

test('voicemail schedules a retry and is not a conversation', () => {
  const { lead: updated, events } = run({ call_outcome: 'voicemail' });
  assert.equal(updated.category, 'unreachable');
  assert.equal(updated.status, 'retry_scheduled');
  assert.equal(updated.last_connected_at, null);
  assert.equal(events[0].data.next_action, 'retry');
});

test('not interested closes the lead with no follow-up events', () => {
  const { lead: updated, events } = run({ explicit_rejection: true, call_outcome: 'not_interested' });
  assert.equal(updated.status, 'closed');
  assert.deepEqual(types(events), ['call.completed']);
});

test('invalid number on initiation failure stops retries; busy retries', () => {
  assert.equal(applyInitiationFailure({ lead, campaign, conversationId: 'c', failureReason: 'invalid number', now: NOW }).lead.status, 'invalid_number');
  assert.equal(applyInitiationFailure({ lead, campaign, conversationId: 'c', failureReason: 'busy', now: NOW }).lead.status, 'retry_scheduled');
});
