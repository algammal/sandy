# Voice Agent (own engine — no ElevenLabs)

Standalone Python project, separate from `client-portal` / `internal-dashboard`.
Not wired into the npm workspaces (no `package.json` here on purpose) — this is a
different stack entirely and shouldn't affect `npm install`/`npm run build` for
the two frontends.

**Goal:** build our own low-latency AI voice agent (STT → LLM reasoning → TTS)
to eventually replace third-party voice platforms like ElevenLabs. The spoken
conversation working end-to-end is the deliverable — not a dashboard.

See `PROGRESS.md` for hardware findings, milestone status, model licenses, and
benchmark results as they're measured (not invented).

## Current state: Milestones 1–5 + 7 done, Milestone 6 partial (streaming done, no barge-in yet)

A complete mic-to-speech conversation loop exists in two forms — a terminal
one (`app/voice_loop.py`) and a browser UI (`app/server/` + `static/`) — and
has been measured end to end. It is real and grounded, but it is **not yet
"smooth"** — see `PROGRESS.md` Milestones 4–7 for the actual latency numbers
and why.

```
app/
  data/properties.py        synthetic, clearly-fictional real estate dataset
  tools/property_search.py  the ONLY source of property facts + lead capture,
                             called by the LLM via tool/function calling
  llm/base.py                swappable LLM adapter interface
  llm/ollama_adapter.py       Ollama implementation (chat + chat_stream)
  nlu.py                      deterministic slot extraction (area/budget/etc.)
  langdetect.py                shared Arabic-text detection helper
  text_chunking.py              splits an LLM token stream into sentences
  agent.py                   conversation state + sales procedure + tool loop
                             (step() blocking, step_streaming() sentence-by-sentence)
  cli.py                     text-only REPL test harness
  stt/whisper_adapter.py      faster-whisper wrapper, CPU/int8 (path or raw array)
  tts/piper_adapter.py         Piper TTS wrapper, CPU/ONNX, EN + AR(Jordanian)
  audio/{vad,capture,playback}.py   mic input, energy-based VAD, speaker output
  voice_loop.py                THE live mic-to-speech conversation loop (terminal)
  server/main.py                FastAPI WebSocket backend for the browser UI
  eval/wer.py                 word error rate scoring, no LLM/network needed
  tests/                     pytest — property_search, WER, chunking, agent logic
static/
  index.html, app.js, style.css   the browser voice-call widget (vanilla JS, no build step)
scripts/
  run_conversation_check.py   scripted multi-turn LLM conversation test
  run_stt_eval.py              faster-whisper tiny vs base eval on test_audio/
  run_voice_pipeline_check.py   full STT->Agent->TTS check using file input
                               (no live mic needed — this is how I verify it myself)
  debug_webm_decode.py          verifies the browser's WebM/Opus audio decodes correctly
  debug_ws_client.py             scripted client exercising the full web UI protocol
  synthesize_test_audio.ps1    generates English test WAVs via Windows SAPI
  debug_tts.py                  Piper smoke test + STT round-trip self-check
  debug_tool_calling*.py       isolated LLM tool-calling sanity checks
models/piper/                 Piper voice models (not committed — see .gitignore)
test_audio/en/                synthetic English test clips + manifest.json
```

## Setup (Windows / PowerShell)

Python 3.12 and Ollama are installed system-wide already (via `winget`). From
`apps/voice-agent`:

```powershell
# refresh PATH in this shell if python/ollama aren't found yet (new installs need a fresh terminal otherwise)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# one-time: pull the small local model (≈1GB)
ollama pull qwen2.5:1.5b

# make sure the Ollama server is running (it usually auto-starts as a background service after install)
ollama serve   # if it's not already running elsewhere

# run the text-only agent
.\.venv\Scripts\python.exe -m app.cli
```

