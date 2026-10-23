// Event contracts shared by the core system and every integration adapter.
// Envelope: { id, type, version, occurred_at, lead_id, conversation_id, data }
// `id` is deterministic (type + conversation) so replays and duplicate webhooks are idempotent.
//
// v2 (B2B model): leads are real estate COMPANIES evaluating our AI Sales Employee.
// property.recommended -> information.requested, viewing.requested -> demo.requested.

export const EVENT_TYPES = {
  CALL_COMPLETED: 'call.completed',
  LEAD_QUALIFIED: 'lead.qualified',
  LEAD_FOLLOW_UP_REQUESTED: 'lead.follow_up_requested',
  INFORMATION_REQUESTED: 'information.requested',
  DEMO_REQUESTED: 'demo.requested',
  LEAD_DO_NOT_CALL: 'lead.do_not_call',
};

export const EVENT_VERSION = 2;

// Required keys inside `data` for each event type.
const REQUIRED_DATA = {
  'call.completed': ['call_outcome', 'lead_category', 'summary', 'state_path', 'flow_valid'],
  'lead.qualified': ['lead_category', 'qualification', 'reasons'],
  'lead.follow_up_requested': ['next_action', 'follow_up_channel', 'callback_time', 'reason'],
  'information.requested': ['follow_up_channel'],
  'demo.requested': ['meeting_type', 'preferred_time', 'follow_up_channel', 'confirmed', 'booking_integration'],
  'lead.do_not_call': ['requested_at'],
};

export function buildEvent(type, { leadId, conversationId, occurredAt, data }) {
  return {
    id: `${type}:${conversationId}`,
    type,
    version: EVENT_VERSION,
    occurred_at: occurredAt,
    lead_id: leadId,
    conversation_id: conversationId,
    data,
  };
}

export function validateEvent(event) {
  const errors = [];
  if (!Object.values(EVENT_TYPES).includes(event.type)) errors.push(`unknown event type ${event.type}`);
  for (const key of ['id', 'occurred_at', 'lead_id', 'conversation_id']) {
    if (!event[key]) errors.push(`missing ${key}`);
  }
  for (const key of REQUIRED_DATA[event.type] ?? []) {
    if (!(key in (event.data ?? {}))) errors.push(`missing data.${key}`);
  }
  // A demo or meeting is never confirmed by the AI; only a real booking system or a person can.
  if (event.type === EVENT_TYPES.DEMO_REQUESTED && event.data?.confirmed !== false) {
    errors.push('demo.requested must have confirmed=false');
  }
  return errors;
}
