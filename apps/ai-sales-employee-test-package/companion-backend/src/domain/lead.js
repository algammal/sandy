// Lead data model. ElevenLabs-agnostic: this is the record a CRM or sheet adapter would sync.
// B2B model: a lead is a contact at a real estate COMPANY that may buy our AI Sales Employee.

export const LEAD_CATEGORIES = [
  'hot',
  'warm',
  'cold',
  'unknown',
  'not_interested',
  'do_not_call',
  'unreachable',
  'human_follow_up_required',
];

// Next steps a prospect can agree to (mirrors sales-playbook.json next_steps.permitted).
export const NEXT_STEPS = [
  'demo_requested',
  'meeting_requested',
  'human_callback_requested',
  'proposal_requested',
  'information_requested',
  'ai_callback_later',
  'none',
];

export const NEXT_ACTIONS = [...NEXT_STEPS, 'nurture', 'suppress', 'retry'];

// Legal bases under which a business contact may be called. Anything else blocks the call.
// legitimate_business_interest must be confirmed by legal for each market before use.
export const CONSENT_BASES = ['explicit_consent', 'existing_enquiry', 'legitimate_business_interest'];

const E164 = /^\+[1-9]\d{7,14}$/;

export class ValidationError extends Error {
  constructor(errors) {
    super(`Validation failed: ${errors.join('; ')}`);
    this.errors = errors;
  }
}

export function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[\s\-().]/g, '');
  return E164.test(cleaned) ? cleaned : null;
}

export function maskPhone(phone) {
  return typeof phone === 'string' && phone.length > 4 ? `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}` : '****';
}

function cleanString(value, max = 200) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Validates and normalises an inbound lead (from import or a future CRM sync).
export function parseLeadInput(input) {
  const errors = [];
  if (!input || typeof input !== 'object') throw new ValidationError(['body must be an object']);

  const id = cleanString(input.id, 64);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) errors.push('id must be 1-64 chars of letters, digits, _ or -');

  const phone = normalizePhone(input.phone);
  if (!phone) errors.push('phone must be a valid E.164 number, e.g. +15551234567');

  const name = cleanString(input.name, 100);
  if (!name) errors.push('name (contact name) is required');
  const companyName = cleanString(input.company_name, 120);
  if (!companyName) errors.push('company_name is required');

  const timezone = cleanString(input.timezone, 64);
  if (!timezone || !isValidTimeZone(timezone)) errors.push('timezone must be a valid IANA zone, e.g. Africa/Cairo');

  const consent = input.consent ?? {};
  const consentBasis = cleanString(consent.basis, 40);
  if (!CONSENT_BASES.includes(consentBasis)) errors.push(`consent.basis must be one of ${CONSENT_BASES.join(', ')}`);
  const consentDate = cleanString(consent.recorded_at, 40);
  if (Number.isNaN(Date.parse(consentDate))) errors.push('consent.recorded_at must be an ISO date');

  if (errors.length) throw new ValidationError(errors);

  return {
    id,
    name,
    company_name: companyName,
    contact_role: cleanString(input.contact_role, 80),
    phone,
    timezone,
    preferred_language: cleanString(input.preferred_language, 10) || 'en',
    contact_reason: cleanString(input.contact_reason, 200),
    consent: {
      basis: consentBasis,
      recorded_at: new Date(consentDate).toISOString(),
      source: cleanString(consent.source, 100),
    },
  };
}

export function newLeadRecord(parsed, now = new Date()) {
  return {
    ...parsed,
    status: 'new',
    category: null,
    do_not_call: false,
    attempts: 0,
    last_attempt_at: null,
    last_connected_at: null,
    next_attempt_after: null,
    callback_requested_at: null,
    qualification: {},
    last_outcome: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}
