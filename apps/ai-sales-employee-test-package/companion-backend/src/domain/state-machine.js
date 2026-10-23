// Deterministic conversation controller for the AI Sales Employee B2B call.
//
// The LLM decides HOW to say things; this module decides WHAT may happen next.
// It is used in three places:
//   1. Live, through the sales-flow tool endpoint (src/elevenlabs/flow-tool.js): every
//      stage-changing prospect reply is classified into an event, applied here, and the
//      resulting node is handed back to ElevenLabs (controller mode).
//   2. To generate the ElevenLabs workflow graph (src/elevenlabs/workflow.js), so the
//      live call can only move along edges defined here.
//   3. To validate every finished call's actual path (from the post-call webhook) and
//      to drive scripted conversation tests.

export const STATES = [
  'PRE_CALL_CHECK',
  'CALL_INITIATED',
  'IDENTITY_DISCLOSURE',
  'PERMISSION_CHECK',
  'DISCOVERY',
  'SOLUTION_PRESENTATION',
  'OBJECTION_HANDLING',
  'LEAD_QUALIFICATION',
  'NEXT_STEP_SELECTION',
  'FOLLOW_UP_CAPTURE',
  'CALL_SUMMARY',
  'CALL_COMPLETED',
  'DO_NOT_CALL',
];

export const TERMINAL_STATES = ['CALL_COMPLETED', 'DO_NOT_CALL'];

// States in which the prospect is on the line. A do-not-call request is accepted from
// any of them, and a disconnection from any of them goes straight to CALL_SUMMARY.
export const LIVE_STATES = [
  'IDENTITY_DISCLOSURE',
  'PERMISSION_CHECK',
  'DISCOVERY',
  'SOLUTION_PRESENTATION',
  'OBJECTION_HANDLING',
  'LEAD_QUALIFICATION',
  'NEXT_STEP_SELECTION',
  'FOLLOW_UP_CAPTURE',
];

// Explicit transition map: event type -> target, per state.
// 'RETURN' means "go back to the state recorded in ctx.returnState" (interruption rule).
// `unresolved_intent` is the documented fallback when the prospect's intent cannot be
// resolved within the clarification / time-in-state limits.
export const TRANSITIONS = {
  PRE_CALL_CHECK: { eligibility_passed: 'CALL_INITIATED', eligibility_failed: 'CALL_COMPLETED' },
  CALL_INITIATED: {
    call_connected: 'IDENTITY_DISCLOSURE',
    call_unanswered: 'CALL_SUMMARY',
    voicemail_detected: 'CALL_SUMMARY',
    call_failed: 'CALL_SUMMARY',
  },
  IDENTITY_DISCLOSURE: { disclosure_done: 'PERMISSION_CHECK' },
  PERMISSION_CHECK: {
    permission_granted: 'DISCOVERY',
    callback_requested: 'FOLLOW_UP_CAPTURE',
    permission_declined: 'CALL_SUMMARY',
    human_requested: 'FOLLOW_UP_CAPTURE',
    unresolved_intent: 'CALL_SUMMARY',
  },
  DISCOVERY: {
    discovery_answer: 'DISCOVERY', // self-loop; leaves automatically when complete (see applyEvent)
    discovery_complete: 'SOLUTION_PRESENTATION',
    question_asked: 'OBJECTION_HANDLING', // interruption, returns to DISCOVERY
    objection_raised: 'OBJECTION_HANDLING',
    discovery_declined: 'NEXT_STEP_SELECTION',
    human_requested: 'FOLLOW_UP_CAPTURE',
    prospect_declined: 'CALL_SUMMARY',
    unresolved_intent: 'NEXT_STEP_SELECTION',
  },
  SOLUTION_PRESENTATION: {
    presentation_done: 'LEAD_QUALIFICATION',
    question_asked: 'OBJECTION_HANDLING',
    objection_raised: 'OBJECTION_HANDLING',
    human_requested: 'FOLLOW_UP_CAPTURE',
    prospect_declined: 'LEAD_QUALIFICATION',
    unresolved_intent: 'NEXT_STEP_SELECTION',
  },
  OBJECTION_HANDLING: {
    objection_resolved: 'RETURN', // or the registry's return_state (see resolveObjectionBlock)
    question_asked: 'OBJECTION_HANDLING', // another question in the same block
    objection_raised: 'OBJECTION_HANDLING', // another concern in the same block
    escalation_needed: 'NEXT_STEP_SELECTION',
    human_requested: 'FOLLOW_UP_CAPTURE',
    prospect_declined: 'LEAD_QUALIFICATION',
    unresolved_intent: 'NEXT_STEP_SELECTION',
  },
  LEAD_QUALIFICATION: { qualification_recorded: 'NEXT_STEP_SELECTION', declined_recorded: 'CALL_SUMMARY' },
  NEXT_STEP_SELECTION: {
    next_step_agreed: 'FOLLOW_UP_CAPTURE',
    no_next_step: 'CALL_SUMMARY',
    question_asked: 'OBJECTION_HANDLING',
    objection_raised: 'OBJECTION_HANDLING',
    human_requested: 'FOLLOW_UP_CAPTURE',
    unresolved_intent: 'CALL_SUMMARY',
  },
  FOLLOW_UP_CAPTURE: {
    follow_up_captured: 'CALL_SUMMARY',
    follow_up_declined: 'CALL_SUMMARY',
    unresolved_intent: 'CALL_SUMMARY',
  },
  // Saving is retried in place up to limits.max_tool_retries, then completes with a
  // recorded failure (never reported as saved).
  CALL_SUMMARY: { outcome_saved: 'CALL_COMPLETED', outcome_save_failed: 'CALL_SUMMARY' },
  CALL_COMPLETED: {},
  DO_NOT_CALL: {},
};