Run tests (no Ollama required — these only test the grounding/tool/WER logic).
**Every command below uses the venv's own python explicitly** — a bare
`python` in a fresh terminal (without re-activating the venv first) resolves
to your system Python instead, which doesn't have any of these packages
installed, and that's the #1 cause of "No module named X" errors here:

```powershell
.\.venv\Scripts\python.exe -m pytest app/tests -v
```

Run the STT evaluation (downloads faster-whisper's "tiny" and "base" weights
on first run, ~75MB + ~145MB from Hugging Face):

```powershell
.\.venv\Scripts\python.exe -m scripts.run_stt_eval
```

To regenerate the English test audio (only needed if you edit
`test_audio/en/manifest.json`):

```powershell
.\scripts\synthesize_test_audio.ps1
```

**Egyptian Arabic STT/TTS accuracy is still not evaluated against real human
speech** — there's no Egyptian Arabic Piper voice available (checked directly;
only Jordanian `ar_JO-kareem` exists) and this machine has no Arabic SAPI
voice either. See `PROGRESS.md` Milestones 3–4 for the options.

### Download the TTS voice models (one-time, ~126MB)

```powershell
.\.venv\Scripts\python.exe -m piper.download_voices --download-dir models\piper en_US-amy-medium ar_JO-kareem-medium
```

### Talk to it live (the actual phone call)

```powershell
.\.venv\Scripts\python.exe -m app.voice_loop
```
Speak after "Listening...", wait ~1s of silence for it to process. Ctrl+C to
end the call. **I have not personally tested this live path — I have no
microphone or ears** (see `PROGRESS.md`); I've verified every component
individually and the full chain via file-based simulated audio instead. This
is the one thing in the whole project that specifically needs you to try.

### Verify the full pipeline without a live mic (how I test it myself)

```powershell
.\.venv\Scripts\python.exe -m scripts.run_voice_pipeline_check
```
Feeds existing test WAVs through STT → agent → TTS, saves the agent's
spoken replies to `test_audio/pipeline_check/`, and round-trips them back
through Whisper as an intelligibility self-check — printing real measured
per-turn latency the whole way.

### The browser UI (the ElevenLabs-widget-style version)

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.server.main:app --port 8787
```
Then open **http://localhost:8787** in a browser. Click the big button to
start the call — it speaks the greeting out loud immediately, then listens,
replies by voice, and keeps the conversation going automatically (no need to
click anything between turns). Check "Debug: type instead of speak" to type
rather than talk. The transcript and a tool-call inspector are both visible
live.

**This is the one part of the whole project I have not personally tested —
I have no browser, microphone, or ears.** The backend protocol it relies on
is fully verified (`scripts/debug_webm_decode.py` proves the browser's
WebM/Opus recording format decodes correctly server-side; `scripts/debug_ws_client.py`
scripts the exact same WebSocket protocol the browser uses and confirms every
message type, real audio, and grounding behavior work end to end). The
browser experience itself — clicking the button, granting mic permission,
hearing it, talking to it — needs you.

## Hardware this was built against

Intel i7-7500U (2 cores / 4 threads), 16GB RAM, NVIDIA GeForce 940MX (old,
weak, CUDA unconfirmed) — treated as **CPU-only**. See `PROGRESS.md` for the
full report. Model sizes are deliberately small because of this; don't swap
in a bigger model without re-measuring latency on this machine.

## What this is NOT (yet)

- Not full-duplex — no barge-in/interruption handling. The agent can't be
  talked over mid-sentence yet; that's the remaining piece of Milestone 6.
- Not "smooth" — full replies still take 15-25s to finish speaking, growing
  with conversation length (dominated by LLM generation time on this CPU,
  not STT/TTS). Time-to-*first*-sentence is ~3s thanks to streaming, which
  is the real, measured improvement so far — see `PROGRESS.md`.
- No telephone integration — explicitly deferred until the browser/mic-based
  agent works reliably (per the project spec).
- No real customer data, no real ElevenLabs calls, no payments, no real auth.
