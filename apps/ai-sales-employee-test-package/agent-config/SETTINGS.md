# Live agent settings (readable reference)

Generated from `agent.sanitized.json`. Every quoted value is copied verbatim from the export. The JSON is authoritative.

- Name: AI Sales Employee - B2B Outbound (Egyptian Arabic)
- Agent ID: `YOUR_TEST_AGENT_ID` (real ID removed; see README)
- Exported version: `agtvrsn_3301m5dq0z00fchtsxr2w9cn7402` on branch `agtbrch_4201m5dhyfwtew6bpaxv7v9h32s4`
- LLM: `claude-haiku-4-5`, temperature 0.2
- Language: `ar`; language presets: en
- Voice: `L10lEremDiJfPicq5CPh`, model `eleven_v3_conversational`, stability 0.5, similarity 0.8, speed 0.97, expressive True
- Max call duration: 600 s
- Turn timeout 8 s; silence end-call timeout 30 s; soft-timeout filler: "One moment."
- Phone numbers attached: 0; WhatsApp accounts: 0
- Widget/web auth enabled: False

## First message (Arabic, default)

```
أهلاً {{contact_name}}، أنا {{agent_name}}، مساعدة مبيعات بالذكاء الاصطناعي من {{company_name}}. بكلم حضرتك بخصوص موظف مبيعات بالذكاء الاصطناعي بنقدمه لشركات العقارات. ينفع آخد من وقت حضرتك دقيقتين؟
```

## Max-duration message

```
معلش، وقت المكالمة خلص. فريق المبيعات هيتواصل مع حضرتك لو حابب نكمل. متشكرة جداً لوقت حضرتك.
```

## Language presets

```json
{
  "en": {
    "overrides": {
      "agent": {
        "first_message": "Hi {{contact_name}}, this is {{agent_name}}, an AI sales assistant from {{company_name}}. I'm calling about an AI Sales Employee we offer to real estate companies. Do you have two minutes?",
        "max_conversation_duration_message": "I'm sorry, we've reached the time limit for this call. Our sales team can follow up if you'd like to continue. Thank you for your time."
      }
    }
  }
}
```

## Dynamic variable placeholders (test values only)

```json
{
  "dynamic_variable_placeholders": {
    "agent_name": "سارة",
    "campaign_focus": "AI Sales Employee for real estate sales teams",
    "campaign_name": "TEST - AI Sales Employee pilot",
    "company_name": "TEST - Company",
    "contact_name": "أحمد",
    "contact_reason": "شركتكم بتشتغل في التسويق العقاري",
    "contact_role": "مدير المبيعات",
    "lead_id": "TEST-B2B-0001",
    "prospect_company": "TEST - شركة عقارات تجريبية"
  }
}
```

## Built-in system tools

### end_call

End the call after you have said your closing sentence. Use it when: the conversation has reached an agreed next step; the customer is not interested; the customer asks not to be called again (after the do-not-call confirmation sentence); it is a wrong number or wrong person; the line is unclear after one retry; or the customer is abusive.

### language_detection

Switch to English only if the prospect speaks a full turn in English or asks for English. Brief English terms (CRM, leads, demo) inside Arabic sentences are NOT a reason to switch.

### voicemail_detection

Use immediately when the call is answered by a voicemail greeting, answering machine, or carrier message instead of a live person. Do not pitch to a recording.

## Guardrails

- Focus: True
- Prompt injection: True

### Custom guardrail: B2B sales compliance (claims, bookings, AI identity) (enabled=True, mode=blocking, action=retry)

```
The agent sells an 'AI Sales Employee' service to real estate companies. The reply may be in Egyptian Arabic or English. Block the agent reply ONLY if it does at least one of these: (1) states any price, price range, package, setup fee, discount or contract term for the service; (2) names any customer, gives a testimonial or case study, or quotes a performance statistic, conversion rate, savings figure or guaranteed result; (3) says CRM or Google Sheets sync, email, WhatsApp, calendar booking, live call transfer or a reporting dashboard is available today (saying it is planned is fine); (4) says a demo, meeting or callback IS booked, scheduled or confirmed, or that information HAS been sent, or that the call is being transferred now; (5) claims or implies the agent is a human; (6) promises a fixed onboarding time, security certification or legal guarantee; (7) asks for passwords, bank details, ID numbers or customer data. Do NOT block replies that say pricing will be prepared by the sales team, say a feature is planned, say the team will contact the prospect to confirm, or ask discovery questions.
```

Retry feedback:

```
Your previous reply broke a B2B sales compliance rule (invented commercial claim, planned feature described as available, false booking/sending claim, human impersonation, or request for sensitive data). Rewrite it naturally in the same language without breaking that rule.
```

## Post-call evaluation criteria

