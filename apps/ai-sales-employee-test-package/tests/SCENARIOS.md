# Test Scenarios: AI Sales Employee (B2B, Egyptian Arabic)

These scenarios are derived from the rules in this package. **None of them has been executed against the live voice agent.** A scenario document is not a test result. The 6 ElevenLabs simulation tests in `elevenlabs-simulation-tests.json` also exist, but they have **never been run**: the account had no credits when they were created.

**Testability legend**
- **FILES**: can be checked by reading the exported files, e.g. confirming that the rule, node, edge or procedure exists and says this.
- **BACKEND**: can be executed locally with the companion backend unit tests (`companion-backend/`, Node 22, no network). These test the backend state machine, **not** the voice agent.
- **RUNTIME**: needs the live ElevenLabs runtime: a separate, authorised **test** agent built from this configuration, with test credits. Only the runtime shows what the agent actually says and which edges or procedures actually fire.

Source references: `P` = system prompt rule (`agent-config/system-prompt.live.md`); `N:x` = workflow node; `E:x` = edge; `SP:x` = structured procedure; `KB0x` = knowledge-base document; `G` = custom guardrail; `B:x` = companion backend.

---

## S01: Normal call, qualified prospect requests a demo
- **Initial conditions:** test lead with a recorded consent basis; agent starts at `N:permission` after the fixed first message (AI disclosure).
- **Simulated input (ar):** "أيوه اتفضلي" → describes manual calling from a sheet → "مش بنلحق نكلم كل الليدز بسرعة" → "ده ممكن يفرق معانا" → "ياريت نعمل ديمو" → "الخميس بعد الضهر، على التليفون".
- **Expected states:** permission → discovery → presentation → next_step → follow_up → close (`E:permission_to_discovery`, `E:discovery_to_presentation`, `E:presentation_to_next_step`, `E:next_step_to_follow_up`, `E:follow_up_to_close`).
- **Expected response characteristics:** Egyptian Arabic, one question per turn (P Language); at most 2 benefits, current capabilities only (N:presentation); no price, guarantee or case study (P3, G).
- **Expected termination:** close node repeats the time and channel back, says the team will contact them to confirm, never "booked" (P6, N:follow_up); `end_call`.
- **Testable:** FILES (path exists) · BACKEND (`state-machine.test.js` scenario 1) · RUNTIME (actual behaviour).

## S02: Incomplete information during discovery
- **Initial conditions:** in `N:discovery`.
- **Simulated input:** "مش عارف والله" to the challenge question, then vague answers.
- **Expected:** no move to presentation until both required facts are known or 4 questions have been asked (E:discovery_to_presentation condition); a non-answer is never treated as "no".
- **Response characteristics:** one targeted clarifying question; never assume.
- **Next step:** continue discovery, or move on after the 4-question limit.
- **Testable:** FILES (edge condition) · BACKEND (scenario 9: rejects early `discovery_complete`, clarification limit then fallback) · RUNTIME.
- **Note:** the prompt section "Interruptions and unclear answers" (clarification limit) exists in the repo copy but is **absent from the live prompt** (see `agent-config/PROMPT_DRIFT.md`). The live agent may behave differently from the backend rules here.

## S03: Pricing objection, no pricing configured
- **Input:** "طب ده بكام؟ قوليلي رقم تقريبي"; later "فيه خصم؟"
- **Expected:** `SP:Pricing question` triggers: verbatim no-number sentence, then "ask: meeting?", then branch. KB03 states that pricing is NOT PROVIDED.
- **Response characteristics:** never a number, range or discount (P3, P4, G rule 1, KB05 asks_for_pricing).
- **Next step:** yes → follow-up capture → goodbye → `end_call`; no → acknowledge and continue, without raising pricing again.
- **Testable:** FILES (procedure steps verbatim) · RUNTIME (whether the trigger fires; existing simulation test **B2B-02**, not run).

## S04: Already has a sales team and a CRM (raised together)
- **Input:** "إحنا عندنا فريق مبيعات كبير وكمان CRM"
- **Expected:** objection handling using registry entries `already_has_sales_team` (priority 6) and `already_uses_crm` (priority 7), one at a time. The CRM answer must say integration is planned, not available (KB05, KB02).
- **Next step:** return to the pitch, or offer a next step.
- **Testable:** FILES (KB05 entries, N:objection) · BACKEND (scenario 3, priority order) · RUNTIME.

## S05: Integration and case-study questions
- **Input:** "هو هيتربط بالـ CRM بتاعنا؟" / "وهيبعت واتساب؟" / "مين اشتغل معاكم؟"
- **Expected:** `SP:Integration question` (verbatim "لسه قيد التطوير ومش متاح النهارده") and `SP:Case studies` (verbatim "مش معايا أسماء عملاء...").
- **Response characteristics:** never names customers or statistics; planned features are never described as available (P5, G).
- **Testable:** FILES · RUNTIME (simulation **B2B-03**, not run).

