// In-call conversation controller exposed to ElevenLabs as a webhook tool ("sales_flow_step").
//
// Controller mode: the agent classifies each stage-changing prospect reply into one intent
// (an enum, validated by ElevenLabs and again here) and calls this tool. The backend applies
// it to the state machine, persists the context, and returns `next_node`. ElevenLabs assigns
// that to the dynamic variable `flow_next_node`, and the workflow edges are expressions on
// that variable, so the backend, not the model, decides every stage transition.

import { DISCOVERY_FIELDS, IN_CALL_INTENTS, InvalidTransitionError, STATE_SPECS, applyEvent, createContext, missingDiscovery } from '../domain/state-machine.js';
import { STATE_NODES } from './workflow.js';

const CHANNELS = ['phone', 'email', 'whatsapp'];
const clean = (v, max = 200) => String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

export class FlowRequestError extends Error {}

/** Validates the tool arguments (never trusts the model's payload) and builds a state-machine event. */
export function parseFlowRequest(body, playbook) {
  const errors = [];
  const conversationId = typeof body.conversation_id === 'string' ? body.conversation_id.trim() : '';
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(conversationId)) errors.push('conversation_id is required');
  if (!IN_CALL_INTENTS.includes(body.intent)) errors.push(`intent must be one of ${IN_CALL_INTENTS.join(', ')}`);
  const event = { type: body.intent };

  if (body.intent === 'discovery_answer') {
    if (!DISCOVERY_FIELDS.includes(body.field)) errors.push(`field must be one of ${DISCOVERY_FIELDS.join(', ')}`);
    event.field = body.field;
    // An empty or "unknown" answer is recorded as no value, never as a negative answer.
    const v = body.value === undefined || body.value === null ? null : clean(body.value);
    event.value = v && !/^(unknown|n\/a|none given)$/i.test(v) ? v : null;
  }
  if (body.intent === 'discovery_complete') event.earlyPresentation = body.early_presentation === true;
  if (['objection_raised', 'question_asked'].includes(body.intent)) {
    const known = new Set(playbook.objections.map((o) => o.id));
    const ids = String(body.objection_ids ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const valid = ids.filter((id) => known.has(id));
    if (body.intent === 'objection_raised' && valid.length === 0) errors.push('objection_ids must contain at least one registry id');
    event.objectionIds = valid.length ? valid : ['general_question'];
    event.escalate = body.escalate === true;
  }
  if (body.intent === 'next_step_agreed') event.step = body.next_step;
  if (body.intent === 'follow_up_captured') {
    if (body.callback_time) event.time = clean(body.callback_time, 120);
    if (CHANNELS.includes(body.channel)) event.channel = body.channel;
  }
  if (errors.length) throw new FlowRequestError(errors.join('; '));
  return { conversationId, event };
}

// The model gets the state's objective, what is still missing and what it may do next,
// never the internal state names to say aloud.
export function stageGuidance(ctx, playbook) {
  const spec = STATE_SPECS[ctx.currentState];
  const g = { objective: spec.objective, allowed: spec.allowedIntents };
  if (ctx.currentState === 'DISCOVERY') {
    g.still_missing = missingDiscovery(ctx);
    g.questions_left = Math.max(0, ctx.limits.max_discovery_questions - ctx.discoveryQuestions);
    g.already_known = Object.keys(ctx.data);
  }
  if (ctx.currentState === 'OBJECTION_HANDLING' && ctx.activeObjection) {
    const o = playbook.objections.find((x) => x.id === ctx.activeObjection);
    if (o) {
      g.handle_now = o.id;
      g.strategy = o.strategy;
      g.must_say = o.required_disclosures;
      g.follow_up_question = o.follow_up_question;
    }
    g.then_handle = ctx.pendingObjections;
  }
  if (ctx.currentState === 'NEXT_STEP_SELECTION') {
    g.offer_one_of = ctx.permittedNextSteps;
    if (ctx.escalated) g.note = 'Offer a follow-up with the human sales team.';
  }
  if (ctx.currentState === 'FOLLOW_UP_CAPTURE') {
    g.still_missing = ['preferred_callback_time', 'follow_up_channel'].filter((f) => !ctx.data[f]);
    g.booking_available = playbook.next_steps.booking_integration_available === true;
    g.rule = 'Say the sales team will contact them to confirm. Never say booked, confirmed or sent.';
  }
  return g;
}

function initialContext({ conversationId, call, lead, playbook, sandbox }) {
  let ctx = createContext({ conversationId, playbook, consentStatus: sandbox ? 'sandbox_test' : lead?.consent?.basis ?? 'unknown' });
  // The backend already ran the eligibility check and placed the call; the fixed first
  // message delivered the AI disclosure.
  for (const type of ['eligibility_passed', 'call_connected', 'disclosure_done']) ctx = applyEvent(ctx, { type });
  return { ...ctx, sandbox, leadId: call?.lead_id ?? null };
}

// Passes through states that have no in-call node.
function autoAdvance(ctx) {
  if (ctx.currentState === 'LEAD_QUALIFICATION') {
    // Provisional in-call step; the binding category is computed post-call by qualify().
    return applyEvent(ctx, { type: ctx.declined ? 'declined_recorded' : 'qualification_recorded' });
  }
  return ctx;
}

/**
 * Handles one sales_flow_step tool call. Returns the payload ElevenLabs sees.
 * An invalid transition is not an error for the call: the stage simply does not change.
 */
export async function handleFlowStep({ body, store, playbook, callMode, now = new Date() }) {
  const { conversationId, event } = parseFlowRequest(body, playbook);
  let ctx = store.getFlowContext(conversationId);
  if (!ctx) {
    const call = store.getCall(conversationId);
    // Only conversations this backend started may be controlled, except simulations in test mode.
    if (!call && callMode === 'live') throw new FlowRequestError('unknown conversation');
    ctx = initialContext({ conversationId, call, lead: call ? store.getLead(call.lead_id) : null, playbook, sandbox: !call });
  }

  const before = ctx.currentState;
  let accepted = true;
  let reason;
  try {
    ctx = autoAdvance(applyEvent(ctx, event));
  } catch (err) {
    if (!(err instanceof InvalidTransitionError)) throw err;
    accepted = false;
    reason = err.reason || `"${event.type}" does not apply at this stage`;
  }
  ctx = { ...ctx, updated_at: now.toISOString() };
  await store.putFlowContext(ctx);

  return {
    accepted,
    ...(reason ? { reason } : {}),
    next_node: STATE_NODES[ctx.currentState],
    stage_changed: before !== ctx.currentState,
    guidance: stageGuidance(ctx, playbook),
  };
}
