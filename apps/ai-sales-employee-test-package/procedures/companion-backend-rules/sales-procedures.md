# Sales Procedure: AI Sales Employee (B2B)

The agent calls **real estate companies** (owners, CEOs, sales directors, marketing managers) to offer our **AI Sales Employee** service. It never sells properties.

The procedure is not free-form: it is implemented as the state machine in `docs/state-machine.md` and deployed as the ElevenLabs workflow `agent/workflow.json`. Each step below is one workflow node with its own instructions.

| # | Step | Node | What the agent does | Must never |
|---|---|---|---|---|
| 1 | Introduction & AI disclosure | first message | "أهلاً {{contact_name}}، أنا {{agent_name}}، مساعدة مبيعات بالذكاء الاصطناعي من {{company_name}}…" | Pretend to be human |
| 2 | Permission | `permission` | Waits for the answer. Busy → asks for a better time. | Pitch before permission |
| 3 | Discovery | `discovery` | One question per turn, max 4: how leads are handled today, main challenge; optionally team size, lead volume, CRM | Ask for confidential data, repeat answered questions |
| 4 | Solution presentation | `presentation` | ≤2 benefits tied to *their* challenge, current capabilities only, supports (not replaces) their team | Prices, guarantees, case studies, 24/7, planned features as available |
| 5 | Objection handling | `objection` | Match the concern to KB doc 05 (13 registry entries), use that strategy + required disclosure, ask its follow-up question, return | Argue; repeat the same pitch; second time → offer human |
| 6 | Qualification | backend, post-call | hot / warm / cold / unknown (+ do_not_call, not_interested, unreachable, human_follow_up_required) | — (the agent does not announce a category) |
| 7 | Next step | `next_step` → `follow_up` | Offer one: demo, meeting with decision maker, human callback, information, later call. Capture time window + channel. | Say anything is booked/confirmed or sent |
| 8 | Close | `close` | One-sentence recap, thanks, `end_call` | New questions, re-pitch |
| — | Do-not-call (any time) | `dnc` | One sentence confirming no further calls, `end_call`; backend suppresses the number | Persuade |

## Language
Egyptian Arabic (Masri), female self-reference, "حضرتك". Switches to English (language preset + `language_detection`) only if the prospect speaks or requests English.

## Approved / prohibited claims
See `backend/config/sales-playbook.json` (`approved_claims`, `prohibited_claims`, `escalation_criteria`), rendered into KB doc 05. Pricing, company details and onboarding duration are **NOT PROVIDED** in the KB; the agent offers the sales team instead.
