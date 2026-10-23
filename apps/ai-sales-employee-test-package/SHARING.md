# Preparing a PRIVATE GitHub repository (manual steps)

Nothing has been published, pushed, uploaded or shared. Do these steps yourself.

## Files intended for sharing
Everything in this directory:
- `README.md`, `EXPORT_REPORT.md`, `SHARING.md`, `.gitignore`
- `agent-config/`, `procedures/`, `knowledge-base/`, `tools/`, `tests/`
- `companion-backend/`, including `.env.example` (placeholders only; the backend reads environment variables)

## Files excluded for security (not in this directory)
- The unsanitized original export (`../ai-sales-employee-export/original/`): contains the real agent ID and the owner's name and email.
- Any `.env` file, ElevenLabs CLI or keyring credentials, browser profiles or cookies (none were created or copied).
- Conversation transcripts and recordings: not exported.
- The 5 archived property-sales knowledge-base documents and 13 legacy "RE-xx" tests (a superseded use case).
- The companion repo's `.git` history: not copied. The package starts with a fresh history.

## Suggested repository description
> Source-only review package for an ElevenLabs B2B "AI Sales Employee" voice agent (Egyptian Arabic): configuration, verbatim procedures, knowledge base, test scenarios and a companion backend with unit tests. Not a runnable voice agent.

## Initialise and commit locally
```bash
cd ai-sales-employee-test-package
git init
git add .
git status                      # check the file list matches "Files intended for sharing"
# final secret check before the first commit:
grep -rnE "sk_[A-Za-z0-9]{16,}|-----BEGIN|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|@gmail\.com|agent_[0-9a-z]{28}" . --exclude-dir=.git --exclude=SHARING.md || echo "no matches"
git commit -m "AI Sales Employee source-only test package"
git log --stat                  # inspect history: it must contain only this commit
```

## Create a PRIVATE repository and invite the tester
1. On GitHub: **New repository** → name e.g. `ai-sales-employee-test-package` → visibility **Private** → do **not** add a README, license or .gitignore (they already exist).
2. Push:
   ```bash
   git remote add origin git@github.com:YOUR_ACCOUNT/ai-sales-employee-test-package.git
   git branch -M main
   git push -u origin main
   ```
3. **Settings → Collaborators → Add people** → invite the tester with **Read** access only.
4. **Warning:** check the git history before every push. Deleting a secret in a later commit does **not** remove it from history. If a secret is ever committed, revoke or rotate it in ElevenLabs immediately, then rewrite the history or recreate the repository.

## Instructions for the tester
```bash
git clone git@github.com:YOUR_ACCOUNT/ai-sales-employee-test-package.git
cd ai-sales-employee-test-package
# read: README.md → procedures/COVERAGE.md → procedures/PROCEDURES.md → tests/SCENARIOS.md
cd companion-backend && npm test     # Node.js 22 or later; no install, no network
```
The tester gets **no** access to the ElevenLabs account, API keys, phone numbers or production agent. Live behaviour can only be tested on a separate test agent that you provide.
