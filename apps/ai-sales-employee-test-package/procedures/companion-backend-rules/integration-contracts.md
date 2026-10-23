# Integration Contracts: Email, CRM / Google Sheets, WhatsApp

**Status: prepared, not active.** All three adapters exist in `backend/src/integrations/adapters.js`, and every one has `enabled = false`. When an event fires, each subscribed adapter computes what it *would* do (`plan`). The dispatcher writes that plan to the outbox with `status: "not_sent"` and `detail: "integration_disabled"`. Nothing leaves the system. You can inspect the outbox at `GET /api/events`.

To activate an integration later, implement `execute(plan)` in that adapter and set `enabled = true`. No changes to the agent, the domain logic or the other adapters are needed.

## Event envelope (all events, version 2)
```json
{
  "id": "demo.requested:conv_abc123",   // deterministic: type + conversation → idempotent
  "type": "demo.requested",
  "version": 2,
  "occurred_at": "2026-10-19T12:04:11.000Z",
  "lead_id": "lead-123",
  "conversation_id": "conv_abc123",
  "data": { }
}
```
Validated by `validateEvent()` in `src/events/catalog.js`. Invalid events are logged and dropped. Duplicate ids are ignored. v2 replaced the property events (`property.recommended`, `viewing.requested`) with `information.requested` and `demo.requested`.

## Event catalogue
| Event | Trigger | `data` (required keys) |
|---|---|---|
| `call.completed` | Every processed post-call webhook or initiation failure | `call_outcome`, `lead_category`, `summary`, `state_path`, `flow_valid` (+ `qualification_reasons`, `next_action`, `flow_violations`, `duplicate_follow_up`, `issues`) |
| `lead.qualified` | Category `hot` or `warm` | `lead_category`, `qualification`, `reasons` |
| `lead.follow_up_requested` | Next step is a follow-up, or category `human_follow_up_required` | `next_action`, `follow_up_channel`, `callback_time`, `reason` |
| `information.requested` | Next step `information_requested` | `follow_up_channel` |
| `demo.requested` | Next step `demo_requested` / `meeting_requested` | `meeting_type`, `preferred_time`, `follow_up_channel`, `confirmed` (**always `false`**), `booking_integration` (`false` today) |
| `lead.do_not_call` | Prospect opted out | `requested_at` |

After `lead.do_not_call`, no other events are emitted for that conversation. Follow-up events are emitted once per lead per step (`open_follow_ups` dedupe across calls).

---

## A. Email (future)
**Subscribes to:** `information.requested`, `demo.requested`, `lead.follow_up_requested`
**Preconditions:** `follow_up_channel = "email"` **and** `lead.email` is present.

| Event | Template id | Content |
|---|---|---|
| `information.requested` | `ai_sales_employee_overview` | Approved product overview (no prices unless approved) |
| `demo.requested` | `demo_request_received` | "We received your demo/meeting request; our team will contact you to confirm a time." Never states a confirmed time. |
| `lead.follow_up_requested` | `follow_up_after_call` | Thanks + next step |
| *(future)* `demo.confirmed` | `demo_confirmation`, `demo_reminder` | Requires a booking system or a person; never produced by the AI |

**Requirements before go-live:** verified sending domain (SPF/DKIM/DMARC), unsubscribe link, provider key in env vars (e.g. `EMAIL_PROVIDER_API_KEY`), approved copy.

## B. CRM / Google Sheets (future)
**Subscribes to:** all events. **Dedupe key:** `upsert_key = lead_id`.

| Plan action | When | Payload |
|---|---|---|
| `upsert_lead` | any event except DNC | `lead_id, contact_name, company_name, contact_role, category, status, qualification, last_outcome, event_type` |
| `mark_do_not_call` | `lead.do_not_call` | same, status `suppressed` |

**Google Sheets mapping (one row per lead, keyed on column A):**
`lead_id | company_name | contact_name | contact_role | category | status | sales_team_size | lead_volume | current_lead_process | primary_challenge | current_crm | objections | next_action | preferred_callback_time | follow_up_channel | needs_review | flow_valid | last_conversation_id | last_summary | updated_at`

Phone numbers are not written by default. Credentials (service account / CRM API) stay server-side. Upserts are idempotent, so retry with backoff on 429/5xx is safe.

## C. WhatsApp Business (future)
**Subscribes to:** `information.requested`, `demo.requested`, `lead.follow_up_requested`
**Preconditions (enforced now):** `follow_up_channel = "whatsapp"` **and** `lead.channel_consent.whatsapp === true`; otherwise the plan is recorded as `blocked` / `no_whatsapp_opt_in`.

| Template id | Body (draft, Arabic and English versions to be approved by Meta) |
|---|---|
| `optin_confirm_v1` | "Hi {{1}}, this is {{2}}. You asked us to send details about our AI Sales Employee on WhatsApp. Reply YES to confirm or STOP to opt out." |
| `product_info_v1` | "Hi {{1}}, here is an overview of the AI Sales Employee for {{2}}: {{3}}. Reply STOP to opt out." |
| `demo_request_ack_v1` | "Hi {{1}}, we received your request for a demo around {{2}}. Our team will contact you to confirm the time. Reply STOP to opt out." |
| `follow_up_v1` | "Hi {{1}}, thanks for speaking with {{2}}. {{3}} Reply STOP to opt out." |

**Requirements:** WhatsApp Business Account, verified sender, approved templates, server-side access token.

## Adapter interface
```js
class Adapter {
  name;            // 'email' | 'crm' | 'whatsapp' | …
  subscribes;      // event types
  enabled;         // false in this phase
  plan(event, lead)  // pure → null | { action, channel, template?, payload } | { action: 'blocked', payload: { reason } }
  async execute(plan) // side effect → { status: 'sent'|'queued', external_id? }; throws on failure
}
```
The dispatcher records each result in the outbox (`not_sent`, `blocked`, `sent`, `failed`). Retries for failed sends should re-run `execute` from the outbox, never re-process the webhook.
