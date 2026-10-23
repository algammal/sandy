import { ValidationError } from './lead.js';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Campaign = which properties to introduce, when calls are allowed, and retry limits.
export function parseCampaign(input) {
  const errors = [];
  const c = input ?? {};
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(c.id ?? '')) errors.push('id is required (letters, digits, _ or -)');
  if (!c.name) errors.push('name is required');
  if (!['draft', 'active', 'paused', 'ended'].includes(c.status)) errors.push('status must be draft|active|paused|ended');
  if (!c.campaign_focus) errors.push('campaign_focus is required (what the agent introduces first)');

  const hours = c.calling_hours ?? {};
  if (!Array.isArray(hours.days) || !hours.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
    errors.push('calling_hours.days must be weekday numbers 0 (Sun) to 6 (Sat)');
  }
  if (!HHMM.test(hours.start ?? '') || !HHMM.test(hours.end ?? '') || hours.start >= hours.end) {
    errors.push('calling_hours.start/end must be HH:MM with start < end');
  }

  const rp = c.retry_policy ?? {};
  if (!(Number.isInteger(rp.max_attempts) && rp.max_attempts >= 1 && rp.max_attempts <= 5)) {
    errors.push('retry_policy.max_attempts must be 1-5');
  }
  if (!(rp.min_hours_between_attempts >= 1)) errors.push('retry_policy.min_hours_between_attempts must be >= 1');
  if (!(rp.cooldown_days_after_conversation >= 1)) errors.push('retry_policy.cooldown_days_after_conversation must be >= 1');

  if (errors.length) throw new ValidationError(errors);
  return {
    id: c.id,
    name: String(c.name).slice(0, 120),
    status: c.status,
    campaign_focus: String(c.campaign_focus).slice(0, 300),
    compliance_approved: c.compliance_approved === true,
    calling_hours: { days: hours.days, start: hours.start, end: hours.end },
    retry_policy: {
      max_attempts: rp.max_attempts,
      min_hours_between_attempts: rp.min_hours_between_attempts,
      cooldown_days_after_conversation: rp.cooldown_days_after_conversation,
    },
  };
}