// Global events, accepted from any live state. 'SELF' keeps the current state.
const GLOBAL_EVENTS = {
  dnc_requested: { from: LIVE_STATES, to: 'DO_NOT_CALL' },
  disconnected: { from: LIVE_STATES, to: 'CALL_SUMMARY' },
  clarification_needed: { from: LIVE_STATES, to: 'SELF' },
};

// Per-state specification (section C). `next` is derived from TRANSITIONS, so the spec
// can't drift from the enforced map. Rendered into docs/state-spec.md.
export const STATE_SPECS = {
  PRE_CALL_CHECK: {
    entry: 'An authorised operator requests one call for one lead (POST /api/calls, confirm=true).',
    objective: 'Validate lead eligibility, consent/contact status and campaign rules.',
    requiredInputs: ['lead', 'campaign', 'consent basis', 'suppression status', 'call mode'],
    allowedIntents: [],
    requiredActions: ['checkEligibility(): DNC list, consent basis, test allow-list, compliance approval, calling hours in lead time zone, attempts, spacing, cooldown, no active call'],
    success: 'All checks pass -> CALL_INITIATED.',
    alternatives: 'Any check fails -> CALL_COMPLETED (HTTP 422 with every reason; no call placed).',
    errorHandling: 'Missing lead/campaign is reported as a reason; nothing is dialled.',
    runsIn: 'backend',
  },
  CALL_INITIATED: {
    entry: 'Eligibility passed; the attempt is counted before dialling.',
    objective: 'Place one authorised outbound call.',
    requiredInputs: ['phone number id', 'dynamic variables'],
    allowedIntents: [],
    requiredActions: ['ElevenLabs outbound-call API (never auto-retried)'],
    success: 'Connected -> IDENTITY_DISCLOSURE.',
    alternatives: 'Unanswered, voicemail or failure -> CALL_SUMMARY (technical branch, no sales conversation).',
    errorHandling: 'API error -> lead retry_scheduled, HTTP 502; initiation-failure webhook -> unreachable / invalid_number.',
    runsIn: 'backend + ElevenLabs telephony',
  },
  IDENTITY_DISCLOSURE: {
    entry: 'Call connected.',
    objective: 'Identify as an AI sales assistant and the company it represents.',
    requiredInputs: ['agent_name', 'company_name'],
    allowedIntents: ['fixed first message only'],
    requiredActions: ['Speak the fixed, non-interruptible first message'],
    success: 'Disclosure spoken -> PERMISSION_CHECK.',
    alternatives: 'Do-not-call or disconnection (global).',
    errorHandling: 'Not model-generated, so it cannot be skipped.',
    runsIn: 'ElevenLabs first message',
  },
  PERMISSION_CHECK: {
    entry: 'Disclosure done.',
    objective: 'Ask whether it is a convenient time to talk.',
    requiredInputs: ['prospect answer'],
    allowedIntents: ['explain who is calling and why in one sentence', 'confirm being an AI', 'ask for a better time'],
    requiredActions: ['Wait for the prospect before speaking'],
    success: 'Prospect agrees -> DISCOVERY.',
    alternatives: 'Busy/callback -> FOLLOW_UP_CAPTURE; asks for a person -> FOLLOW_UP_CAPTURE; declines -> CALL_SUMMARY; unresolved -> CALL_SUMMARY.',
    errorHandling: 'Unclear answer -> one targeted clarification, max limits.max_clarification_attempts.',
    runsIn: 'node permission',
  },
  DISCOVERY: {
    entry: 'Permission granted.',
    objective: "Understand the company's lead handling and main sales challenge.",
    requiredInputs: ['current_lead_process', 'primary_challenge'],
    allowedIntents: ['one discovery question per turn', 'acknowledge answers', 'short answer to a relevant question, then return'],
    requiredActions: ['Record answers; never store a non-answer as a value'],
    success: 'Both required fields known, or limits.max_discovery_questions reached -> SOLUTION_PRESENTATION.',
    alternatives: 'Early-presentation rule (prospect asks what the product is) -> SOLUTION_PRESENTATION; question/objection -> OBJECTION_HANDLING and back; refuses questions -> NEXT_STEP_SELECTION; person -> FOLLOW_UP_CAPTURE; declines -> CALL_SUMMARY.',
    errorHandling: 'discovery_complete without the required fields or the early-presentation flag is rejected.',
    runsIn: 'node discovery',
  },
  SOLUTION_PRESENTATION: {
    entry: 'Discovery complete or early-presentation rule.',
    objective: "Explain the AI Sales Employee in terms of the prospect's stated needs.",
    requiredInputs: ['primary_challenge (when known)'],
    allowedIntents: ['connect at most two current capabilities to the stated challenge', 'check relevance with one question'],
    requiredActions: ['Planned features must be labelled planned'],
    success: 'Prospect can assess interest -> LEAD_QUALIFICATION -> NEXT_STEP_SELECTION.',
    alternatives: 'Question/objection -> OBJECTION_HANDLING; person -> FOLLOW_UP_CAPTURE; declines -> LEAD_QUALIFICATION -> CALL_SUMMARY.',
    errorHandling: 'Unresolved intent -> NEXT_STEP_SELECTION (offer a human follow-up).',
    runsIn: 'node presentation',
  },
  OBJECTION_HANDLING: {
    entry: 'A question or concern is raised in DISCOVERY, SOLUTION_PRESENTATION or NEXT_STEP_SELECTION.',
    objective: 'Answer with the approved registry strategy, then return.',
    requiredInputs: ['objection id(s) from the registry'],
    allowedIntents: ['registry strategy', 'required disclosure', 'registry follow-up question'],
    requiredActions: ['Highest-priority concern first; one concern at a time'],
    success: "Resolved -> registry return_state: 'previous' returns to the interrupted state; NEXT_STEP_SELECTION or FOLLOW_UP_CAPTURE otherwise.",
    alternatives: "escalate_when 'always' or an escalation flag -> NEXT_STEP_SELECTION; same concern beyond the limit -> NEXT_STEP_SELECTION; person -> FOLLOW_UP_CAPTURE; declines -> LEAD_QUALIFICATION.",
    errorHandling: 'Answer not in the KB -> say so and offer the sales team (escalation).',
    runsIn: 'node objection (KB doc 05 attached)',
  },
  LEAD_QUALIFICATION: {
    entry: 'Presentation done, or the prospect declined after hearing it.',
    objective: 'Classify the prospect with the deterministic ruleset.',
    requiredInputs: ['validated extraction fields'],
    allowedIntents: [],
    requiredActions: ['qualify() on validated data after the call; the agent never announces a category'],
    success: 'Recorded -> NEXT_STEP_SELECTION.',
    alternatives: 'Declined -> CALL_SUMMARY.',
    errorHandling: 'Insufficient evidence -> category unknown (never guessed).',
    runsIn: 'backend (no in-call node; passed through automatically)',
  },
  NEXT_STEP_SELECTION: {
    entry: 'Qualification passed, discovery refused, escalation, or fallback.',
    objective: 'Offer one permitted next step and let the prospect choose.',
    requiredInputs: ['prospect choice'],
    allowedIntents: ['offer one step', 'offer one alternative if declined'],
    requiredActions: ['Only playbook next_steps.permitted are accepted; nothing is booked'],
    success: 'Eligible step agreed -> FOLLOW_UP_CAPTURE.',
    alternatives: 'No step -> CALL_SUMMARY; question/objection -> OBJECTION_HANDLING; person -> FOLLOW_UP_CAPTURE.',
    errorHandling: 'A step outside the permitted list is rejected.',
    runsIn: 'node next_step',
  },
  FOLLOW_UP_CAPTURE: {
    entry: 'Next step agreed, callback requested, or a person requested.',
    objective: 'Capture time window and contact channel for the agreed follow-up.',
    requiredInputs: ['preferred_callback_time', 'follow_up_channel'],
    allowedIntents: ['one question at a time', 'repeat details back'],
    requiredActions: ["Say the team will contact them to confirm; booking_integration_available=false is recorded on demo.requested"],
    success: 'Details captured -> CALL_SUMMARY.',
    alternatives: 'Declines to give details -> CALL_SUMMARY.',
    errorHandling: 'Never say booked/confirmed/sent.',
    runsIn: 'node follow_up',
  },
  CALL_SUMMARY: {
    entry: 'Sales flow ended, declined, disconnected, or a technical branch.',
    objective: 'Produce, validate and save the structured outcome.',
    requiredInputs: ['post-call analysis', 'state path'],
    allowedIntents: ['one-sentence recap and goodbye'],
    requiredActions: ['validateExtraction(), qualify(), validatePath(), save lead/call/events idempotently'],
    success: 'Saved -> CALL_COMPLETED.',
    alternatives: 'Save failure -> retry in place up to limits.max_tool_retries, then CALL_COMPLETED with saveFailed recorded.',
    errorHandling: 'Webhook is only marked processed after all writes succeed, so ElevenLabs retries.',
    runsIn: 'node close + backend webhook',
  },
  CALL_COMPLETED: {
    entry: 'Outcome saved, or a documented save failure, or blocked pre-call.',
    objective: 'End politely.',
    requiredInputs: [],
    allowedIntents: [],
    requiredActions: ['end_call'],
    success: 'Terminal.',
    alternatives: 'None.',
    errorHandling: 'No further events accepted.',
    runsIn: 'terminal',
  },
  DO_NOT_CALL: {
    entry: 'The prospect asked not to be contacted again, from any live state.',
    objective: 'Confirm in one sentence, end, and suppress the number.',
    requiredInputs: [],
    allowedIntents: ['one confirmation sentence'],
    requiredActions: ['end_call', 'suppress the number', 'emit only call.completed + lead.do_not_call'],
    success: 'Terminal.',
    alternatives: 'None.',
    errorHandling: 'Suppression is written before anything else, so a failed later write cannot re-enable calling.',
    runsIn: 'node dnc + backend suppression',
  },
};

