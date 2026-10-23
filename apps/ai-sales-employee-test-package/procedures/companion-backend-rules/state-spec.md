# State Specification

> GENERATED from `backend/src/domain/state-machine.js`. Run `node scripts/render-state-spec.js > ../docs/state-spec.md` after changing it.

Global events from every live state: `dnc_requested` → DO_NOT_CALL, `disconnected` → CALL_SUMMARY, `clarification_needed` → same state (counted).

Limits (`config/sales-playbook.json`): `max_objection_attempts_per_topic`=2, `max_clarification_attempts`=2, `max_discovery_questions`=4, `max_state_entries`=4, `max_turns_per_state`=8, `max_tool_retries`=2, `max_call_duration_seconds`=600, `unresolved_intent_fallback`=Offer a human follow-up; if declined, close politely.

## PRE_CALL_CHECK

| | |
|---|---|
| Runs in | backend |
| Entry conditions | An authorised operator requests one call for one lead (POST /api/calls, confirm=true). |
| Objective | Validate lead eligibility, consent/contact status and campaign rules. |
| Required inputs | lead; campaign; consent basis; suppression status; call mode |
| Allowed dialogue intentions | — |
| Required actions | checkEligibility(): DNC list, consent basis, test allow-list, compliance approval, calling hours in lead time zone, attempts, spacing, cooldown, no active call |
| Successful exit | All checks pass -> CALL_INITIATED. |
| Alternative exits | Any check fails -> CALL_COMPLETED (HTTP 422 with every reason; no call placed). |
| Error handling | Missing lead/campaign is reported as a reason; nothing is dialled. |
| Events accepted | `eligibility_passed` → CALL_INITIATED; `eligibility_failed` → CALL_COMPLETED |
| Next permitted states | CALL_INITIATED; CALL_COMPLETED |
| Terminal | no |

## CALL_INITIATED

| | |
|---|---|
| Runs in | backend + ElevenLabs telephony |
| Entry conditions | Eligibility passed; the attempt is counted before dialling. |
| Objective | Place one authorised outbound call. |
| Required inputs | phone number id; dynamic variables |
| Allowed dialogue intentions | — |
| Required actions | ElevenLabs outbound-call API (never auto-retried) |
| Successful exit | Connected -> IDENTITY_DISCLOSURE. |
| Alternative exits | Unanswered, voicemail or failure -> CALL_SUMMARY (technical branch, no sales conversation). |
| Error handling | API error -> lead retry_scheduled, HTTP 502; initiation-failure webhook -> unreachable / invalid_number. |
| Events accepted | `call_connected` → IDENTITY_DISCLOSURE; `call_unanswered` → CALL_SUMMARY; `voicemail_detected` → CALL_SUMMARY; `call_failed` → CALL_SUMMARY |
| Next permitted states | IDENTITY_DISCLOSURE; CALL_SUMMARY |
| Terminal | no |

## IDENTITY_DISCLOSURE

| | |
|---|---|
| Runs in | ElevenLabs first message |
| Entry conditions | Call connected. |
| Objective | Identify as an AI sales assistant and the company it represents. |
| Required inputs | agent_name; company_name |
| Allowed dialogue intentions | fixed first message only |
| Required actions | Speak the fixed, non-interruptible first message |
| Successful exit | Disclosure spoken -> PERMISSION_CHECK. |
| Alternative exits | Do-not-call or disconnection (global). |
| Error handling | Not model-generated, so it cannot be skipped. |
| Events accepted | `disclosure_done` → PERMISSION_CHECK |
| Next permitted states | PERMISSION_CHECK; DO_NOT_CALL; CALL_SUMMARY; IDENTITY_DISCLOSURE |
| Terminal | no |

## PERMISSION_CHECK

| | |
|---|---|
| Runs in | node permission |
| Entry conditions | Disclosure done. |
| Objective | Ask whether it is a convenient time to talk. |
| Required inputs | prospect answer |
| Allowed dialogue intentions | explain who is calling and why in one sentence; confirm being an AI; ask for a better time |
| Required actions | Wait for the prospect before speaking |
| Successful exit | Prospect agrees -> DISCOVERY. |
| Alternative exits | Busy/callback -> FOLLOW_UP_CAPTURE; asks for a person -> FOLLOW_UP_CAPTURE; declines -> CALL_SUMMARY; unresolved -> CALL_SUMMARY. |
| Error handling | Unclear answer -> one targeted clarification, max limits.max_clarification_attempts. |
| Events accepted | `permission_granted` → DISCOVERY; `callback_requested` → FOLLOW_UP_CAPTURE; `permission_declined` → CALL_SUMMARY; `human_requested` → FOLLOW_UP_CAPTURE; `unresolved_intent` → CALL_SUMMARY |
| Next permitted states | DISCOVERY; FOLLOW_UP_CAPTURE; CALL_SUMMARY; DO_NOT_CALL; PERMISSION_CHECK |
| Terminal | no |

## DISCOVERY

