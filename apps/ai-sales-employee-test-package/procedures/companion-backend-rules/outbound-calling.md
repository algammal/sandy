# Outbound Calling: Setup, Safeguards and Rollout

## What the connector could and could not do
| Capability | Status |
|---|---|
| Create and configure agent, prompt, voice, turn-taking, guardrails | ✅ Done through the connector |
| Knowledge base documents, folder and RAG indexes | ✅ Done |
| Native workflow (state machine) | ✅ Applied (9 nodes, 24 edges); old property procedures removed |
| Post-call analysis: lead schema and evaluations | ✅ Done |
| Simulation tests | ✅ Created (B2B-01…06); ⏸ not run: account has 0 credits |
| Import or buy a phone number | ❌ Not available in the connector. Dashboard only. |
| Place an outbound call | ❌ Not available in the connector. Done by the backend through the ElevenLabs REST API. |
| Configure the post-call webhook | ❌ Workspace setting in the dashboard; needs a public backend URL |
| Transfer to a human line | ⏸ Possible, but needs your sales team's phone number |

## Steps you need to complete
1. **Telephony.** In ElevenLabs › Phone Numbers, import a Twilio number (Account SID and auth token) or a SIP trunk. Assign it to **AI Sales Employee - B2B Outbound (Egyptian Arabic)**. Copy the phone number id into `ELEVENLABS_PHONE_NUMBER_ID`, and set `ELEVENLABS_TELEPHONY_PROVIDER` to `twilio` or `sip_trunk`.
2. **API key.** Create an ElevenLabs API key with Conversational AI access. Put it in `ELEVENLABS_API_KEY` on the server only.
3. **Deploy the backend** (`backend/`) somewhere with HTTPS, e.g. a small VM or container service. Set the env vars from `.env.example`.
4. **Post-call webhook.** In ElevenLabs workspace settings › Webhooks, create a webhook to `https://<your-host>/webhooks/elevenlabs`. Enable the *transcription* (post-call) and *call initiation failure* events. Copy the signing secret into `ELEVENLABS_WEBHOOK_SECRET`. Attach the webhook to the agent as its post-call webhook.
5. **Fill the knowledge base.** Replace the `NOT PROVIDED` items (company name and contact details, pricing approach, onboarding duration, legal entity) in KB docs 03 and 04. Do this in the dashboard, or update the docs from the edited files in `knowledge-base/`. Re-index RAG afterwards. Objection strategies are edited in `backend/config/sales-playbook.json` and rendered into doc 05.
6. **Controller mode.** Set `SALES_FLOW_TOOL_SECRET`, create the `sales_flow_step` tool and apply `agent/workflow.controller.json`. Steps: `docs/state-machine.md` › Activating controller mode.
7. **Optional human transfer.** Give me (or set in the dashboard) the sales line number to enable `transfer_to_number`. Then mark live transfer as current in the playbook and KB doc 02.

## Safety switches (backend)
| Switch | Default | Effect |
|---|---|---|
| `CALL_MODE=disabled` | ✅ default | No calls can be placed at all |
| `CALL_MODE=test` | | Only numbers in `TEST_ALLOWLIST` |
| `CALL_MODE=live` | | Eligible leads in campaigns with `compliance_approved: true` |
| `DRY_RUN=true` | ✅ default | Every check runs and the response shows the exact request (masked number), but ElevenLabs is never called |
| `confirm: true` | required | Each `POST /api/calls` must explicitly confirm |

There is **no bulk-dial endpoint**. Each call is one authenticated, confirmed request for one lead. A campaign runner, if you add one later, should loop over leads calling this same endpoint, so every safeguard still applies.

## Retry and voicemail policy (per campaign)
- `max_attempts` (1–5, default 3), `min_hours_between_attempts` (default 4).
- Voicemail: the agent hangs up without leaving a message, and the lead stays `retry_scheduled` until attempts run out (`exhausted`).
- Invalid number on initiation failure → `invalid_number`, no retries.
- After a real conversation, no re-call for `cooldown_days_after_conversation` (default 7) unless the customer asked to be called back.
- The ElevenLabs API call itself is **never auto-retried**: a timeout may already have rung the customer.

## Rollout plan
1. **Dry run:** `CALL_MODE=test`, `DRY_RUN=true`. Import 1–2 test leads with your own numbers and confirm `POST /api/calls` returns the expected preview.
2. **Authorised test calls:** set `DRY_RUN=false` and keep `CALL_MODE=test` with only team members' numbers in `TEST_ALLOWLIST`. Run the manual checklist in `test-plan.md`. Confirm the webhook updates the lead and the outbox shows `not_sent` entries.
3. **Pilot:** after legal sign-off on KB doc 04 and the B2B calling basis (`legitimate_business_interest` must be confirmed for your jurisdiction; Egypt and any other target country), set the campaign's `compliance_approved: true` and `CALL_MODE=live`. Call a small, hand-picked list of 20–50 leads with a recorded legal basis. Review every conversation's evaluation results in ElevenLabs.
4. **Expand** only when evaluation pass rates are consistently high, with no DNC or fabrication failures.

## Example API usage
```bash
TOKEN=…   # ADMIN_API_TOKEN
curl -X POST https://<host>/api/campaigns -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d @campaigns.example.json
curl -X POST https://<host>/api/leads -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{
  "id":"lead-001","name":"Test User","company_name":"TEST Developments","contact_role":"Sales Director",
  "phone":"+15550000001","timezone":"Africa/Cairo",
  "contact_reason":"you asked about AI sales tools at a real estate event",
  "consent":{"basis":"existing_enquiry","recorded_at":"2026-10-01","source":"website form"}}'
curl -X POST https://<host>/api/calls -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"lead_id":"lead-001","campaign_id":"ai-sales-employee-pilot","confirm":true}'
curl https://<host>/api/leads/lead-001 -H "Authorization: Bearer $TOKEN"
curl https://<host>/api/events -H "Authorization: Bearer $TOKEN"
```
A blocked call returns HTTP 422 with every reason, e.g. `{"error":"Lead is not eligible to be called","reasons":["outside_calling_hours"]}`.

## Security notes
- The API key, webhook secret and admin token live only in server env vars. The repo has `.env.example` placeholders only.
- The webhook verifies the HMAC signature with a 30-minute timestamp tolerance and a constant-time compare. Only conversations this backend started can update a lead.
- Admin routes need a bearer token (constant-time compare). API responses mask phone numbers. Logs contain ids, never names, phone numbers or transcripts.
- Request bodies are capped at 1 MB. All lead fields are validated and length-limited.
- The data store file is written with mode 600. `DATA_RETENTION_DAYS` purges old call records, events and outbox entries at startup.
- The JSON store is fine for a pilot on a single instance. For multiple instances or larger volumes, move to a database by implementing the same `JsonStore` method set.