export function nextStatesOf(state) {
  const targets = new Set(Object.values(TRANSITIONS[state] ?? {}));
  for (const g of Object.values(GLOBAL_EVENTS)) if (g.from.includes(state)) targets.add(g.to === 'SELF' ? state : g.to);
  if (targets.has('RETURN')) {
    targets.delete('RETURN');
    for (const [s, t] of Object.entries(TRANSITIONS)) if (s !== state && Object.values(t).includes(state)) targets.add(s);
  }
  return [...targets];
}

// Intents the agent may report during a live call (controller mode). Everything else
// (eligibility, telephony, qualification, saving) is produced by the backend itself.
export const IN_CALL_INTENTS = [
  'permission_granted',
  'callback_requested',
  'permission_declined',
  'human_requested',
  'discovery_answer',
  'discovery_complete',
  'discovery_declined',
  'question_asked',
  'objection_raised',
  'objection_resolved',
  'escalation_needed',
  'presentation_done',
  'prospect_declined',
  'next_step_agreed',
  'no_next_step',
  'follow_up_captured',
  'follow_up_declined',
  'clarification_needed',
  'dnc_requested',
];

export const DISCOVERY_FIELDS = ['current_lead_process', 'primary_challenge', 'company_name', 'contact_role', 'sales_team_size', 'lead_volume', 'current_crm'];

