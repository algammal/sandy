// Procedure 1: pre-call validation. Pure function: given state, decide whether a call is allowed.

import { CONSENT_BASES, normalizePhone } from './lead.js';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

// Returns { hour, minute, weekday } for `now` in the lead's own time zone.
// weekday: 0 = Sunday ... 6 = Saturday.
export function localTimeParts(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { hour: Number(get('hour')), minute: Number(get('minute')), weekday };
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function isWithinCallingHours(now, timeZone, hours) {
  const { hour, minute, weekday } = localTimeParts(now, timeZone);
  if (!hours.days.includes(weekday)) return false;
  const current = hour * 60 + minute;
  return current >= toMinutes(hours.start) && current < toMinutes(hours.end);
}

/**
 * @returns {{ eligible: boolean, reasons: string[] }}
 * Every failing rule is reported so operators can fix data in one pass.
 */
export function checkEligibility({ lead, campaign, suppressed, activeCall, callMode, testAllowlist, now = new Date() }) {
  const reasons = [];

  if (!lead) return { eligible: false, reasons: ['lead_not_found'] };
  if (!campaign) return { eligible: false, reasons: ['campaign_not_found'] };

  if (callMode === 'disabled') reasons.push('calling_disabled');
  if (!normalizePhone(lead.phone)) reasons.push('invalid_phone');
  if (lead.do_not_call || suppressed) reasons.push('do_not_call');
  if (!CONSENT_BASES.includes(lead.consent?.basis)) reasons.push('no_legal_basis_for_contact');

  if (campaign.status !== 'active') reasons.push('campaign_not_active');
  if (callMode === 'live' && !campaign.compliance_approved) reasons.push('campaign_not_compliance_approved');
  if (callMode === 'test' && !testAllowlist.includes(lead.phone)) reasons.push('number_not_in_test_allowlist');

  if (!isWithinCallingHours(now, lead.timezone, campaign.calling_hours)) reasons.push('outside_calling_hours');

  if (activeCall) reasons.push('call_already_in_progress');

  const policy = campaign.retry_policy;
  if (lead.attempts >= policy.max_attempts) reasons.push('max_attempts_reached');
  if (lead.last_attempt_at && now - new Date(lead.last_attempt_at) < policy.min_hours_between_attempts * HOUR) {
    reasons.push('retry_too_soon');
  }
  if (lead.next_attempt_after && now < new Date(lead.next_attempt_after)) reasons.push('scheduled_for_later');

  // A real conversation recently happened: don't call again unless the customer asked for a callback.
  const recentlyConnected =
    lead.last_connected_at && now - new Date(lead.last_connected_at) < policy.cooldown_days_after_conversation * DAY;
  if (recentlyConnected && !lead.callback_requested_at) reasons.push('recently_contacted');

  if (['not_interested', 'do_not_call'].includes(lead.category)) reasons.push(`lead_${lead.category}`);

  return { eligible: reasons.length === 0, reasons };
}