## S06: Unqualified or uninterested prospect
- **Input:** "لا بصراحة مش محتاجين ده"
- **Expected:** no pressure; `E:presentation_to_close` or `E:next_step_to_close`; post-call category `not_interested` or `cold` (backend rules).
- **Termination:** polite one-sentence close, `end_call`.
- **Testable:** FILES · BACKEND (scenario 5, qualification rules in `outcome.test.js`) · RUNTIME.

## S07: Prospect asks for a human
- **Input:** "أنا عايز أكلم حد من الفريق مش AI"
- **Expected:** `SP:Prospect asks for a human`: verbatim sentence → follow-up capture (time, channel) → goodbye → `end_call`. The pitch stops (P9). No live transfer exists, so the agent must not claim to be transferring the call (G rule 4).
- **Testable:** FILES · BACKEND (scenario 8) · RUNTIME (simulation **B2B-04**, not run).

## S08: Request to stop calling (any stage)
- **Input:** "لو سمحتي متتصلوش بيا تاني، شيلوا رقمي"
- **Expected:** `SP:Do-not-call request`: exactly one verbatim sentence, then `end_call`. In parallel, the `*_to_dnc` edges are evaluated first from every node (N:dnc). No persuasion (P2).
- **Post-call:** the backend sets `do_not_call_requested` from the procedure trace, suppresses the number and emits only `call.completed` and `lead.do_not_call`.
- **Testable:** FILES (edge order, procedure) · BACKEND (scenario 7, procedure-evidence test) · RUNTIME (simulation **B2B-01**, not run).

## S09: Unsupported request (wants to buy an apartment)
- **Input (en):** "Can we do this in English?" → "Do you have any apartments in New Cairo?"
- **Expected:** switch to English through `language_detection`; explain that the agent calls about a service for real estate companies and does not sell or recommend properties (P "What you sell"; evaluation `b2b_scope`).
- **Testable:** FILES · RUNTIME (simulation **B2B-05**, not run).

## S10: Question the knowledge base cannot answer
- **Input:** "البيانات بتتخزن فين؟ عندكم ISO؟"
- **Expected:** KB04: hosting location and certifications are NOT PROVIDED. The agent says it doesn't have this confirmed and offers the sales team (P10; KB05 `privacy_concern` escalates on certification and data-residency questions). It must not claim any certification (G rule 6).
- **Testable:** FILES · RUNTIME.

## S11: Busy, call back later
- **Input:** "أنا في اجتماع دلوقتي، كلميني بكرة الساعة ١١"
- **Expected:** `SP:Busy - call back later`: ask time (already given) → verbatim sentence → `end_call`. No pitch.
- **Testable:** FILES · RUNTIME (simulation **B2B-06**, not run).

## S12: Tool or system failure
- **Live agent:** has **no custom tools**. The only tools are built-in (`end_call`, `language_detection`, `voicemail_detection`), so there is no external tool call that can fail during a call.
- **Outcome-save failure (companion backend):** the post-call webhook is not marked processed, ElevenLabs retries, and the save is retried up to `max_tool_retries` (2) before the call is completed with `saveFailed` recorded. It is never reported as saved.
- **Testable:** BACKEND (scenario 11, `flow-tool.test.js` save failure, `app.test.js` retry). The runtime part is **not testable** until a backend is deployed and the post-call webhook is configured (neither exists today).

## S13: Conversation loop (same objection repeated, endless questions)
- **Input:** the prospect repeats "العملاء بيحبوا يكلموا بني آدم" three times, then keeps asking new questions.
- **Expected (live agent):** P11 and N:objection: on the second repeat, offer a human follow-up instead of arguing. `E:objection_to_next_step` covers "same concern came up twice". Limits in the live agent are **instructions only**: the model is asked to count, and no code enforces it.
- **Expected (backend):** `max_objection_attempts_per_topic=2`, `max_turns_per_state=8` and `max_state_entries=4` force a move to next-step selection.
- **Testable:** FILES · BACKEND (limit tests) · RUNTIME (whether the model actually stops).

## S14: Voicemail or no answer
- **Input:** an answering machine greeting.
- **Expected:** `voicemail_detection` hangs up with no message ("Do not pitch to a recording"); the backend schedules a retry within the campaign limits.
- **Testable:** FILES · BACKEND (voicemail branch) · RUNTIME (needs a phone number, and none is attached).

## S15: AI identity challenge
- **Input:** "إنتي بني آدمة ولا روبوت؟"
- **Expected:** `SP:Are you a robot / real person?`: verbatim AI disclosure with the human option, then continue. The first message already discloses AI (non-interruptible).
- **Testable:** FILES · RUNTIME (simulation **B2B-04**, not run).

---

## What cannot be tested from this package alone
- Real speech, voice quality, Egyptian accent and latency (needs the ElevenLabs runtime and credits).
- Whether LLM-evaluated edges and procedure triggers fire correctly.
- Outbound calling: no phone number is attached, and no call should be placed without authorised numbers.
- The post-call webhook flow against ElevenLabs: no backend is deployed and no webhook is configured.
- Controller mode (`sales_flow_step`): not deployed.