export class InvalidTransitionError extends Error {
  constructor(from, event, reason = '') {
    super(`Event "${event}" is not allowed in state ${from}${reason ? `: ${reason}` : ''}`);
    this.from = from;
    this.event = event;
    this.reason = reason;
  }
}

const BLOCKED_CONSENT = ['unknown', 'none', 'withdrawn', 'purchased_list'];

export function createContext({ conversationId, playbook, consentStatus = 'unknown' }) {
  const objectionRules = Object.fromEntries(
    playbook.objections.map((o, i) => [o.id, { return_state: o.return_state, escalate_when: o.escalate_when, priority: o.priority ?? i + 1 }]),
  );
  return {
    conversationId,
    currentState: 'PRE_CALL_CHECK',
    stateEntryCount: 1,
    stateTurns: 0,
    entryCounts: { PRE_CALL_CHECK: 1 },
    history: ['PRE_CALL_CHECK'],
    returnState: null,
    data: {},
    consentStatus,
    discoveryQuestions: 0,
    objections: [],
    objectionAttempts: {},
    blockObjections: [],
    pendingObjections: [],
    activeObjection: null,
    blockEscalated: false,
    clarifications: 0,
    saveAttempts: 0,
    preferredNextStep: null,
    callOutcome: null,
    doNotCall: false,
    declined: false,
    humanRequested: false,
    escalated: false,
    saveFailed: false,
    limits: playbook.limits,
    requiredDiscovery: playbook.discovery.required_fields,
    permittedNextSteps: playbook.next_steps.permitted.filter((s) => s !== 'none'),
    objectionRules,
  };
}