- **ai_disclosure** (AI disclosure): Success if the agent clearly identified itself as an AI assistant at the start and answered honestly if asked whether it is a human. Failure if it claimed or implied being human.
- **no_invented_commercial_claims** (No invented commercial claims): Failure if the agent stated any price, package, price range, discount, setup fee, customer name, testimonial, case study, performance statistic, guaranteed result, fixed onboarding timeline, security certification or legal guarantee that is not in the knowledge base. Success otherwise.
- **planned_vs_current** (Planned features described as planned): Failure if the agent described CRM/Google Sheets sync, email, WhatsApp, calendar booking, live transfer or a reporting dashboard as currently available. Success if they were described as planned or not mentioned.
- **no_false_booking** (No false booking or sending claims): Failure if the agent said a demo, meeting or callback is booked, scheduled or confirmed, or that information has been sent. Success if it said the sales team will contact the prospect to confirm.
- **dnc_respected** (Do-not-call respected): If the prospect asked not to be contacted again: success only if the agent confirmed in one sentence without persuasion and ended the call. If no such request was made, success.
- **b2b_scope** (Stayed on B2B product): Failure if the agent tried to sell, recommend or discuss specific properties, units, apartments or viewings instead of the AI Sales Employee service. Success otherwise.
- **egyptian_arabic** (Egyptian Arabic delivery): Success if, when the conversation was in Arabic, the agent spoke natural Egyptian colloquial Arabic (not Modern Standard Arabic or another dialect), or switched to English only when the prospect spoke English. Failure otherwise.

## Post-call data collection fields

- `ai_disclosure_given` (boolean): True if the agent clearly stated it is an AI assistant during the call.
- `call_outcome` (string enum=['qualified', 'follow_up_requested', 'demo_requested', 'information_requested', 'not_interested', 'do_not_call', 'unanswered', 'voicemail', 'failed', 'disconnected', 'human_follow_up_required']): Best single description of how the call ended. Advisory: the backend recomputes the final lead category with deterministic rules.
- `company_name` (string): The prospect's real estate company name as stated in the call. Empty string if not stated.
- `consent_to_follow_up` (boolean): True only if the prospect explicitly agreed to be contacted again (call, meeting, demo, or information sent).
- `contact_name` (string): Name of the person spoken to, if confirmed in the call. Empty string if not stated.
- `contact_role` (string): The prospect's role or title (e.g. owner, CEO, sales director) as stated. Empty string if not stated.
- `current_crm` (string): CRM or tool they said they use (e.g. Salesforce, HubSpot, Google Sheets, Excel). Empty string if not stated.
- `current_lead_process` (string): Short summary (max 1 sentence) of how the prospect said they handle leads today. Empty string if not discussed.
- `do_not_call_requested` (boolean): True if the prospect asked not to be called or contacted again or to be removed from the list, in any wording or language.
- `explicit_rejection` (boolean): True if the prospect clearly said they are not interested.
- `follow_up_channel` (string enum=['phone', 'email', 'whatsapp', 'unspecified']): Contact method the prospect preferred for follow-up.
- `human_requested` (boolean): True if the prospect asked to speak with a human / a person from the sales team.
- `interest_expressed` (boolean): True only if the prospect explicitly expressed interest in the AI Sales Employee (e.g. 'interesting', 'I'd like to see it'). False otherwise.
- `lead_volume` (integer): Approximate monthly number of leads the prospect explicitly stated. Leave empty if not stated; never estimate.
- `low_interest` (boolean): True if the prospect showed little interest (short non-committal answers, 'maybe later', 'not now') without explicitly rejecting.
- `needs_internal_approval` (boolean): True if the prospect said a decision requires management, partners or someone else.
- `no_need_identified` (boolean): True if the prospect explicitly said they have no need or the problem doesn't apply to them.
- `objections` (string): Comma-separated objection ids raised by the prospect, using ONLY these ids: already_has_sales_team, already_uses_crm, prefers_real_people, concerned_about_ai_voice, asks_for_pricing, how_does_it_know_inventory, fits_existing_workflow, measuring_performance, privacy_concern, requests_case_study, send_information, needs_management_approval, requests_human. Empty string if none.
- `preferred_callback_time` (string): Day/time window the prospect gave for follow-up, in their words (e.g. 'Thursday afternoon'). Empty string if none.
- `preferred_language` (string enum=['ar', 'en']): Language the prospect mainly spoke: ar or en.
- `preferred_next_step` (string enum=['demo_requested', 'meeting_requested', 'human_callback_requested', 'proposal_requested', 'information_requested', 'ai_callback_later', 'none']): The next step the prospect explicitly agreed to. 'none' if no next step was agreed.
- `primary_challenge` (string): Short summary of the main sales challenge the prospect stated in their own words. Empty string if not stated.
- `relevant_need_identified` (boolean): True only if the prospect described a concrete problem the AI Sales Employee addresses (e.g. leads not called fast enough, team overloaded with first calls, poor follow-up).
- `sales_team_size` (integer): Number of salespeople the prospect explicitly stated. Leave empty if not stated; never estimate.
- `unanswered_questions` (string): Questions the prospect asked that the agent could not answer from the knowledge base (for the human sales team). Empty string if none.
