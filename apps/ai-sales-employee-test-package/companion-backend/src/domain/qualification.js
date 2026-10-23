// Deterministic lead qualification. The LLM only extracts candidate facts after the call;
// this ruleset makes the final classification from validated data.

const TECHNICAL_UNREACHABLE = ['unanswered', 'voicemail', 'failed'];

// Builds boolean signals from validated, structured data. Only explicit evidence counts:
// a missing value is "unknown", never "no".
export function deriveSignals(data) {
  const step = data.preferred_next_step ?? null;
  return {
    do_not_call: data.do_not_call_requested === true,
    explicit_rejection: data.explicit_rejection === true,
    technical_unreachable: TECHNICAL_UNREACHABLE.includes(data.call_outcome),
    disconnected: data.call_outcome === 'disconnected',
    interest_expressed: data.interest_expressed === true,
    relevant_need_identified: data.relevant_need_identified === true,
    needs_internal_approval: data.needs_internal_approval === true,
    information_requested: step === 'information_requested',
    no_need_identified: data.no_need_identified === true,
    low_interest: data.low_interest === true,
    human_requested: data.human_requested === true,
    preferred_next_step: step,
  };
}

/**
 * @returns {{ category: string, reasons: string[] }}
 * category ∈ hot | warm | cold | unknown | not_interested | do_not_call | unreachable | human_follow_up_required
 */
export function qualify(signals, rules) {
  const has = (name) => signals[name] === true;

  // Compliance and technical outcomes first: never treated as sales leads to pursue.
  if (has('do_not_call')) return { category: 'do_not_call', reasons: ['prospect asked not to be called'] };
  if (has('explicit_rejection')) return { category: 'not_interested', reasons: ['prospect explicitly declined'] };
  if (has('technical_unreachable')) return { category: 'unreachable', reasons: ['no live conversation'] };

  const concrete = rules.hot.concrete_next_steps.includes(signals.preferred_next_step);
  const hotOk = rules.hot.all_of.every((s) => (s === 'concrete_next_step_agreed' ? concrete : has(s)));
  if (hotOk) return { category: 'hot', reasons: [...rules.hot.all_of] };

  for (const group of rules.warm.any_of) {
    if (group.every(has)) return { category: 'warm', reasons: group };
  }

  // A request for a person without interest and need evidence is a hand-off, not a hot lead.
  if (has('human_requested')) return { category: 'human_follow_up_required', reasons: ['prospect asked for a person'] };

  const coldHits = rules.cold_when.filter(has);
  if (coldHits.length) return { category: 'cold', reasons: coldHits };

  if (has('disconnected')) return { category: 'unreachable', reasons: ['disconnected before qualification'] };
  return { category: 'unknown', reasons: ['insufficient evidence to classify'] };
}
