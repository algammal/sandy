# Export and Audit Report

- **Agent:** AI Sales Employee - B2B Outbound (Egyptian Arabic). It is the only agent in the workspace, so it was identified unambiguously. The real ID is redacted here as `YOUR_TEST_AGENT_ID`.
- **Exported version:** `agtvrsn_3301m5dq0z00fchtsxr2w9cn7402`, main branch.
- **Method:** read-only calls to the ElevenLabs Agents API through the owner's already-authorised ElevenLabs connector. Nothing in the agent or account was modified.
- **Original export:** kept unmodified outside this package, at `ai-sales-employee-export/original/`. It is not for sharing.

## Environment inspection
| Check | Result |
|---|---|
| ElevenLabs CLI installed | **No.** The official package `@elevenlabs/cli` 1.7.0 exists on npm. Its help was read from an isolated temporary cache; nothing was installed into any project. |
| Supported export command (from `--help`) | `elevenlabs agents pull --agent <AGENT_ID> --output-dir <dir> [--branch <id>]`. `elevenlabs auth login` authenticates (OAuth PKCE or a pasted token). |
| CLI authenticated | **No.** `auth status` → `logged_in: false`. There is no CLI config in the home directory and no ElevenLabs API key in the environment. No credentials were requested. |
| Alternative used | The authorised ElevenLabs connector (read-only API calls). |

## Status of each audit item

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Agent configuration exported | **VERIFIED** | Full agent document saved byte-for-byte from the API response (sha256 `baffa06a…dd231b` in the original export). The sanitized copy is identical except for the agent ID and `access_info` (verified programmatically). |
| 2 | Complete system prompt preserved | **VERIFIED** | `system-prompt.live.md` is equal to the exported prompt string (4,749 characters), checked programmatically. **Note:** the live prompt differs from the companion repo's copy; see `agent-config/PROMPT_DRIFT.md`. |
| 3 | All available sales procedures preserved | **VERIFIED** (live agent) / **PARTIAL** (overall) | All 9 structured procedures were exported. Every `say`, `ask`, `tell`, translation and branch condition was checked against the byte-exact compiled-workflow export: 0 mismatches. All 8 workflow-node instructions and 24 edge conditions are exported verbatim. PARTIAL overall because some procedures exist only outside the agent (pre-call checks, suppression, deterministic qualification, loop limits) or are missing; see `procedures/COVERAGE.md`. |
| 4 | Knowledge-base contents recovered | **VERIFIED** | All 5 attached documents were recovered as full text. Each file's byte length equals the server-reported `size_bytes`, and the text matched the API response on review. There are no uploaded files or URL sources. |
| 5 | Tools and external resources | **VERIFIED** (inventory) | Included: built-in `end_call`, `language_detection`, `voicemail_detection`. There are no custom tools. Not deployed (template only): `sales_flow_step`. Missing in the live setup: phone number, post-call webhook, CRM, email, WhatsApp and calendar integrations. |
| 6 | Secrets and personal information | **VERIFIED** (scan) | No API keys, tokens, webhook secrets, cookies or private keys were found in the export or in the companion repo's git history (4 commits scanned). **Removed from the sanitized copy:** the owner's name and email (`access_info` and test metadata) and the real agent ID. **Excluded:** conversation transcripts (the agent shows 5 recent calls; none were exported) and the CLI auth files (none exist). Test personas (أحمد, منى, Omar…) are fictional placeholders. |
| 7 | Package reviewable locally | **VERIFIED** | Plain JSON and Markdown; readable references are generated from the exported data. |
| 8 | Package runnable locally | **PARTIAL** | The **companion backend** runs: `cd companion-backend && npm test` → 86/86 tests pass inside the packaged copy (Node 22, no network, no dependencies). The **voice agent is NOT runnable locally**: it needs the ElevenLabs hosted runtime. |
| 9 | Features requiring an external runtime | **VERIFIED** (listed) | Speech and voice, conversation behaviour, edge and procedure triggering, guardrails, post-call analysis, the 6 simulation tests (ElevenLabs). Outbound calls (ElevenLabs + telephony). End-to-end webhook processing (deployed backend). |
| 10 | Manual actions before sharing | see below | |
| - | ElevenLabs simulation tests | **NOT TESTED** | The 6 B2B test definitions are exported but have **never been run** (no credits). The 13 legacy "RE-xx" property tests were not exported; they belong to the superseded consumer property-sales setup. |
| - | Test scenarios in `tests/SCENARIOS.md` | **NOT TESTED** (against the live agent) | They are documents, not results. Backend-testable parts are covered by the 86 passing unit tests. |

## Findings that need the owner's attention
1. **Prompt drift.** The live prompt lacks rule 13 and the "Interruptions and unclear answers" section, which exist in the version last pushed from code. Confirm which version is intended. This export preserves the live version unchanged.
2. **Agent web auth is disabled** (`platform_settings.auth.enable_auth: false`). Anyone who knows the agent ID could start web or SDK conversations that consume your credits. The ID is redacted here, but you should consider enabling authentication. **Not changed** by this export.
3. **Leftover English filler.** The soft-timeout filler is the English "One moment." in an Arabic agent. Reported only; not changed.
4. **Legacy tests.** 13 legacy property-sales simulation tests remain in the workspace.

## Manual actions before sharing
1. Review `agent-config/PROMPT_DRIFT.md` and decide whether the live prompt is the intended one.
2. Skim the package yourself, especially `agent-config/SETTINGS.md` and the test personas, to confirm nothing should be withheld.
3. Run the final check in `SHARING.md` (secret scan + `git log`) after `git init`, before any push.
4. If the tester needs to run the agent, create a **separate test agent or workspace** with its own test credits. Never share your account, API key or production agent.
5. Optional, recommended: enable agent authentication in ElevenLabs (finding 2).

## Re-export with the official CLI (optional, for your own verification)
On your machine, not in this package:
```bash
npm install -g @elevenlabs/cli        # or: npx @elevenlabs/cli@1.7.0 ...
elevenlabs auth login                 # interactive; never paste keys into chats or files you share
mkdir agent-export && cd agent-export
elevenlabs agents init
elevenlabs agents pull --agent YOUR_AGENT_ID --output-dir agent_configs
```
Keep that output private. It may contain account-bound data; sanitize it the same way before sharing.
