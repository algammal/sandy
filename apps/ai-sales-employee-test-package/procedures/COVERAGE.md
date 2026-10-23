# Procedure coverage matrix

Categories:
- **(1) DEFINED IN SOURCE**: explicitly defined in the live ElevenLabs agent export: system prompt, workflow nodes and edges, structured procedures, built-in tools, guardrail, analysis settings.
- **(2) DEFINED ELSEWHERE**: referenced by the agent or required for the product, but stored outside the dashboard agent: in a knowledge-base document, or in the companion backend (`companion-backend/`, `procedures/companion-backend-rules/`).
- **(3) INFERRED / MISSING**: not defined anywhere in the exported sources, or defined only as model instructions with no enforcement. Nothing was added to fill these gaps.

| Procedure area | Category | Where (exact location) | Notes |
|---|---|---|---|
| Initial call preparation and pre-call checks | (2) | `companion-backend/src/domain/eligibility.js`; `procedures/companion-backend-rules/state-spec.md` (PRE_CALL_CHECK) | Consent basis, DNC/suppression list, calling hours, retry limits, test allow-list, `confirm:true`. **Not part of the dashboard agent**, which cannot check eligibility itself. |
| Call initiation | (2) + (3) | Backend `startCall()` (ElevenLabs outbound-call API) | **MISSING in the live setup:** no phone number is attached to the agent and no backend is deployed, so no outbound call can be initiated today. |
| AI identity disclosure | (1) | First message (`SETTINGS.md`), not interruptible; prompt rule 1; structured procedure "Are you a robot / real person?"; guardrail rule (5); evaluation `ai_disclosure` | Also in KB02 and KB04. |
| Permission to continue | (1) | Workflow node `permission` (`wait_for_user`) and its 4 edges; prompt "Conversation structure" step 2; structured procedure "Busy - call back later" | |
| Do-not-call requests and termination | (1) + (2) | Prompt rule 2; node `dnc`; `*_to_dnc` edges, evaluated first from every node; structured procedure "Do-not-call request" (verbatim sentence, then `end_call`); `end_call` tool description; evaluation `dnc_respected` | **(2):** permanent number suppression happens in the companion backend after the call (`outcome.js`, `app.js`). The dashboard agent alone only ends the call. |
| Discovery and needs assessment | (1) | Node `discovery`; edge `discovery_to_presentation` (2 required facts or 4 questions) | |
| Solution presentation | (1) | Node `presentation`; prompt "What you sell", rule 5 | Uses KB01 and KB02. |
| Objection handling | (1) + (2) | Node `objection` (KB05 attached); structured procedures "Pricing question", "Case studies...", "Integration question", "Send me information"; prompt rules 4 and 11 | **(2):** the 13 approved strategies, priorities and escalation rules live in **KB05** (generated from `sales-playbook.json`). |
| Lead qualification | (1) + (2) + (3) | **(1):** 25 post-call data-collection fields (`SETTINGS.md`). **(2):** deterministic hot/warm/cold/unknown rules in `companion-backend/src/domain/qualification.js` and `lead-qualification.md`. | **(3):** there is **no in-call qualification stage** in the live workflow. Classification only happens after the call, and only if the backend processes the post-call webhook. That webhook is not configured. |
| Next-step selection | (1) | Node `next_step`; edges `next_step_to_follow_up` and `next_step_to_close` | |
| Demo or meeting requests | (1) | Node `next_step`; node `follow_up`; procedures "Pricing question" and "Case studies" (yes-branch); prompt rule 6 ("never say booked") | **Booking is not supported:** there is no calendar integration (KB02 PLANNED). Requests are captured, never confirmed. |
| Follow-up information capture | (1) | Node `follow_up`; structured sub-procedure "Follow-up capture" | Delivering the follow-up (email, WhatsApp, CRM) is **not implemented** (planned). |
| Call summaries | (1) + (2) | Node `close` (one-sentence verbal recap); ElevenLabs post-call summary (`summary_language: en`) | **(2):** structured outcome storage is in the companion backend. |
| Call completion | (1) | Node `close` (`end_call`); `end_call` tool; max duration 600 s with an Arabic max-duration message; 30 s silence hang-up | |
| State transitions | (1) + (2) | **(1):** authored workflow, 8 nodes + start, 24 edges, LLM-evaluated conditions (`PROCEDURES.md` §2). **(2):** explicit 13-state machine in `companion-backend/src/domain/state-machine.js` and `state-spec.md`. | The live agent's transitions are LLM-judged. The backend's deterministic controller mode is **not deployed**. |
| Loop prevention | (1) instruction-only + (2) | **(1):** prompt rule 11; node `objection` ("same concern twice → human follow-up"); discovery "at most 4 questions". **(2):** numeric limits in `sales-playbook.json` (`max_objection_attempts_per_topic`, `max_turns_per_state`, `max_state_entries`, `max_clarification_attempts`). | **(3):** in the live agent these limits are model instructions only. Code enforces them only in the backend. |
| Error handling and unsupported requests | (1) + (3) | Prompt rule 10 (unknown answer → say not confirmed, offer the sales team); "Voicemail and wrong person" section; `voicemail_detection`; "What you sell" (property-buying requests) | **(3) DRIFT:** the prompt section "Interruptions and unclear answers" (clarification limit, return-after-interruption, "maybe is not agreement") is **absent from the live prompt** but present in the repo copy (`agent-config/PROMPT_DRIFT.md`). With no custom tools, there is no in-call tool-failure handling to define. |
| Restrictions on promises, pricing claims and business actions | (1) + (2) | Prompt rules 3-8; custom guardrail "B2B sales compliance" (blocking, retry); evaluations `no_invented_commercial_claims`, `planned_vs_current`, `no_false_booking`; structured procedures' verbatim lines | **(2):** KB03 (pricing NOT PROVIDED, approved price answer), KB05 ("Claims you must never make"). |

## Summary of gaps (category 3)
1. No outbound calling path in the live setup: no phone number and no deployed backend.
2. No in-call lead-qualification stage; post-call classification depends on a backend webhook that is not configured.
3. Loop and attempt limits are not enforced by code in the live agent.
4. The live prompt is missing the "Interruptions and unclear answers" section and rule 13 that exist in the repo copy. The owner must confirm which version is intended.
5. Number suppression after a do-not-call request requires the companion backend (not deployed).
