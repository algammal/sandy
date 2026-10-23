import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCampaign } from '../src/domain/campaign.js';
import { checkEligibility, isWithinCallingHours } from '../src/domain/eligibility.js';
import { ValidationError, newLeadRecord, parseLeadInput } from '../src/domain/lead.js';
import { NOW, TEST_PHONE, campaignInput, leadInput } from './helpers.js';

const campaign = parseCampaign(campaignInput);
const baseLead = () => newLeadRecord(parseLeadInput(leadInput), NOW);
const check = (overrides = {}) =>
  checkEligibility({
    lead: baseLead(),
    campaign,
    suppressed: false,
    activeCall: null,
    callMode: 'test',
    testAllowlist: [TEST_PHONE],
    now: NOW,
    ...overrides,
  });

test('valid lead in test mode is eligible', () => {
  assert.deepEqual(check(), { eligible: true, reasons: [] });
});

test('calling disabled blocks every call', () => {
  assert.ok(check({ callMode: 'disabled' }).reasons.includes('calling_disabled'));
});

test('do-not-call flag or suppression list blocks the call', () => {
  assert.ok(check({ lead: { ...baseLead(), do_not_call: true } }).reasons.includes('do_not_call'));
  assert.ok(check({ suppressed: true }).reasons.includes('do_not_call'));
});

test('missing legal basis blocks the call', () => {
  const lead = { ...baseLead(), consent: { basis: 'purchased_list' } };
  assert.ok(check({ lead }).reasons.includes('no_legal_basis_for_contact'));
});

test('test mode only allows allow-listed numbers', () => {
  const lead = { ...baseLead(), phone: '+15559999999' };
  assert.ok(check({ lead }).reasons.includes('number_not_in_test_allowlist'));
});

test('live mode requires a compliance-approved campaign', () => {
  assert.ok(check({ callMode: 'live' }).reasons.includes('campaign_not_compliance_approved'));
  assert.equal(check({ callMode: 'live', campaign: { ...campaign, compliance_approved: true } }).eligible, true);
});

test('calling hours are evaluated in the lead time zone', () => {
  const hours = campaign.calling_hours;
  assert.equal(isWithinCallingHours(NOW, 'UTC', hours), true); // Mon 12:00
  assert.equal(isWithinCallingHours(NOW, 'Asia/Tokyo', hours), false); // Mon 21:00
  assert.equal(isWithinCallingHours(new Date('2026-10-18T12:00:00Z'), 'UTC', hours), false); // Sunday
  assert.ok(check({ lead: { ...baseLead(), timezone: 'Asia/Tokyo' } }).reasons.includes('outside_calling_hours'));
});

test('retry limits and spacing are enforced', () => {
  assert.ok(check({ lead: { ...baseLead(), attempts: 3 } }).reasons.includes('max_attempts_reached'));
  const recent = new Date(NOW.getTime() - 3600 * 1000).toISOString();
  assert.ok(check({ lead: { ...baseLead(), attempts: 1, last_attempt_at: recent } }).reasons.includes('retry_too_soon'));
});

test('duplicate calls are prevented', () => {
  assert.ok(check({ activeCall: { status: 'in_progress' } }).reasons.includes('call_already_in_progress'));
});

test('recent conversation blocks a re-call unless a callback was requested', () => {
  const yesterday = new Date(NOW.getTime() - 86400 * 1000).toISOString();
  assert.ok(check({ lead: { ...baseLead(), last_connected_at: yesterday } }).reasons.includes('recently_contacted'));
  assert.equal(check({ lead: { ...baseLead(), last_connected_at: yesterday, callback_requested_at: yesterday } }).eligible, true);
});

test('missing lead or campaign is reported', () => {
  assert.deepEqual(check({ lead: null }), { eligible: false, reasons: ['lead_not_found'] });
  assert.deepEqual(check({ campaign: null }), { eligible: false, reasons: ['campaign_not_found'] });
});

test('invalid lead input is rejected with every error', () => {
  assert.throws(
    () => parseLeadInput({ id: 'x', name: '', phone: '0123', timezone: 'Mars/Base', consent: {} }),
    (err) => err instanceof ValidationError && err.errors.length === 6,
  );
});

test('phone numbers are normalised to E.164', () => {
  assert.equal(parseLeadInput({ ...leadInput, phone: '+1 (555) 000-0001' }).phone, TEST_PHONE);
});