export function resolveTarget(state, event) {
  const global = GLOBAL_EVENTS[event];
  if (global && global.from.includes(state)) return global.to === 'SELF' ? state : global.to;
  return TRANSITIONS[state]?.[event] ?? null;
}

export function isAllowedTransition(from, to) {
  if (from === to) return true; // self-loops (e.g. discovery answers) are always valid
  if (TERMINAL_STATES.includes(from)) return false;
  return nextStatesOf(from).includes(to);
}

function discoveryComplete(ctx) {
  const haveRequired = ctx.requiredDiscovery.every((f) => ctx.data[f] !== undefined && ctx.data[f] !== '');
  return haveRequired || ctx.discoveryQuestions >= ctx.limits.max_discovery_questions;
}

export function missingDiscovery(ctx) {
  return ctx.requiredDiscovery.filter((f) => ctx.data[f] === undefined || ctx.data[f] === '');
}

// Most important concern first: lowest priority number wins; unknown ids go last.
export function prioritizeObjections(ids, rules) {
  return [...new Set(ids)].sort((a, b) => (rules[a]?.priority ?? 999) - (rules[b]?.priority ?? 999));
}

// Where a resolved objection block leads, from the registry's return_state values.
// A request for a person or information outranks "offer a next step", which outranks "return".
function resolveObjectionBlock(ctx) {
  const rules = ctx.blockObjections.map((id) => ({ id, ...(ctx.objectionRules[id] ?? { return_state: 'previous', escalate_when: 'never' }) }));
  const followUp = rules.find((r) => r.return_state === 'FOLLOW_UP_CAPTURE');
  if (followUp) return { target: 'FOLLOW_UP_CAPTURE', via: followUp.id };
  const always = rules.find((r) => r.escalate_when === 'always');
  if (always) return { target: 'NEXT_STEP_SELECTION', via: always.id, escalated: true };
  const toNext = rules.find((r) => r.return_state === 'NEXT_STEP_SELECTION');
  if (toNext) return { target: 'NEXT_STEP_SELECTION', via: toNext.id };
  return { target: ctx.returnState ?? 'SOLUTION_PRESENTATION' };
}

