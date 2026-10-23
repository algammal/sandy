# AI Sales Employee: Source and Configuration Test Package

This is a **source-only review package** for an ElevenLabs Conversational AI agent called **"AI Sales Employee - B2B Outbound (Egyptian Arabic)"**.

> **This package does not contain a runnable voice agent.** The agent runs only on the ElevenLabs hosted runtime. The package lets you inspect the agent's exact configuration, instructions, procedures, knowledge base and test scenarios locally, and run the **companion backend's** unit tests. It does **not** grant access to the owner's ElevenLabs account, API keys, phone numbers, conversations or integrations.

## What the agent is
An AI-powered **voice sales representative that is sold to real estate companies** (B2B). It does **not** sell properties to consumers. It calls decision makers at real estate companies to introduce the "AI Sales Employee" service: an AI that holds first sales conversations with a company's buyer leads, answers from the company's approved information, qualifies leads and hands serious buyers to the human sales team.

**Target audience of the calls:** real estate company owners, CEOs, sales directors, business development managers and lead-generation managers.

**Persona and language:** female AI assistant "سارة" speaking Egyptian Arabic (Masri), with English switching. It always discloses that it is an AI.

## Current capabilities (as configured)
- Outbound-style B2B sales conversation in Egyptian Arabic, with English through language detection.
- A fixed AI-disclosure opening; a staged workflow: permission → discovery → presentation ⇄ objection handling → next step → follow-up capture → close, plus a do-not-call exit from every stage.
- 9 **structured (deterministic) procedures** with fixed step order and verbatim lines: do-not-call, human request, pricing, case studies, integrations, AI identity, busy/callback, send information, follow-up capture.
- Knowledge-base-grounded answers (5 documents) with explicit "NOT PROVIDED" facts it must never invent.
- A blocking compliance guardrail (no prices, testimonials, planned-as-available features, false bookings, human impersonation or sensitive-data requests).
- Post-call analysis: 25 extraction fields and 7 evaluation criteria.

**Not available (planned):** CRM/Google Sheets sync, email, WhatsApp, calendar booking, live transfer, reporting dashboard. **No phone number** is attached to the agent.

## Package contents

| Path | Purpose |
|---|---|
| `agent-config/agent.sanitized.json` | Full exported agent configuration (live version `agtvrsn_3301m5dq0z00fchtsxr2w9cn7402`), with only the agent ID and owner identity redacted |
| `agent-config/system-prompt.live.md` | The exact live system prompt |
| `agent-config/PROMPT_DRIFT.md` | **Read this.** The live prompt differs from the last version in the companion repo |
| `agent-config/workflow.authored.json` | The authored conversation workflow (8 stage nodes, 24 edges) |
| `agent-config/workflow.compiled-with-procedures.json` | The workflow as ElevenLabs compiles it, including the structured-procedure nodes |
| `agent-config/SETTINGS.md` | Readable reference: first message, voice, language presets, built-in tools, guardrail, evaluations, data-collection fields (verbatim) |
| `procedures/PROCEDURES.md` | **Full procedures, verbatim**: system prompt, every workflow node instruction, every transition condition, every structured procedure step |
| `procedures/structured/*.json` | The 9 structured procedures as exported |
| `procedures/COVERAGE.md` | Which procedures are defined in the agent, defined elsewhere, or missing |
| `procedures/companion-backend-rules/` | Rules defined **outside** the dashboard agent: 13-state machine, per-state spec, qualification rules, sales playbook, calling safeguards, integration contracts |
| `knowledge-base/` | The 5 knowledge-base documents (full text) and `MANIFEST.md` |
| `tools/` | Built-in system tools; a template for an **undeployed** controller-mode tool |
| `tests/SCENARIOS.md` | 15 scenarios with expected states and testability |
| `tests/elevenlabs-simulation-tests.json` | 6 ElevenLabs simulation test definitions (**never run**) |
| `companion-backend/` | Node 22 backend (zero dependencies): eligibility, state machine, qualification, webhook processing, with 86 unit tests |
| `EXPORT_REPORT.md` | Audit report: what was exported, verified, missing or not tested |

## How to review locally
1. Start with `procedures/COVERAGE.md`, then `procedures/PROCEDURES.md` and `agent-config/PROMPT_DRIFT.md`.
2. Read `knowledge-base/` for every fact the agent is allowed to state.
3. Compare `tests/SCENARIOS.md` against the rules.
4. Optional: run the companion backend tests. You need Node.js 22 or later; no network, API keys or installation are required:
   ```bash
   cd companion-backend
   npm test
   ```
   These tests exercise the **backend** state machine and rules, not the voice agent.

## What requires the ElevenLabs hosted runtime
Everything the agent actually **says and does in a call** needs the runtime:
- speech and voice;
- whether workflow edges and procedure triggers fire;
- guardrail behaviour;
- post-call analysis;
- the simulation tests.

To test it, the owner must provide **a separate test agent** (for example a duplicate in a test workspace) with test credits. The tester then imports this configuration there or receives scoped access to it. The production agent and account are never shared.

## Cannot be tested without authorised access to a separate test agent
- Voice quality and Egyptian accent.
- Real conversation behaviour and the 6 simulation tests.
- Outbound calling: needs a test phone number and only authorised numbers. No bulk calling.
- The end-to-end post-call webhook into the backend: no backend is deployed and no webhook is configured.
- Controller mode (`sales_flow_step` webhook tool): not deployed.

## Dependencies and limitations
- Running the companion backend tests needs Node.js 22 or later. No npm packages are needed.
- Exported with the ElevenLabs Agents API through the owner's authorised connector. The ElevenLabs CLI (`elevenlabs agents pull`) was not authenticated in the export environment (see `EXPORT_REPORT.md`).
- IDs of knowledge-base documents, procedures and versions are kept so cross-references stay intact. They are not credentials and grant no access on their own.