| | |
|---|---|
| Runs in | node discovery |
| Entry conditions | Permission granted. |
| Objective | Understand the company's lead handling and main sales challenge. |
| Required inputs | current_lead_process; primary_challenge |
| Allowed dialogue intentions | one discovery question per turn; acknowledge answers; short answer to a relevant question, then return |
| Required actions | Record answers; never store a non-answer as a value |
| Successful exit | Both required fields known, or limits.max_discovery_questions reached -> SOLUTION_PRESENTATION. |
| Alternative exits | Early-presentation rule (prospect asks what the product is) -> SOLUTION_PRESENTATION; question/objection -> OBJECTION_HANDLING and back; refuses questions -> NEXT_STEP_SELECTION; person -> FOLLOW_UP_CAPTURE; declines -> CALL_SUMMARY. |
| Error handling | discovery_complete without the required fields or the early-presentation flag is rejected. |
| Events accepted | `discovery_answer` → DISCOVERY; `discovery_complete` → SOLUTION_PRESENTATION; `question_asked` → OBJECTION_HANDLING; `objection_raised` → OBJECTION_HANDLING; `discovery_declined` → NEXT_STEP_SELECTION; `human_requested` → FOLLOW_UP_CAPTURE; `prospect_declined` → CALL_SUMMARY; `unresolved_intent` → NEXT_STEP_SELECTION |
| Next permitted states | DISCOVERY; SOLUTION_PRESENTATION; OBJECTION_HANDLING; NEXT_STEP_SELECTION; FOLLOW_UP_CAPTURE; CALL_SUMMARY; DO_NOT_CALL |
| Terminal | no |

## SOLUTION_PRESENTATION

| | |
|---|---|
| Runs in | node presentation |
| Entry conditions | Discovery complete or early-presentation rule. |
| Objective | Explain the AI Sales Employee in terms of the prospect's stated needs. |
| Required inputs | primary_challenge (when known) |
| Allowed dialogue intentions | connect at most two current capabilities to the stated challenge; check relevance with one question |
| Required actions | Planned features must be labelled planned |
| Successful exit | Prospect can assess interest -> LEAD_QUALIFICATION -> NEXT_STEP_SELECTION. |
| Alternative exits | Question/objection -> OBJECTION_HANDLING; person -> FOLLOW_UP_CAPTURE; declines -> LEAD_QUALIFICATION -> CALL_SUMMARY. |
| Error handling | Unresolved intent -> NEXT_STEP_SELECTION (offer a human follow-up). |
| Events accepted | `presentation_done` → LEAD_QUALIFICATION; `question_asked` → OBJECTION_HANDLING; `objection_raised` → OBJECTION_HANDLING; `human_requested` → FOLLOW_UP_CAPTURE; `prospect_declined` → LEAD_QUALIFICATION; `unresolved_intent` → NEXT_STEP_SELECTION |
| Next permitted states | LEAD_QUALIFICATION; OBJECTION_HANDLING; FOLLOW_UP_CAPTURE; NEXT_STEP_SELECTION; DO_NOT_CALL; CALL_SUMMARY; SOLUTION_PRESENTATION |
| Terminal | no |

## OBJECTION_HANDLING

| | |
|---|---|
| Runs in | node objection (KB doc 05 attached) |
| Entry conditions | A question or concern is raised in DISCOVERY, SOLUTION_PRESENTATION or NEXT_STEP_SELECTION. |
| Objective | Answer with the approved registry strategy, then return. |
| Required inputs | objection id(s) from the registry |
| Allowed dialogue intentions | registry strategy; required disclosure; registry follow-up question |
| Required actions | Highest-priority concern first; one concern at a time |
| Successful exit | Resolved -> registry return_state: 'previous' returns to the interrupted state; NEXT_STEP_SELECTION or FOLLOW_UP_CAPTURE otherwise. |
| Alternative exits | escalate_when 'always' or an escalation flag -> NEXT_STEP_SELECTION; same concern beyond the limit -> NEXT_STEP_SELECTION; person -> FOLLOW_UP_CAPTURE; declines -> LEAD_QUALIFICATION. |
| Error handling | Answer not in the KB -> say so and offer the sales team (escalation). |
| Events accepted | `objection_resolved` → RETURN; `question_asked` → OBJECTION_HANDLING; `objection_raised` → OBJECTION_HANDLING; `escalation_needed` → NEXT_STEP_SELECTION; `human_requested` → FOLLOW_UP_CAPTURE; `prospect_declined` → LEAD_QUALIFICATION; `unresolved_intent` → NEXT_STEP_SELECTION |
| Next permitted states | OBJECTION_HANDLING; NEXT_STEP_SELECTION; FOLLOW_UP_CAPTURE; LEAD_QUALIFICATION; DO_NOT_CALL; CALL_SUMMARY; DISCOVERY; SOLUTION_PRESENTATION |
| Terminal | no |

## LEAD_QUALIFICATION

