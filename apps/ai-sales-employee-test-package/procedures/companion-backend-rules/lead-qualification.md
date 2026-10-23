# Lead Qualification (B2B)

A "lead" is a **real estate company contact** evaluated for the AI Sales Employee service.

## Who decides the category
The LLM only **extracts candidate facts** after the call (ElevenLabs post-call data collection, 25 fields). The backend type-checks them (`validateExtraction`) and computes the category with a fixed ruleset (`qualification.js`, rules in `config/sales-playbook.json`). The LLM's `call_outcome` is advisory; there is no LLM-chosen category.

## Rules (first match wins)
| Order | Condition | Category |
|---|---|---|
| 1 | `do_not_call_requested` | `do_not_call` |
| 2 | `explicit_rejection` | `not_interested` |
| 3 | outcome `unanswered` / `voicemail` / `failed` | `unreachable` |
| 4 | `interest_expressed` ∧ `relevant_need_identified` ∧ next step ∈ {demo, meeting, human callback, proposal} | `hot` |
| 5 | (need ∧ interest) ∨ information requested ∨ (need ∧ `needs_internal_approval`) | `warm` |
| 6 | `human_requested` | `human_follow_up_required` |
| 7 | `no_need_identified` ∨ `low_interest` | `cold` |
| 8 | outcome `disconnected` | `unreachable` |
| 9 | none of the above | `unknown` |

Special cases: explicit rejection **and** an agreed concrete step → `human_follow_up_required` + `needs_review`. A follow-up step without `consent_to_follow_up` → `needs_review`. A workflow path that violates the transition map → `needs_review`.

## Call outcomes (`call_outcome`)
`qualified, follow_up_requested, demo_requested, information_requested, not_interested, do_not_call, unanswered, voicemail, failed, disconnected, human_follow_up_required`

## Next steps (`preferred_next_step`)
`demo_requested, meeting_requested, human_callback_requested, proposal_requested, information_requested, ai_callback_later, none`. Calendar booking is not available, so every demo/meeting is recorded as **requested, unconfirmed**.

## Captured fields
Company: `company_name, contact_name, contact_role, preferred_language, sales_team_size, lead_volume, current_lead_process, primary_challenge, current_crm`.
Signals: `interest_expressed, relevant_need_identified, needs_internal_approval, no_need_identified, low_interest, explicit_rejection, human_requested, do_not_call_requested, consent_to_follow_up, ai_disclosure_given`.
Follow-up: `objections` (registry ids only), `preferred_next_step, preferred_callback_time, follow_up_channel, unanswered_questions`.
Integers are only accepted when explicitly stated; missing values stay unknown, never "no".

## Lead record after a call
`category, status (contacted | closed | suppressed | retry_scheduled | exhausted | invalid_number), qualification{}, open_follow_ups{}, needs_review, last_outcome{conversation_id, call_outcome, next_action, summary, state_path, flow_valid, issues}`.
