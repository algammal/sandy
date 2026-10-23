// Turns a finished conversation (ElevenLabs post-call analysis + workflow trace) into lead
// state changes and domain events. No I/O here.
//
// The LLM only proposes candidate facts. Here they are type-checked, the final category is
// computed by the deterministic ruleset, and the call's actual state path is validated
// against the transition map.

import { NEXT_STEPS } from './lead.js';
import { deriveSignals, qualify } from './qualification.js';
import { validatePath } from './state-machine.js';
import { EVENT_TYPES, buildEvent } from '../events/catalog.js';

export const CALL_OUTCOMES = [
  'qualified',
  'follow_up_requested',
  'demo_requested',
  'information_requested',
  'not_interested',
  'do_not_call',
  'unanswered',
  'voicemail',
  'failed',
  'disconnected',
  'human_follow_up_required',
];

const CHANNELS = ['phone', 'email', 'whatsapp', 'unspecified'];
const BOOLEAN_FIELDS = [
  'do_not_call_requested',
  'explicit_rejection',
  'interest_expressed',
  'relevant_need_identified',
  'needs_internal_approval',
  'no_need_identified',
  'low_interest',
  'human_requested',
  'consent_to_follow_up',
  'ai_disclosure_given',
];
const TEXT_FIELDS = ['company_name', 'contact_name', 'contact_role', 'preferred_language', 'current_lead_process', 'primary_challenge', 'current_crm', 'unanswered_questions'];
const INT_FIELDS = ['sales_team_size', 'lead_volume'];
const FOLLOW_UP_STEPS = ['demo_requested', 'meeting_requested', 'human_callback_requested', 'proposal_requested', 'information_requested', 'ai_callback_later'];
const RETRYABLE = ['unanswered', 'voicemail', 'failed', 'disconnected'];

const clean = (v, max = 300) => String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

/**
 * Type-checks the extracted values. Anything invalid is dropped (unknown), never coerced
 * into a "no". Returns { data, issues }.
 */
export function validateExtraction(results, playbook) {
  const data = {};
  const issues = [];
  const v = (k) => results[k];

  for (const k of BOOLEAN_FIELDS) {
    if (v(k) === true || v(k) === false) data[k] = v(k);
    else if (v(k) !== undefined && v(k) !== null && v(k) !== '') issues.push(`${k}: not a boolean`);
  }
  for (const k of TEXT_FIELDS) {
    if (typeof v(k) === 'string' && v(k).trim() && v(k).trim().toLowerCase() !== 'unknown') data[k] = clean(v(k));
  }
  for (const k of INT_FIELDS) {
    const n = Number(v(k));
    if (v(k) !== null && v(k) !== undefined && v(k) !== '' && Number.isInteger(n) && n >= 0 && n < 1e7) data[k] = n;
  }
  if (CALL_OUTCOMES.includes(v('call_outcome'))) data.call_outcome = v('call_outcome');
  else if (v('call_outcome')) issues.push('call_outcome: unknown value');

  if (NEXT_STEPS.includes(v('preferred_next_step'))) data.preferred_next_step = v('preferred_next_step');
  data.follow_up_channel = CHANNELS.includes(v('follow_up_channel')) ? v('follow_up_channel') : 'unspecified';
  if (typeof v('preferred_callback_time') === 'string' && v('preferred_callback_time').trim()) {
    data.preferred_callback_time = clean(v('preferred_callback_time'), 120);
  }
  const known = new Set(playbook.objections.map((o) => o.id));
  data.objections = String(v('objections') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => known.has(s));

  // Contradiction: an explicit "no" together with an agreed concrete next step.
  if (data.explicit_rejection === true && FOLLOW_UP_STEPS.includes(data.preferred_next_step) && data.preferred_next_step !== 'ai_callback_later') {
    issues.push('contradiction: explicit rejection and an agreed next step');
    data.contradictory = true;
  }
  // Consent is never inferred: a follow-up step without explicit consent is flagged for review.
  if (FOLLOW_UP_STEPS.includes(data.preferred_next_step) && data.consent_to_follow_up !== true) {
    issues.push('follow-up step without explicit consent to be contacted');
  }
  return { data, issues };
}

function nextActionFor(category, data) {
  if (category === 'do_not_call') return 'suppress';
  if (category === 'not_interested') return 'none';
  if (category === 'unreachable') return RETRYABLE.includes(data.call_outcome) ? 'retry' : 'none';
  if (data.preferred_next_step && data.preferred_next_step !== 'none') return data.preferred_next_step;
  return ['hot', 'warm'].includes(category) ? 'nurture' : 'none';
}

/**
 * @returns {{ lead, events, qualification, flow, issues }}
 */
