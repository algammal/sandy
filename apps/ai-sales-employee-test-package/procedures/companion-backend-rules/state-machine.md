# Deterministic Conversation Engine

The call is controlled by an explicit state machine, not by a prompt. A prompt alone cannot guarantee deterministic behaviour, so control is split across three layers. This document states exactly which layer enforces what.

| Layer | Where | Responsibility |
|---|---|---|
| **1. Conversation controller** | `backend/src/domain/state-machine.js`: transition map, limits, loop guards, registry-driven objection routing. Exposed in-call through `POST /tools/sales-flow` (`src/elevenlabs/flow-tool.js`) and compiled into the ElevenLabs workflow (`src/elevenlabs/workflow.js`) | Which states exist, which transitions are allowed, what is still missing, what may happen next |
| **2. LLM conversational layer** | ElevenLabs agent: base prompt (`agent/system-prompt.md`) plus one `additional_prompt` per workflow node, with Egyptian Arabic examples | Natural wording; classifying the prospect's reply into one allowed intent |
| **3. Business actions** | Backend: eligibility (`eligibility.js`), extraction validation and qualification (`outcome.js`, `qualification.js`), suppression, idempotent events (`events/`) | Everything with a side effect or a business decision |

Business rules live in **`backend/config/sales-playbook.json`** and are validated at startup by `playbook.js`. They cover limits, required discovery fields, qualification rules, the objection registry (with priority, return state and escalation), approved and prohibited claims, permitted next steps and integration status. KB doc 05 is generated from it (`scripts/render-objections-kb.js`).

**Per-state specification** (entry, objective, inputs, allowed intentions, required actions, success and alternative exits, error handling, next states, terminal): **[`docs/state-spec.md`](state-spec.md)**. It is generated from the code, so the documented rules are the enforced ones.

## Two runtime modes

| | **LLM-edge mode** (live now) | **Controller mode** (built and tested; needs the backend deployed) |
|---|---|---|
| Who decides a stage change | ElevenLabs evaluates an LLM condition on each edge | **The backend.** The agent reports one intent through the `sales_flow_step` webhook tool. The backend validates it against the transition map, persists the context and returns `next_node`, which ElevenLabs assigns to `flow_next_node`. Every edge is an `expression` on that variable. |
| Edges | 24, hand-written conditions, structurally a subset of the map | 28, **derived from the transition map**: one per allowed node-to-node transition |
| Invalid move (e.g. "discovery complete" with the challenge unknown) | Possible; detected only after the call (`flow_valid=false`, `needs_review`) | Rejected in-call (`accepted:false`, stage unchanged, reason returned) |
| Limits (clarifications, turns in state, objection attempts, re-entries) | Instructions to the model; enforced only in the post-call model | **Enforced in-call** by the controller |
| What the model gets per stage | Static node instructions | Static instructions **plus live guidance**: missing fields, questions left, the active objection's registry strategy, required disclosure and follow-up question, queued objections, permitted next steps |
| Authoritative path for the outcome | Workflow-node trace | Controller history (the node trace is kept as a cross-check: `trace_matches_controller`) |
| Files | `agent/workflow.json` | `agent/workflow.controller.json`, `agent/tools/sales-flow-step.json` |

**Why controller mode isn't live yet:** the webhook tool needs a public HTTPS backend and the workspace has none. ElevenLabs code tools would avoid that dependency, but they need an Enterprise plan; the workspace returned `code_tools_disabled`. Live today, the agent runs LLM-edge mode with the same graph structure.

Platform facts verified against the ElevenLabs API (docs were unreachable from this environment):
- Edge conditions support `unconditional`, `llm`, `result` and `expression`.
- An expression is an AST: `{type:"eq_operator", left:{type:"dynamic_variable", name}, right:{type:"string_literal", value}}`.
- The generated controller workflow passes schema validation. This was checked by submitting it together with one deliberately invalid edge: only that edge was rejected, and nothing was saved.