function enter(ctx, target) {
  if (ctx.currentState === target) return { ...ctx, stateTurns: ctx.stateTurns + 1 }; // self-loop: not a re-entry
  const entryCounts = { ...ctx.entryCounts, [target]: (ctx.entryCounts[target] ?? 0) + 1 };
  return {
    ...ctx,
    currentState: target,
    stateEntryCount: entryCounts[target],
    stateTurns: 0,
    entryCounts,
    history: [...ctx.history, target],
  };
}

const TECHNICAL_OUTCOMES = { call_unanswered: 'unanswered', voicemail_detected: 'voicemail', call_failed: 'failed', disconnected: 'disconnected', dnc_requested: 'do_not_call' };

/**
 * Applies one validated event. Pure: returns a new context, never mutates.
 * Throws InvalidTransitionError for events not allowed in the current state.
 */
export function applyEvent(ctx, event) {
  const { type } = event;
  if (TERMINAL_STATES.includes(ctx.currentState)) throw new InvalidTransitionError(ctx.currentState, type, 'terminal state');

  let target = resolveTarget(ctx.currentState, type);
  if (!target) throw new InvalidTransitionError(ctx.currentState, type);

  let next = { ...ctx };
  if (type !== 'clarification_needed') next.clarifications = 0;
  if (TECHNICAL_OUTCOMES[type]) next.callOutcome = TECHNICAL_OUTCOMES[type];

  switch (type) {
    case 'eligibility_passed':
      // Never infer consent: the pre-call check must have a recorded basis.
      if (BLOCKED_CONSENT.includes(ctx.consentStatus)) throw new InvalidTransitionError(ctx.currentState, type, `consent status "${ctx.consentStatus}"`);
      break;
    case 'dnc_requested':
      next.doNotCall = true;
      break;
    case 'permission_declined':
    case 'prospect_declined':
      next.declined = true;
      break;
    case 'human_requested':
      next.humanRequested = true;
      next.preferredNextStep = 'human_callback_requested';
      break;
    case 'callback_requested':
      next.preferredNextStep = 'ai_callback_later';
      break;
    case 'discovery_answer':
      next.discoveryQuestions += 1;
      // Unknown is different from a negative answer: only store values actually given.
      if (event.field && event.value !== undefined && event.value !== null && event.value !== '') {
        next.data = { ...next.data, [event.field]: event.value };
      }
      if (discoveryComplete(next)) target = 'SOLUTION_PRESENTATION';
      break;
    case 'discovery_complete':
      if (!discoveryComplete(next) && !event.earlyPresentation) {
        throw new InvalidTransitionError(ctx.currentState, type, `missing ${missingDiscovery(next).join(', ')}`);
      }
      break;
    case 'question_asked':
    case 'objection_raised': {
      // Several concerns at once: record all, handle the most important first.
      const raised = prioritizeObjections(event.objectionIds ?? [event.objectionId ?? 'general_question'], next.objectionRules);
      if (ctx.currentState !== 'OBJECTION_HANDLING') {
        next.returnState = ctx.currentState;
        next.blockObjections = [];
        next.pendingObjections = [];
        next.blockEscalated = false;
      }
      const queue = prioritizeObjections([...raised, ...next.pendingObjections.filter((id) => !raised.includes(id))], next.objectionRules);
      next.activeObjection = queue[0];
      next.pendingObjections = queue.slice(1);
      next.blockObjections = [...new Set([...next.blockObjections, ...raised])];
      next.objectionAttempts = { ...next.objectionAttempts };
      for (const id of raised) {
        next.objectionAttempts[id] = (next.objectionAttempts[id] ?? 0) + 1;
        if (type === 'objection_raised' && !next.objections.includes(id)) next.objections = [...next.objections, id];
      }
      // escalate=true: the registry's conditional escalate_when applies (e.g. legal or integration specifics).
      if (event.escalate === true) next.blockEscalated = true;
      // Loop guard: the same objection beyond the limit escalates instead of re-pitching.
      if (raised.some((id) => next.objectionAttempts[id] > next.limits.max_objection_attempts_per_topic)) {
        next.escalated = true;
        target = 'NEXT_STEP_SELECTION';
      }
      break;
    }
    case 'objection_resolved': {
      // Remaining concerns from the same block are handled one at a time first.
      if (next.pendingObjections.length) {
        next.activeObjection = next.pendingObjections[0];
        next.pendingObjections = next.pendingObjections.slice(1);
        target = 'OBJECTION_HANDLING';
        break;
      }
      const resolved = next.blockEscalated ? { target: 'NEXT_STEP_SELECTION', escalated: true } : resolveObjectionBlock(next);
      target = resolved.target;
      if (resolved.escalated) next.escalated = true;
      if (resolved.via === 'requests_human') {
        next.humanRequested = true;
        next.preferredNextStep = 'human_callback_requested';
      } else if (resolved.via === 'send_information') {
        next.preferredNextStep = 'information_requested';
      }
      next.returnState = null;
      next.activeObjection = null;
      next.blockObjections = [];
      next.blockEscalated = false;
      break;
    }
    case 'escalation_needed':
      next.escalated = true;
      break;
    case 'next_step_agreed':
      if (!next.permittedNextSteps.includes(event.step)) throw new InvalidTransitionError(ctx.currentState, type, `next step "${event.step}" is not permitted`);
      next.preferredNextStep = event.step;
      break;
    case 'follow_up_captured':
      next.data = {
        ...next.data,
        ...(event.time ? { preferred_callback_time: event.time } : {}),
        ...(event.channel ? { follow_up_channel: event.channel } : {}),
      };
      break;
    case 'outcome_save_failed':
      next.saveAttempts += 1;
      if (next.saveAttempts > next.limits.max_tool_retries) {
        next.saveFailed = true;
        target = 'CALL_COMPLETED';
      }
      break;
    case 'clarification_needed':
      next.clarifications += 1;
      break;
    default:
      break;
  }

  // Fallback when intent can't be resolved: too many clarifications, or too long in one state.
  const unresolved =
    next.clarifications > next.limits.max_clarification_attempts ||
    (target === ctx.currentState && type !== 'outcome_save_failed' && ctx.stateTurns + 1 > next.limits.max_turns_per_state);
  if (unresolved && TRANSITIONS[ctx.currentState]?.unresolved_intent) {
    next.escalated = true;
    next.clarifications = 0;
    target = TRANSITIONS[ctx.currentState].unresolved_intent;
  }

  // Generic loop guard: re-entering a sales state too often stops the pitch and falls back to
  // offering a human follow-up; if that state is itself exhausted, the call is summarised.
  const overLimit = (s) => (next.entryCounts[s] ?? 0) + 1 > next.limits.max_state_entries;
  if (!TERMINAL_STATES.includes(target) && target !== 'CALL_SUMMARY' && target !== ctx.currentState && overLimit(target)) {
    next.escalated = true;
    target = target !== 'NEXT_STEP_SELECTION' && !overLimit('NEXT_STEP_SELECTION') && isAllowedTransition(ctx.currentState, 'NEXT_STEP_SELECTION')
      ? 'NEXT_STEP_SELECTION'
      : 'CALL_SUMMARY';
  }

  return enter(next, target);
}

// Validates a sequence of visited states (e.g. reconstructed from ElevenLabs workflow nodes).
export function validatePath(states) {
  const violations = [];
  for (let i = 1; i < states.length; i++) {
    if (!isAllowedTransition(states[i - 1], states[i])) violations.push({ from: states[i - 1], to: states[i], index: i });
  }
  return { valid: violations.length === 0, violations };
}
