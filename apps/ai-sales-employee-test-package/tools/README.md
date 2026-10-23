# Tools

| Tool | Type | Status in the live agent |
|---|---|---|
| `end_call` | ElevenLabs built-in system tool | ENABLED (description in `built-in-system-tools.json`) |
| `language_detection` | ElevenLabs built-in system tool | ENABLED (Arabic to English switching) |
| `voicemail_detection` | ElevenLabs built-in system tool | ENABLED (hang up, no message) |
| Custom webhook / client / MCP tools | - | **None.** `tool_ids` is empty and the workspace has no tools used by this agent. |
| `sales_flow_step` (controller mode) | Webhook tool **template** | **NOT DEPLOYED.** Exists only as a template in the companion repo. It needs a deployed backend. The URL and secret are placeholders (`REPLACE-WITH-...`). |

The live agent has no CRM, email, WhatsApp, calendar or live-transfer integration. These are planned and described as planned in the knowledge base.