**Not yet verified at runtime:** that ElevenLabs re-evaluates expression edges right after a tool's response assignment. Test this with an authorised call before relying on controller mode.

### Activating controller mode
1. Deploy the backend over HTTPS with `SALES_FLOW_TOOL_SECRET` (24+ random characters).
2. In ElevenLabs › Secrets, store the same value and note its secret id.
3. `node scripts/print-flow-tool.js https://<host>/tools/sales-flow <secretId> > ../agent/tools/sales-flow-step.json`, then create the tool (dashboard or `agents_create_tool`) and note the tool id.
4. Add the dynamic variable placeholder `flow_next_node = permission` to the agent. The backend already sends it on every call.
5. `node scripts/print-workflow.js 79t6UeweAfwe0hvAwLI4 --mode controller --tool-id <toolId> > ../agent/workflow.controller.json` and apply it.
6. Run an authorised test call (`CALL_MODE=test`) and confirm that `flow_source=controller` and `trace_matches_controller=true` on the call record.

## Structured procedures (ElevenLabs, type `deterministic`) — live

The moments that must never vary run as ElevenLabs **structured procedures**: a fixed list of typed steps, executed in the same order every time.
- They trigger from any stage of the workflow.
- `say` steps are spoken **verbatim**: a fixed Arabic sentence with an English translation, not model-generated.
- `ask` steps wait until the question is answered.
- `branch` steps choose between fixed step lists.
- `system_tool: end_call` ends the call.

Source: `backend/config/procedures.json` (validated by `test/procedures.test.js`), rendered by `scripts/print-procedures.js`.

| Procedure | Trigger | Fixed steps |
|---|---|---|
| Do-not-call request | asks not to be contacted again | say (fixed opt-out sentence) → end_call |
| Prospect asks for a human | wants a person, not the AI | say → follow-up capture → say goodbye → end_call |
| Pricing question | price, cost, fees, discounts | say (no number) → ask meeting? → branch: yes → follow-up capture → goodbye → end_call; no → acknowledge and continue |
| Case studies / results requested | references, testimonials, statistics | say (none available, no figures) → ask demo? → same branch pattern |
| Integration question | CRM, Sheets, WhatsApp, email, booking, transfer | say (planned, not available today) → continue |
| Are you a robot? | AI / real person question | say (AI disclosure + human option) → continue |
| Busy, call back later | busy now | ask better time → say → end_call |
| Send me information | wants details | ask WhatsApp or email → say (team will send) → continue |
| Follow-up capture (sub-procedure) | only called by the others | ask time → ask channel → repeat back, "team will confirm" (never booked) |

