# Voice Agent — Progress Log

## Milestone 1 — Machine & repo inspection (done 2026-10-27)

**Hardware:**
- OS: Windows 10 Pro, build 19045
- CPU: Intel i7-7500U — **2 physical cores / 4 threads**, 2.7–2.9 GHz (this is the binding constraint for everything downstream)
- RAM: 15.88 GB
- GPU: NVIDIA GeForce 940MX + Intel HD 620 (integrated). `nvidia-smi` not found on PATH — CUDA driver/toolkit status unconfirmed. 940MX is an old, low-power Maxwell part either way. **Decision: CPU-only for all models, no CUDA packages installed.**
- Disk: 131GB free (C:), 398GB free (D:) — not a constraint.
- Node v24.14.1 / npm 11.11.0 — already set up for the two existing frontends.

**Repo:** npm workspaces monorepo (`apps/*`, `packages/*`). Existing apps (`client-portal`, `internal-dashboard`, Laravel `app-backend`) are untouched. New `apps/voice-agent/` is a standalone Python project — deliberately has no `package.json`, so it's invisible to npm workspaces and can't break the frontend build/install.

**Installed this session (with explicit user approval):**
- Python 3.12.10 via `winget install Python.Python.3.12`
- Ollama 0.40.11 via `winget install Ollama.Ollama`
- Model: `qwen2.5:1.5b` (Qwen2.5-1.5B-Instruct, Ollama's default quantization for that tag — confirm exact quant with `ollama show qwen2.5:1.5b` once pulled)

**License note — verify before any commercial use:** Qwen2.5 1.5B-Instruct is Apache 2.0 per its official model card, which is commercial-friendly. I'm flagging this as "verify" rather than fact because licenses can change per release and I'm not re-fetching the current Hugging Face/Ollama model card live — don't take my word as the final legal check before shipping anything commercially. Note also that not all Qwen2.5 sizes share the same license (some larger/variant sizes use a different, more restrictive license) — that's specific to the exact tag pulled, so re-check if the model is ever swapped.

## Milestone 2 — minimal text-based sales agent (done 2026-10-27)

### What's working

A scripted 6-turn conversation (`scripts/run_conversation_check.py`) runs end-to-end against the real local model (`qwen2.5:1.5b` via Ollama) and produces a fully grounded transcript: buy intent → area → budget/bedrooms → an off-catalog area question in Arabic → lead capture with consent → human handover request. Every price stated matches the dataset exactly (4,200,000 EGP, never invented), the zero-match case is reported honestly, and the handover doesn't over-promise a capability the system doesn't have. All 6 pytest unit tests for the tool/grounding logic pass.

### The real finding: a single prose system prompt does not reliably control a 1.5B model — and the first draft proved it by failing

The first implementation used one long system prompt covering the sales procedure, grounding rules, and tool-calling all at once. Measured against the live model, it **silently invented a price** ("5 million EGP" instead of the real 4.2 million) and **never called a single tool** across a 6-turn conversation — `tool_call_log` was empty throughout. An isolated test proved the model itself *can* call tools correctly (right name, right args) when the prompt is short and names exactly one required action — the long prompt was diluting that, not the model's base capability.

**Fix — controlled state machine, not a bigger prompt:** `app/nlu.py` deterministically extracts slots (area, budget, bedrooms, intent, name, phone, consent, "wants human") from each user message with regex/keywords. `app/agent.py`'s `_decide_pending_tool()` — plain Python, not the LLM — decides whether a tool call is mandatory this turn and supplies its exact arguments; the LLM's job is narrowed to *phrasing* the already-fetched tool result naturally. This matches the spec's own instruction not to rely on a giant prompt to enforce business rules.

### Three more failures found and fixed by actually running it (not assumed away)

1. **Digit-dropping on large numbers:** asked to phrase `price_egp: 4200000` in prose, the model wrote "420,000 EGP" — one digit dropped. Fix: numbers are now pre-formatted into strings (`"4,200,000 EGP"`) before the model ever sees them, with an explicit "copy exactly, do not retype" instruction (`_format_prices_for_prompt` in `agent.py`).
2. **Phone number misread as a 1.09 billion EGP budget:** the budget-extraction regex's plain-number fallback matched inside `"phone 01099998888"` once the "...million" pattern didn't match. Fixed in `nlu.py` by extracting phone numbers first and excluding any digit run that overlaps the phone match or is ≥10 digits.
3. **Hallucinated availability in Arabic:** for a zero-match search (asking about an area not in the catalog), the model's free-text phrasing of the *empty* result directly contradicted it — it said "yes, we have properties there" in Arabic, despite an explicit "empty results are real, do not invent a substitute" instruction in the prompt. This is the single highest-severity possible failure given the spec's explicit "never invent availability" requirement, so rather than trying to prompt-engineer around it further, zero-match results (and the human-handover and lead-capture confirmations, which showed a milder version of the same issue — softening "no live transfer capability" into an implied promise) are now **never phrased by the LLM at all** — they return a fixed bilingual template. Free-form generation is only used where a real, non-empty, already-grounded tool result exists to phrase.

### Measured latency (this machine: i7-7500U, 2 cores, CPU-only)

- Cold start (model not yet loaded into Ollama's memory): ~51s for the first response.
- Warm (model already loaded, which Ollama keeps for ~5 min of inactivity by default): ~5–17s per turn for turns that go through the LLM.
- Templated turns (zero-match, handover, lead-capture confirmation): ~0s, no LLM call at all.
- This is far above the spec's 1–2s target for first audible response — expected at this stage (text-only, no streaming, weak CPU) and the explicit target of Milestone 6, not Milestone 2. Flagging now so it isn't forgotten: a 2-core CPU doing LLM + STT + TTS sequentially will need either a smaller/faster model, streaming partial responses, or both.

### Known limitations carried forward (honest, not hidden)

- `nlu.py` is a deliberately simple regex/keyword extractor, not real entity recognition — e.g. once "Nasr City" is mentioned it overwrites `state.area` and never reverts even though the conversation's actual interest stayed in New Cairo. No false fact was stated because of this, but it's a real memory-tracking gap. Proper multilingual slot extraction is in scope for Milestone 7's evaluation suite, not fixed here.
- Tool-calling is deterministic Python for the four known actions; the LLM only gets genuine tool-calling discretion as a fallback (`_converse()`) when the heuristic doesn't fire. This is a pragmatic, measured trade-off for a 1.5B model, not the "let the LLM always decide" design the spec describes in the abstract — worth revisiting if a larger model is evaluated later.
- No audio yet (no STT/TTS, no barge-in) — Milestones 3–6.

## Milestone 3 — faster-whisper STT evaluation (done 2026-10-27)

### Setup bug found and fixed

`pip install faster-whisper` pulled `av` 19.0.2 by default, which **broke immediately**: faster-whisper 1.2.1 calls `av.open(..., metadata_errors=...)`, a parameter newer `av` removed. Fixed by pinning `av==12.3.0` in `requirements.txt`. Worth knowing if `faster-whisper` is ever upgraded — re-check this pin.

### What's working — English, measured on real synthetic audio

6 English test sentences (deliberately covering the spec's required entity types: compound/property names, prices, phone numbers, bedroom counts, area names) were synthesized locally via Windows SAPI (`scripts/synthesize_test_audio.ps1`, zero network calls, free) and run through `faster-whisper` "tiny" and "base" on this CPU (`scripts/run_stt_eval.py`).

**Important caveat on the WER numbers below:** the naive word-level WER metric (`app/eval/wer.py`) scored "four million two hundred thousand" vs. Whisper's output "4,200,000" as 50% wrong — but that's not a transcription error, it's Whisper correctly normalizing spoken numbers into digits, which is actually *more* convenient for `app/nlu.py`'s regex-based digit extraction downstream. Same story for "Sixth of October" → "6th of October". Reporting the raw numbers below for honesty, but don't read "25.56% avg WER" as "1 in 4 words wrong" — real word-level accuracy was effectively 100% for every sentence except one genuine error:

- **tiny model actually mis-transcribed the phone number**, dropping a digit: expected `01099998888` (11 digits) → got `0109999888` (10 digits, missing the final 8).
- **base model got the exact same phone number correct**, all 11 digits.

| Model | Real transcription errors found | Avg inference / utterance | Realtime factor | Cold model-load time |
|---|---|---|---|---|
| tiny (75MB) | 1 dropped digit (phone number) | 1.80s | 0.43x (faster than realtime) | 1.33s |
| base (145MB) | 0 | 4.01s | 0.95x (right at the realtime boundary) | **59.38s** |

The `base` model's one-time cold-load time (~1 minute on this 2-core CPU) is a real, significant number — the service must load the model once at startup and keep it resident (already how `whisper_adapter.py`'s `_get_model` caching works), never load-per-request. Per-utterance inference for `base` is right at the real-time boundary on this CPU, so it's workable but leaves little headroom once an LLM call and TTS are added in the same turn.

**Recommendation from this data:** `base` for phone numbers / precise digit sequences where tiny measurably drops digits; `tiny` is markedly faster. Worth trying `small` for comparison on this same test set before final selection — not done yet (next small model size, would need the same quick approval pattern already established).

### The real gap: Egyptian Arabic is still completely untested

This machine has no installed Arabic voice (`Get-InstalledVoices` shows only `Microsoft David/Zira Desktop`, both en-US), and there's no TTS engine built yet (that's Milestone 4) to synthesize Arabic test audio ourselves. **I have not evaluated Egyptian Arabic recognition accuracy, code-switching, or Arabic-specific entity recognition at all** — the spec's requirement #2 and section 4A are explicitly about Egyptian Arabic, not just "Arabic support exists in the model," and I won't claim that's validated without real audio to measure against.

Options, needing your input:
1. You record a short (~30s) Arabic/English-mixed clip on your phone and send it over — gives one real, honest data point instead of zero.
2. Install a Windows Arabic language pack (adds an Arabic SAPI voice) — this is a real download, size unconfirmed until attempted, so it needs the same approval as other installs before I do it.
3. Defer Arabic STT evaluation until Milestone 4 produces a local TTS that can speak Arabic, then bootstrap test audio from that — pushes the gap out rather than closing it now.

## Milestones 4–6 (partial) — TTS, the full mic-to-audio loop, and streaming (done 2026-10-27)

User asked to "implement what's missing — it should be like a smooth normal phone call." This pass built every remaining piece (TTS, mic capture, VAD, playback, the full loop) and then measured, honestly, how close that got to "smooth."

### TTS: Piper (MIT license, fully local, CPU/ONNX)

Checked the actual voice catalog rather than assuming (`huggingface.co/rhasspy/piper-voices/voices.json`) — **the only Arabic voice is `ar_JO-kareem` (Jordanian Arabic, male). There is no Egyptian Arabic Piper voice.** Downloaded `en_US-amy-medium` and `ar_JO-kareem-medium` (63MB each). This is the same category of gap as the STT Arabic finding in Milestone 3 — using it is a reasonable placeholder, not a validated Egyptian Arabic voice; don't present it to a user as "our Egyptian accent."

Piper is fast on this CPU once warm: ~0.1–0.2x realtime for English and Arabic alike (i.e. synthesizing is 5–10x faster than the audio's own length). Cold model-load is ~9–13s per language, one-time.

**Self-check without ears:** I can't listen to the output, so I round-tripped every synthesized clip back through faster-whisper. English and Arabic both transcribed back almost verbatim (minor diacritic/punctuation differences only) — strong evidence the audio is intelligible speech, not garbage. This does **not** confirm a human would judge the Arabic as sounding authentically Egyptian — that needs a real listener.

**One real TTS bug found:** Piper mispronounced "Marina View" badly enough that Whisper's round-trip heard "Marine of View." A measured pronunciation defect on our own property name, not hypothetical — worth re-testing if the voice or model version changes.

### Milestone 5: the full mic-to-audio loop (`app/voice_loop.py`)

Built: `app/audio/vad.py` (simple RMS-threshold voice activity detector — avoided `webrtcvad` deliberately since it needs a C compiler on Windows that this machine may not have set up; pure numpy instead), `app/audio/capture.py` (records until ~1s of trailing silence, 16kHz mono to match Whisper's native rate), `app/audio/playback.py`. Confirmed via `sounddevice.query_devices()` that this machine has a real working mic (Realtek Microphone Array) and speakers, not just synthetic test devices.

**Important limitation I'm flagging directly: I have no voice or ears.** I verified every component individually and the full chain end-to-end using file-based "simulated caller audio" (`scripts/run_voice_pipeline_check.py`, reusing Milestone 3's test clips) with real measured timing and the STT round-trip self-check. I cannot personally confirm the *live microphone* experience — that needs a human to run `python -m app.voice_loop` and actually talk to it.

### Is it a "smooth normal phone call"? Measured answer: not yet, and here's exactly why

First full pipeline run (`scripts/run_voice_pipeline_check.py`, before streaming): **30–45 seconds per turn** between the caller finishing speaking and the agent finishing its reply. Breakdown: STT ~4-6s, TTS ~1-3s (once warm), **LLM ~22-23s — the dominant cost by far**, exactly matching the Milestone 2 latency finding. STT and TTS are not the bottleneck; the LLM is.

**Implemented one concrete fix: sentence-level streaming.** `OllamaAdapter.chat_stream()` + `app/text_chunking.py` (a pure, tested sentence splitter) let the agent start speaking the *first* sentence of a reply while the LLM is still generating the rest, instead of waiting for the whole reply (`SalesAgent.step_streaming()`, wired into `voice_loop.py`). Measured result: **time to first spoken sentence dropped from the full 20-45s wait down to ~3s** for a typical reply. That's the single highest-leverage, lowest-risk improvement available without changing models — it directly changes what the caller experiences as "dead air" before the agent responds.

**Caveat, measured not assumed:** time-to-first-sentence isn't constant — it grew to ~10-13s by the third turn in the same conversation, because a longer conversation history costs more CPU time to process before the first token streams out ("prefill" cost scales with context length). This matters for a call that runs long; flagging it now rather than after it surprises someone.

### A real grounding regression found and fixed during this same testing

Turn 3 of the pipeline check asked about a property by name that had *already* been searched for earlier in the conversation. Because the search criteria hadn't changed, no new tool call fired — and the LLM, answering from its own memory of the conversation instead of a fresh tool result, **said the Marina View Apartment was a "villa."** It's an apartment. Fixed in `agent.py`: `_mentioned_property_id()` now scans the caller's own words for any property name and always forces a fresh `get_property_by_id` call when one is mentioned, regardless of whether search criteria changed — cheap, deterministic, and closes exactly this failure mode. Covered by a new regression test (`test_agent.py`) using a fake LLM so this can't silently break again without Ollama running.

### Honest overall verdict

The pipeline is now a complete, real, grounded, bilingual, mic-to-speech conversation — every stage is genuine, nothing is faked or simulated. It is **measurably closer to a phone call** than before (first words in ~3s instead of ~30-45s), but it is **not yet "smooth"**: full replies still take 15-25s to finish speaking, and that gap grows with conversation length. On this exact hardware (2-core CPU, no usable GPU), closing that further means one of: a smaller/faster LLM (quality risk, already documented as fragile at 1.5B), shorter replies by design, or better hardware — not something achievable by more Python alone.

## Milestone 7 — web test interface (done 2026-10-27)

User asked for a UI "like what's implemented on ElevenLabs" — starts the conversation, replies by voice — referencing `ai-sales-employee-test-package` for inspiration. Checked that package directly first: it's a **source/config-only review package**, not a runnable widget — no UI code to copy, and it's a different business domain (B2B outbound sales to real estate companies, not our inbound receptionist). So this builds the standard "voice call widget" UX pattern (big call button, live transcript, auto listen→speak loop) from scratch, wired to our own local backend — nothing from ElevenLabs is called or embedded.

### Architecture

- `app/server/main.py` — FastAPI app, one WebSocket (`/ws/call`) per call. Wraps the exact same `SalesAgent`/`whisper_adapter`/`piper_adapter` already built and measured in Milestones 2–6 — **no new conversation logic**, only real-time plumbing.
- `static/{index.html,app.js,style.css}` — vanilla JS, no build step, no framework. The browser captures microphone audio itself (`getUserMedia` + `MediaRecorder`), runs a simple energy-based VAD client-side (same approach as the Python one in `app/audio/vad.py`) to detect when the caller stops talking, and sends the recorded clip to the server as WebM/Opus — the browser's native recording format.
- Protocol: JSON text frames for control/transcript/tool-call events, binary frames for audio (WAV from server, WebM/Opus from browser). Streams sentence-by-sentence exactly like `voice_loop.py`'s Milestone 6 latency fix — the browser starts playing the first sentence's audio while later sentences are still being generated and synthesized.

### A real risk, checked before building the UI around it

The biggest unverified assumption was: can the server actually decode what a browser's `MediaRecorder` sends (WebM/Opus), not just WAV? Rather than assume, `scripts/debug_webm_decode.py` transcodes a WAV test clip into WebM/Opus using the same `av` library faster-whisper already depends on, then transcribes it directly — **confirmed working, byte-for-byte correct transcription**, before writing a line of frontend code.

### Verified without a browser or a human

I have no browser, microphone, or ears to click the real UI with. Built `scripts/debug_ws_client.py` — a scripted WebSocket client that exercises the *exact* protocol the browser uses: connect, receive the greeting (text + real WAV audio), send a real recorded utterance (the WebM fixture from the decode check), use text-input debug mode, trigger the human-handover template, and reset. **All passed** — real STT, real streaming sentence-by-sentence agent replies, real tool-call reporting, real WAV audio returned (verified by checking the `RIFF` header, not just byte count), grounding and pricing all correct throughout.

**What I still cannot verify myself:** the actual browser experience — clicking the call button, granting mic permission, hearing it through speakers, talking into a real mic, client-side VAD behaving sensibly in a real room. The backend protocol is proven; the frontend needs a human.

### Known rough edges (minor, documented honestly rather than silently left)

- VAD calibration (ambient noise measurement) happens once per call, not once per turn — fine for a quiet desk test, may need recalibration logic if background noise changes mid-call.
- Toggling into text-debug mode while actively recording can send one stray short clip to the server before switching over — cosmetic, not a correctness issue.
- No reconnection/retry logic if the WebSocket drops mid-call — ending and restarting the call is currently the only recovery path.

## Milestone 6 (continued) — real human testing surfaces three bugs; two fixed (done 2026-10-27)

First real human test of the web UI (not me — I have no ears or voice). Reported: Arabic not understood/accurate, voice sounds robotic, and English words embedded in Arabic sentences came out garbled. Broken down and addressed individually:

### Bug 1 (fixed): low-confidence transcripts were trusted as fact
A garbled/unfamiliar-dialect utterance got transcribed by faster-whisper into a plausible-looking but wrong string (e.g. a random number) and was fed straight to the agent as if confidently understood — exactly the failure mode the spec warns against. Fixed by reading faster-whisper's own uncertainty signals (`avg_logprob`, `no_speech_prob`) and gating: a low-confidence transcript now triggers a bilingual "I didn't catch that, can you repeat?" instead of being acted on. `TranscriptionResult.is_low_confidence`, wired into both `voice_loop.py` and `server/main.py`. 5 new unit tests.

### Bug 2 (fixed): English words inside Arabic sentences were mangled
**Root cause, confirmed not assumed:** the whole mixed sentence was sent through one phonemizer. If it contained any Arabic character, the *entire* string — including embedded English names/prices — went through the Arabic voice, which tried to pronounce English words using Arabic phonetic rules.

**Fix:** `app/text_lang_spans.py` splits text into language-homogeneous spans by script (pure function, 7 unit tests, concatenation-exact). `PiperAdapter._synthesize_mixed()` synthesizes each span with the correct voice and stitches them with a short pause at each switch.

**Verification methodology, because I have no ears:** round-tripping the *full* mixed clip through Whisper was misleading — Whisper also locks onto one dominant language per clip and transliterates short foreign words back into that language's script, which looks like a TTS failure but isn't. Resolved by testing each span *in isolation* (no surrounding-language confound): the English span for "Ahmed," synthesized alone with the English voice, decisively proved the right voice was being used. Also measured, and important to log: a very short isolated span ("Ahmed") synthesized poorly on its own — appending a terminal period for synthesis purposes only (not stored in the text) measurably improved it. Tested this same fix against a longer span ("4,200,000 EGP") and it made THAT one measurably worse in the full-clip round-trip; isolating that span alone confirmed the underlying audio was actually fine and the full-clip round-trip problem was the Whisper-side confound again, not the period. Net result: the period fix is scoped to short spans only (≤20 chars), based on actual measurement, not a blanket rule.

**The ceiling, stated plainly:** this produces correct per-language pronunciation. It does **not** produce one seamless bilingual voice like ElevenLabs — Piper has no architecture for a single voice identity that speaks multiple languages; this alternates between two distinct voice models (Jordanian Arabic male, American English female) at each language switch. Closing that gap for real requires either a different TTS engine with genuine multilingual single-voice synthesis, or a cloud service — both are a real conversation to have deliberately, not something to slide into silently (an `AskUserQuestion` call to raise this choice failed to send mid-conversation, so I proceeded with the free/local fix only and I am not treating that failed prompt as the user having chosen a direction on the cloud-TTS question).

**Also changed:** the greeting is now bilingual ("Hi, thanks for calling Nile Vista Properties! أهلاً وسهلاً، إزاي أقدر أساعدك النهارده؟") instead of English-only — addresses "should start like a human" by signaling bilingual capability immediately, and exercises the code-switching fix on the very first thing a caller hears.

### Bug 3 (not fixed, ceiling confirmed): "robotic" voice quality
No Piper voice tier beyond "medium" exists for Arabic at all (checked the catalog directly). For English, tried `en_US-ryan-high` — slower to synthesize and not clearly better in a round-trip test; comparison files left in `test_audio/voice_compare/` for a human to judge, not switched by default. Piper's naturalness ceiling is genuinely below ElevenLabs' cloud models — this is a real trade-off of "fully local and free," not a bug.

## Mission audit — "sales employee" quality pass (done 2026-10-27)

User asked for a full pipeline audit against a 9-phase mission brief (Egyptian Arabic recognition, natural TTS, no duplicate bilingual answers, real sales-broker behavior, stronger LLM evaluation, latency, testing). Phase 1 (audit) and the highest-impact slice of Phase 4 (language consistency / no-duplication) are done below, with real reproduction — not guesses. Phases 2/3/6 (STT/TTS/LLM model upgrades) are scoped with licensing/hardware notes but **no downloads made** — RAM is tight right now (see Hardware re-check) and the brief explicitly requires approval before resource-intensive downloads.

### Hardware re-check

- CPU/GPU unchanged from Milestone 1 (i7-7500U, 2 cores; 940MX unusable, no CUDA).
- **RAM: only 4.93GB free of 15.88GB total right now.** This is a real, current constraint on any larger-model evaluation (Phase 2/3/6) — Qwen2.5-7B-Q4 (~4.5GB) would be right at the edge of what's free *right now*; Whisper `large-v3` (~3GB) likewise. Both are plausible if other applications are closed first, risky otherwise. Re-check free RAM at the time of actually downloading/running a candidate, don't rely on this snapshot.
- Disk: 123GB (C:) + 398GB (D:) free — not a constraint.

### Root cause audit: NOT what the mission brief hypothesized — confirmed by direct reproduction, not assumed

I reproduced a real Egyptian Arabic conversation (`scripts/debug_arabic_duplication.py`: "أنا عايز شقة في التجمع الخامس" → "...two bedrooms في New Cairo بجيت خمس مليون" → "السعر غالي شوية") against the live model multiple times and traced every layer (NLU extraction → tool decision → exact prompt sent → raw LLM output). Findings:

1. **The specific "answers twice, once in English then once in Arabic" pattern did not reproduce** in direct testing. What I found instead, run after run, is **worse**: with an *identical*, correctly-grounded prompt (confirmed real tool result, real property data), repeating the exact same LLM call 4 times produced 4 different outcomes — one ignored the tool result entirely and asked an unrelated question, two stated the **wrong currency outright** ("جنيه إسترليني" / Sterling pounds, "جنيه إماراتي" / UAE dirham — never the correct Egyptian pound, despite being told to copy an exact pre-formatted string character-for-character), and one hallucinated a property name that doesn't exist in the dataset ("Nile Vista Townhouse" — a fusion of a real compound name "Nile Vista" with a real property *type* "Townhouse" from a *different* listing).
2. **This compounds across turns, and that's the real severity:** because every assistant reply — good or bad — gets written into `self.history`, a single bad turn becomes permanent context for every turn after it. Confirmed directly: once the model produced one confused/refusal-shaped reply, the next two turns (with completely different user input) repeated that same wrong reply almost verbatim, ignoring the new input entirely. This is the actual mechanism behind essentially every symptom in the mission brief (looks like duplication, inconsistent language, "generic chatbot" feel, no real follow-through) — not a prompt-wording problem, a **per-turn reliability ceiling of a 1.5B model, compounding statefully**.
3. Language *consistency* (staying in Arabic once the caller is speaking Arabic) was actually fine across these tests once the greeting was made bilingual — no reproduced case of switching languages mid-conversation unprompted.

### Fix shipped (in `app/agent.py`, no new downloads, no model change)

1. **Currency pre-localization:** `_format_prices_for_prompt(value, arabic)` now renders the price as `"4,200,000 جنيه مصري"` directly in Python when replying in Arabic, instead of handing the model `"EGP"` and hoping it translates correctly (it didn't, 2 of 4 times). Removes the model's opportunity to mistranslate the currency at all, rather than asking it nicely not to.
2. **Grounding validation + bounded retry + deterministic fallback — the fix for the compounding problem:** `_is_grounded(reply, result)` checks a phrased reply for (a) any of a list of known-wrong currency words, (b) whether it mentions at least one property name actually present in the tool result when one exists. `_phrase_result()` and `step_streaming()` now retry the LLM once (`MAX_PHRASING_ATTEMPTS = 2`) if the first reply fails this check, and fall back to `_deterministic_summary()` — a plain, correct, Python-built sentence from the verified data — if both attempts fail. **Critically, a reply that fails validation is never written into `self.history`**, which is what stops one bad turn from poisoning every turn after it.
3. Trade-off taken deliberately: the streaming phrasing path (`step_streaming`) now buffers the *full* reply before validating, instead of yielding sentences as they arrive — sacrificing the Milestone 6 time-to-first-sentence win *for this one call type specifically*, in exchange for never speaking an unvalidated reply. Correctness over latency, matching the project's own stated priority.

**Measured result after the fix** (same reproduction script, re-run against the live model): currency was correct ("جنيه مصري") in every run; the conversation progressed naturally turn-to-turn (new budget → different correctly-matched property; a price objection → an appropriate "I understand, want other options?" response) instead of repeating a stuck wrong answer. 5 new unit tests (`test_agent.py`) lock in the retry/fallback/currency behavior with a fake LLM, deterministically, no Ollama required.

**Honest remaining gap, found during this same verification, not hidden:** the grounding check is a real improvement, not a complete guarantee. In one of the re-test runs, a hallucinated property name ("Nile Vista Townhouse") still made it through to the spoken reply — meaning `_is_grounded` can still occasionally pass a reply that invents a name alongside/instead of a real one, if the check's substring logic doesn't catch that specific phrasing. A stricter follow-up (e.g. rejecting any capitalized multi-word phrase that isn't one of the dataset's real property/compound names, rather than only requiring that *a* real name appears somewhere) is the obvious next increment, not implemented yet.

### Phase 2/3/6 model-upgrade candidates — proposed, NOT downloaded, pending approval

| Component | Current | Candidate | Approx. size | License (verify before commercial use) | Note |
|---|---|---|---|---|---|
| STT | faster-whisper `base` (145MB) | `small` (488MB) | ~1GB RAM | MIT (OpenAI Whisper weights) | Safer first step than `large-v3` on this RAM budget; worth a real WER comparison on genuine Egyptian Arabic audio once available |
| STT | — | `large-v3` | ~3GB on disk, ~6GB+ RAM | MIT | Right at the edge of current free RAM (4.93GB) — risky without closing other apps first; best Arabic accuracy of the Whisper family but unverified on CPU latency here |
| LLM | `qwen2.5:1.5b` (986MB) | `qwen2.5:3b` | ~2GB (Q4) | Apache 2.0 for most Qwen2.5 sizes, but **verify the exact tag** — not all sizes share the same license | Moderate step up; worth benchmarking sales-reasoning + Arabic quality before committing |
| LLM | — | `qwen2.5:7b` | ~4.5GB (Q4) | Apache 2.0 (verify tag) | Right at the edge of current free RAM; likely the real fix for the per-turn reliability ceiling found above, but latency on 2 CPU cores is unmeasured and may be unacceptably slow — must benchmark, not assume |
| TTS (Arabic) | Piper `ar_JO-kareem-medium` (Jordanian) | VoiceTuT-TTS or similar multilingual engine | unknown — not yet investigated | **User's own flagged constraint: VoiceTuT's demo/reference speaker identities are NOT commercially cleared — would need a reference voice the user owns or is authorized to use** | Not evaluated yet this session; genuinely investigating this needs a licensed/owned reference speaker sample before going further, which is a decision point for the user, not something to proceed on alone |

**Recommendation:** benchmark `qwen2.5:3b` before `7b` — it's a safer RAM fit and may already meaningfully reduce the per-turn failure rate found above; only escalate to `7b` if `3b` doesn't close the gap and free RAM allows it at benchmark time. For STT, `small` is the safe next step; hold off on `large-v3` until free RAM is confirmed higher or the machine is otherwise idle.

### Remaining phases (not started — full scope was 9 phases, this pass covered 1 and the highest-leverage slice of 4)
- Phase 3: real Arabic TTS benchmarking (needs the licensing decision above first).
- Phase 5: structured sales procedure (discovery → matching → persuasion → objection handling → qualification) — partially present already (search/objection response shown above was reasonable in testing) but not built as a deliberate, tested procedure.
- Phase 6: actually benchmark `qwen2.5:3b`/`7b` against sales scenarios (needs approval to download).
- Phase 7: latency instrumentation across the full pipeline (partially done in Milestone 6; needs re-measurement with the new retry/fallback mechanism's cost).
- Phase 8: the structured 14-scenario regression suite the brief asks for — not built; current tests are unit-level, not full-conversation scenario tests.

## Next steps
1. **Decide on the model-upgrade candidates above** — I will not download `qwen2.5:3b`/`7b` or Whisper `small`/`large-v3` without explicit approval, per the mission brief's own constraint.
2. **Decide on the Arabic TTS path** — VoiceTuT (needs a licensed reference voice) vs. accepting the Jordanian-voice ceiling vs. a cloud fallback (breaks "fully local").
3. Run the actual UI (`python -m uvicorn app.server.main:app --port 8787`, open `http://localhost:8787`) with the new grounding fix live — still the one thing that specifically needs a human to try.
4. Build the Phase 8 scenario-based regression suite (14 named scenarios) as a separate layer from the existing unit tests, once the model decisions above are made (re-running it after every model swap is the point).