export function applyOutcome({ lead, results, conversation, campaign, playbook, path, now = new Date() }) {
  const nowIso = now.toISOString();
  const { data, issues } = validateExtraction(results, playbook);
  let qualification = qualify(deriveSignals(data), playbook.qualification);
  if (data.contradictory && qualification.category !== 'do_not_call') {
    qualification = { category: 'human_follow_up_required', reasons: ['contradictory answers; needs human review'] };
  }
  const category = qualification.category;
  // No workflow trace (e.g. older agent version) means the path is unknown, not valid.
  const flow = path ? { path, ...validatePath(path) } : { path: [], valid: null, violations: [] };
  const nextAction = nextActionFor(category, data);

  const openFollowUps = { ...(lead.open_follow_ups ?? {}) };
  const duplicateFollowUp = FOLLOW_UP_STEPS.includes(nextAction) && Boolean(openFollowUps[nextAction]);
  if (FOLLOW_UP_STEPS.includes(nextAction) && !duplicateFollowUp) {
    openFollowUps[nextAction] = { conversation_id: conversation.id, requested_at: nowIso };
  }

  const qualificationData = {};
  for (const k of [...TEXT_FIELDS, ...INT_FIELDS, 'preferred_next_step', 'preferred_callback_time', 'follow_up_channel', 'objections', 'interest_expressed', 'relevant_need_identified']) {
    if (data[k] !== undefined) qualificationData[k] = data[k];
  }

  const unreachable = category === 'unreachable';
  const updated = {
    ...lead,
    category,
    qualification: { ...lead.qualification, ...qualificationData },
    open_follow_ups: openFollowUps,
    needs_review: flow.valid === false || issues.length > 0,
    last_outcome: {
      conversation_id: conversation.id,
      call_outcome: data.call_outcome ?? null,
      next_action: nextAction,
      summary: conversation.summary,
      state_path: flow.path,
      flow_valid: flow.valid,
      issues,
      ended_at: nowIso,
    },
    updated_at: nowIso,
  };
  if (unreachable) {
    updated.status = updated.attempts >= campaign.retry_policy.max_attempts ? 'exhausted' : 'retry_scheduled';
  } else {
    updated.last_connected_at = nowIso;
    updated.status = 'contacted';
  }
  updated.callback_requested_at = nextAction === 'ai_callback_later' ? nowIso : null;
  if (category === 'do_not_call') {
    updated.do_not_call = true;
    updated.status = 'suppressed';
    updated.open_follow_ups = {};
  } else if (category === 'not_interested') {
    updated.status = 'closed';
  }

  const base = { leadId: lead.id, conversationId: conversation.id, occurredAt: nowIso };
  const events = [
    buildEvent(EVENT_TYPES.CALL_COMPLETED, {
      ...base,
      data: {
        call_outcome: data.call_outcome ?? null,
        lead_category: category,
        qualification_reasons: qualification.reasons,
        next_action: nextAction,
        summary: conversation.summary,
        duration_secs: conversation.durationSecs,
        campaign_id: campaign.id,
        state_path: flow.path,
        flow_valid: flow.valid,
        flow_violations: flow.violations,
        duplicate_follow_up: duplicateFollowUp,
        issues,
      },
    }),
  ];

  if (category === 'do_not_call') {
    // Suppression is the only other event: nothing may follow up.
    events.push(buildEvent(EVENT_TYPES.LEAD_DO_NOT_CALL, { ...base, data: { requested_at: nowIso } }));
    return { lead: updated, events, qualification, flow, issues };
  }

  if (['hot', 'warm'].includes(category)) {
    events.push(buildEvent(EVENT_TYPES.LEAD_QUALIFIED, { ...base, data: { lead_category: category, qualification: updated.qualification, reasons: qualification.reasons } }));
  }

  if (!duplicateFollowUp) {
    if (['demo_requested', 'meeting_requested'].includes(nextAction)) {
      events.push(
        buildEvent(EVENT_TYPES.DEMO_REQUESTED, {
          ...base,
          data: {
            meeting_type: nextAction === 'demo_requested' ? 'demo' : 'meeting',
            preferred_time: data.preferred_callback_time ?? '',
            follow_up_channel: data.follow_up_channel,
            confirmed: false,
            booking_integration: playbook.next_steps.booking_integration_available === true,
          },
        }),
      );
    }
    if (nextAction === 'information_requested') {
      events.push(buildEvent(EVENT_TYPES.INFORMATION_REQUESTED, { ...base, data: { follow_up_channel: data.follow_up_channel } }));
    }
    if (FOLLOW_UP_STEPS.includes(nextAction) || category === 'human_follow_up_required') {
      events.push(
        buildEvent(EVENT_TYPES.LEAD_FOLLOW_UP_REQUESTED, {
          ...base,
          data: {
            next_action: nextAction,
            follow_up_channel: data.follow_up_channel,
            callback_time: data.preferred_callback_time ?? '',
            reason: category === 'human_follow_up_required' ? qualification.reasons.join('; ') : '',
          },
        }),
      );
    }
  }

  return { lead: updated, events, qualification, flow, issues };
}

// A failed call initiation (busy, no answer, invalid number) never reached the agent.
export function applyInitiationFailure({ lead, campaign, conversationId, failureReason, now = new Date() }) {
  const nowIso = now.toISOString();
  const invalidNumber = /invalid|not.?a.?valid|unallocated/i.test(failureReason ?? '');
  const exhausted = invalidNumber || lead.attempts >= campaign.retry_policy.max_attempts;
  const path = ['PRE_CALL_CHECK', 'CALL_INITIATED', 'CALL_SUMMARY', 'CALL_COMPLETED'];
  const updated = {
    ...lead,
    category: 'unreachable',
    status: invalidNumber ? 'invalid_number' : exhausted ? 'exhausted' : 'retry_scheduled',
    last_outcome: { conversation_id: conversationId, call_outcome: 'failed', failure_reason: failureReason, state_path: path, flow_valid: true, ended_at: nowIso },
    updated_at: nowIso,
  };
  const event = buildEvent(EVENT_TYPES.CALL_COMPLETED, {
    leadId: lead.id,
    conversationId,
    occurredAt: nowIso,
    data: {
      call_outcome: 'failed',
      lead_category: 'unreachable',
      qualification_reasons: ['call could not be connected'],
      next_action: exhausted ? 'none' : 'retry',
      summary: `Call could not be connected: ${failureReason ?? 'unknown reason'}`,
      campaign_id: campaign.id,
      state_path: path,
      flow_valid: true,
      flow_violations: [],
      duplicate_follow_up: false,
      issues: [],
    },
  });
  return { lead: updated, events: [event] };
}