| | |
|---|---|
| Runs in | backend (no in-call node; passed through automatically) |
| Entry conditions | Presentation done, or the prospect declined after hearing it. |
| Objective | Classify the prospect with the deterministic ruleset. |
| Required inputs | validated extraction fields |
| Allowed dialogue intentions | — |
| Required actions | qualify() on validated data after the call; the agent never announces a category |
| Successful exit | Recorded -> NEXT_STEP_SELECTION. |
| Alternative exits | Declined -> CALL_SUMMARY. |
| Error handling | Insufficient evidence -> category unknown (never guessed). |
| Events accepted | `qualification_recorded` → NEXT_STEP_SELECTION; `declined_recorded` → CALL_SUMMARY |
| Next permitted states | NEXT_STEP_SELECTION; CALL_SUMMARY; DO_NOT_CALL; LEAD_QUALIFICATION |
| Terminal | no |

## NEXT_STEP_SELECTION

| | |
|---|---|
| Runs in | node next_step |
| Entry conditions | Qualification passed, discovery refused, escalation, or fallback. |
| Objective | Offer one permitted next step and let the prospect choose. |
| Required inputs | prospect choice |
| Allowed dialogue intentions | offer one step; offer one alternative if declined |
| Required actions | Only playbook next_steps.permitted are accepted; nothing is booked |
| Successful exit | Eligible step agreed -> FOLLOW_UP_CAPTURE. |
| Alternative exits | No step -> CALL_SUMMARY; question/objection -> OBJECTION_HANDLING; person -> FOLLOW_UP_CAPTURE. |
| Error handling | A step outside the permitted list is rejected. |
| Events accepted | `next_step_agreed` → FOLLOW_UP_CAPTURE; `no_next_step` → CALL_SUMMARY; `question_asked` → OBJECTION_HANDLING; `objection_raised` → OBJECTION_HANDLING; `human_requested` → FOLLOW_UP_CAPTURE; `unresolved_intent` → CALL_SUMMARY |
| Next permitted states | FOLLOW_UP_CAPTURE; CALL_SUMMARY; OBJECTION_HANDLING; DO_NOT_CALL; NEXT_STEP_SELECTION |
| Terminal | no |

## FOLLOW_UP_CAPTURE

| | |
|---|---|
| Runs in | node follow_up |
| Entry conditions | Next step agreed, callback requested, or a person requested. |
| Objective | Capture time window and contact channel for the agreed follow-up. |
| Required inputs | preferred_callback_time; follow_up_channel |
| Allowed dialogue intentions | one question at a time; repeat details back |
| Required actions | Say the team will contact them to confirm; booking_integration_available=false is recorded on demo.requested |
| Successful exit | Details captured -> CALL_SUMMARY. |
| Alternative exits | Declines to give details -> CALL_SUMMARY. |
| Error handling | Never say booked/confirmed/sent. |
| Events accepted | `follow_up_captured` → CALL_SUMMARY; `follow_up_declined` → CALL_SUMMARY; `unresolved_intent` → CALL_SUMMARY |
| Next permitted states | CALL_SUMMARY; DO_NOT_CALL; FOLLOW_UP_CAPTURE |
| Terminal | no |

## CALL_SUMMARY

| | |
|---|---|
| Runs in | node close + backend webhook |
| Entry conditions | Sales flow ended, declined, disconnected, or a technical branch. |
| Objective | Produce, validate and save the structured outcome. |
| Required inputs | post-call analysis; state path |
| Allowed dialogue intentions | one-sentence recap and goodbye |
| Required actions | validateExtraction(), qualify(), validatePath(), save lead/call/events idempotently |
| Successful exit | Saved -> CALL_COMPLETED. |
| Alternative exits | Save failure -> retry in place up to limits.max_tool_retries, then CALL_COMPLETED with saveFailed recorded. |
| Error handling | Webhook is only marked processed after all writes succeed, so ElevenLabs retries. |
| Events accepted | `outcome_saved` → CALL_COMPLETED; `outcome_save_failed` → CALL_SUMMARY |
| Next permitted states | CALL_COMPLETED; CALL_SUMMARY |
| Terminal | no |

## CALL_COMPLETED

| | |
|---|---|
| Runs in | terminal |
| Entry conditions | Outcome saved, or a documented save failure, or blocked pre-call. |
| Objective | End politely. |
| Required inputs | — |
| Allowed dialogue intentions | — |
| Required actions | end_call |
| Successful exit | Terminal. |
| Alternative exits | None. |
| Error handling | No further events accepted. |
| Events accepted | — |
| Next permitted states | — |
| Terminal | yes |

## DO_NOT_CALL

| | |
|---|---|
| Runs in | node dnc + backend suppression |
| Entry conditions | The prospect asked not to be contacted again, from any live state. |
| Objective | Confirm in one sentence, end, and suppress the number. |
| Required inputs | — |
| Allowed dialogue intentions | one confirmation sentence |
| Required actions | end_call; suppress the number; emit only call.completed + lead.do_not_call |
| Successful exit | Terminal. |
| Alternative exits | None. |
| Error handling | Suppression is written before anything else, so a failed later write cannot re-enable calling. |
| Events accepted | — |
| Next permitted states | — |
| Terminal | yes |