**Schema notes** (learned from the API's validation, since the docs were unreachable):
- Step types: `ask`, `tell`, `say`, `sub_procedure`, `tool_call`, `system_tool`, `branch`.
- Translations take the form `{"en": {"value": "..."}}`.
- Branch conditions are `llm` or `expression`.
- An `ask` step cannot store the answer in a variable, so branch conditions here are `llm` conditions.

**Post-call evidence:** procedure node ids appear in the transcript. The webhook records `procedures_run` on the call. If the do-not-call or human-request procedure ran, the matching fact is set deterministically, overriding the model's extraction (tested end to end).

## States
`PRE_CALL_CHECK → CALL_INITIATED → IDENTITY_DISCLOSURE → PERMISSION_CHECK → DISCOVERY → SOLUTION_PRESENTATION ⇄ OBJECTION_HANDLING → LEAD_QUALIFICATION → NEXT_STEP_SELECTION → FOLLOW_UP_CAPTURE → CALL_SUMMARY → CALL_COMPLETED`, with `DO_NOT_CALL` terminal from every live state. Full table: [`state-spec.md`](state-spec.md).

**Technical branches** never enter the sales conversation:
- Unanswered, voicemail, failed → CALL_SUMMARY.
- Ineligible → CALL_COMPLETED (no call).
- Disconnected from any live state → CALL_SUMMARY.

**Design note:** a decline at permission goes to CALL_SUMMARY and then CALL_COMPLETED, not straight to CALL_COMPLETED. The outcome (and any opt-out) must be saved before completion, per the CALL_SUMMARY rule.

**Interruption and return rules** (explicit transitions, not free movement):
- A question or concern in DISCOVERY, SOLUTION_PRESENTATION or NEXT_STEP_SELECTION goes to OBJECTION_HANDLING, then returns to the recorded `returnState`.
- The registry's `return_state` can override the return:
  - `requests_human` and `send_information` → FOLLOW_UP_CAPTURE.
  - `asks_for_pricing`, `requests_case_study`, `concerned_about_ai_voice` and `needs_management_approval` → NEXT_STEP_SELECTION.
- Several concerns at once are queued and handled one at a time in registry priority order (1 = `requests_human`, 2 = `privacy_concern`, 3 = `asks_for_pricing`, …).
- A request for a person → FOLLOW_UP_CAPTURE from any sales state.
- An unclear reply → `clarification_needed`, a counted self-loop.

## Context schema
`createContext()` holds:
- **Identity and position:** `conversationId`, `currentState`, `stateEntryCount`, `stateTurns`, `entryCounts`, `history`, `returnState`.
- **Collected data:** `data` (validated discovery facts and follow-up details), `consentStatus`, `discoveryQuestions`.
- **Objections:** `objections`, `objectionAttempts`, `activeObjection`, `pendingObjections`, `blockObjections`, `blockEscalated`.
- **Counters and flags:** `clarifications`, `saveAttempts`, `preferredNextStep`, `callOutcome`, `doNotCall`, `declined`, `humanRequested`, `escalated`, `saveFailed`.
- **Rules:** limits, required discovery fields, permitted next steps and objection rules from the playbook.

In controller mode it is persisted per conversation (`flow_contexts` in the store, purged with the retention policy). A retried tool call or a restart therefore resumes from the saved state.

Rules:
- A missing value is never stored as a "no".
- Consent is never inferred: `eligibility_passed` is rejected unless a recorded basis exists.
- A next step outside `next_steps.permitted` is rejected.
- There is no "booked" event at all.

## Safety limits (playbook `limits`)
| Limit | Value | When exceeded |
|---|---|---|
| `max_objection_attempts_per_topic` | 2 | Escalate to NEXT_STEP_SELECTION (offer a human follow-up) |
| `max_clarification_attempts` | 2 | Documented fallback `unresolved_intent`: permission → close; discovery, presentation and objection → next step; next step and follow-up → close |
| `max_turns_per_state` | 8 | Same `unresolved_intent` fallback (time in a state is measured in turns) |
| `max_discovery_questions` | 4 | Auto-advance to SOLUTION_PRESENTATION |
| `max_state_entries` | 4 | Re-entering a state again → NEXT_STEP_SELECTION, or CALL_SUMMARY if that is also exhausted |
| `max_tool_retries` | 2 | Outcome save is retried in CALL_SUMMARY; after that, CALL_COMPLETED with `saveFailed` recorded (never reported as saved) |
| `max_call_duration_seconds` | 600 | ElevenLabs ends the call with the Arabic max-duration message |

## Lead qualification (deterministic, backend)
The model only extracts candidate facts. `validateExtraction()` type-checks them, and `qualify()` applies the configured rules in this order:
1. do_not_call
2. not_interested
3. unreachable
4. **hot**: interest + need + concrete step
5. **warm**
6. human_follow_up_required
7. **cold**
8. unreachable (disconnected)
9. **unknown**

The model's own suggested category is ignored. Contradictions go to a human, with `needs_review`. Details: `docs/lead-qualification.md`.

## Idempotency
- Event ids are `type:conversation_id`.
- A webhook is marked processed only after every write succeeds, so ElevenLabs retries and the same ids come out.
- `open_follow_ups` prevents a second demo, information or follow-up action for the same lead across calls. This is tested end-to-end: a disconnected call, then a retry call that repeats the demo request, produces exactly one `demo.requested`.
- In-call tool calls change only conversation state, never business data. A duplicated tool call is validated like any other: in most stages it is rejected because it no longer applies.
- The ElevenLabs "start call" request is never auto-retried.

## Enforcement report

### Enforced programmatically (backend code, unit-tested: 86 tests)
- Pre-call:
  - eligibility, DNC/suppression and a recorded consent basis
  - calling hours, retries and cooldown
  - test allow-list, `confirm:true`, no bulk endpoint
- In the state machine:
  - the transition map, global DNC/disconnect, interruption/return and registry return states
  - objection priority queue, conditional and `always` escalation
  - all safety limits, the `unresolved_intent` fallback, next-step whitelist and save-retry policy
- Post-call:
  - path validation (`flow_valid`, `needs_review`), extraction type checks, contradiction and consent checks
  - final category, next action, DNC suppression first
  - `demo.requested.confirmed=false`, idempotent events, integrations disabled (`not_sent`)
- Generated artefacts:
  - workflow-vs-map equivalence tests in both modes
  - DNC edge first on every node
  - the state spec doc and KB 05 rendered from code and config

### Configured in ElevenLabs (live now)
- **9 structured procedures (type `deterministic`)**: fixed step order and verbatim lines for do-not-call, human request, pricing, case studies, integrations, AI identity, busy/callback, send information and follow-up capture.
- LLM-edge workflow (24 edges): the agent can only move along these edges. There is no path back from close or dnc, and no jump to a later stage that skips a required one.
- Per-node instructions that hide internal stage names; KB 05 attached to the objection node.
- Fixed, non-interruptible AI-disclosure first message.
- Entry behaviour: permission waits for the prospect; close and dnc speak immediately.
- 600 s cap, voicemail detection, `end_call`, language detection (ar ↔ en).
- Blocking guardrail with retry for prohibited claims.
- 25 post-call extraction fields and 7 evaluation criteria.

### Additionally enforced once controller mode is activated
- Every in-call stage change is decided by backend code, not by an LLM edge condition.
- In-call rejection of invalid moves, in-call limits and live stage guidance.

### Still depends on model behaviour
- **Classifying the prospect's words into an intent.** In LLM-edge mode this is the edge condition itself. In controller mode the model chooses one value from a fixed enum, but whether "ممكن" means interest is still the model's call. The controller limits the damage: an intent that doesn't fit the current state is rejected.
- **LLM-edge mode only:** in-call counting (question limits, "same concern twice") and the choice of registry entry. The hard versions run in the backend model and post-call validation.
- Whether a procedure's **trigger** fires and which branch is taken (both LLM-evaluated). Once a procedure starts, its steps and their order are fixed, and `say` lines are verbatim.
- Wording quality outside `say` steps, Egyptian dialect accuracy and not repeating itself.
- Post-call extraction accuracy (mitigated by strict field descriptions, validation and `needs_review`).
- The guardrail is itself an LLM classifier: it reduces prohibited claims but doesn't eliminate them.
- That the model actually calls `sales_flow_step` when it should (controller mode). If it doesn't, the stage simply doesn't advance; it can't skip ahead.

## Changing the flow
1. Edit `TRANSITIONS` / `STATE_SPECS` or `config/sales-playbook.json`.
2. `cd backend && npm test`. It fails if the workflow, the spec or the registry disagree.
3. Regenerate the derived artefacts:
   - `node scripts/render-state-spec.js > ../docs/state-spec.md`
   - `node scripts/render-objections-kb.js > ../knowledge-base/05-objection-registry.md`. Then update KB doc 05 in ElevenLabs and re-index it.
   - `node scripts/print-workflow.js <kb05DocId> [--mode controller --tool-id <id>] > ../agent/workflow[.controller].json`. Then apply it.
