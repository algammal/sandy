"""
Milestone 7: the web test interface's backend. One WebSocket per call,
wrapping the exact same SalesAgent / whisper_adapter / piper_adapter already
built and measured in Milestones 2-6 — no new conversation logic lives here,
only the real-time plumbing (receive audio, transcribe, step the agent,
synthesize, send audio back).

Protocol (see static/app.js for the client side):
  Server -> client JSON text frames: info / agent_text / user_text /
            tool_calls / turn_done / error
  Server -> client binary frames: one WAV file per spoken sentence
  Client -> server binary frames: one recorded utterance (webm/opus, decoded
            server-side by the same `av` library faster-whisper already uses)
  Client -> server JSON text frames: {"type": "text_input", "text": ...} for
            the debug text-only mode, or {"type": "reset"}
"""

from __future__ import annotations

import json
import logging
import os
import tempfile

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles

from app.agent import SalesAgent
from app.audio.wav import pcm_to_wav_bytes
from app.langdetect import UNCLEAR_SPEECH_MESSAGE
from app.llm.ollama_adapter import OLLAMA_MODEL, OllamaAdapter
from app.stt.whisper_adapter import DEFAULT_MODEL_SIZE as WHISPER_MODEL_SIZE
from app.stt.whisper_adapter import transcribe
from app.tts.piper_adapter import PiperAdapter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice_agent.server")

app = FastAPI(title="Nile Vista Properties — Voice Agent (local, no ElevenLabs)")

_tts = PiperAdapter()

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def index():
    from fastapi.responses import FileResponse

    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


def _info_message() -> dict:
    return {
        "type": "info",
        "llm": OLLAMA_MODEL,
        "stt": f"faster-whisper ({WHISPER_MODEL_SIZE})",
        "tts": "Piper (en_US-amy-medium / ar_JO-kareem-medium — Jordanian, not Egyptian; see PROGRESS.md)",
    }


async def _speak_streaming(ws: WebSocket, agent: SalesAgent, user_text: str, tool_log_offset: int) -> int:
    """Streams the agent's reply sentence-by-sentence: text frame, then the
    WAV audio frame for that sentence, exactly mirroring the latency win
    already measured in app/voice_loop.py."""
    for sentence in agent.step_streaming(user_text):
        stripped = sentence.strip()
        if not stripped:
            continue
        await ws.send_json({"type": "agent_text", "text": sentence})
        result = _tts.synthesize(stripped)
        await ws.send_bytes(pcm_to_wav_bytes(result.audio, result.sample_rate))

    new_calls = agent.state.tool_call_log[tool_log_offset:]
    if new_calls:
        await ws.send_json({"type": "tool_calls", "calls": new_calls})
    return len(agent.state.tool_call_log)


@app.websocket("/ws/call")
async def call_socket(ws: WebSocket) -> None:
    await ws.accept()
    agent = SalesAgent(llm=OllamaAdapter())
    tool_log_offset = 0

    await ws.send_json(_info_message())
    greeting = agent.greet()
    await ws.send_json({"type": "agent_text", "text": greeting})
    greeting_audio = _tts.synthesize(greeting)
    await ws.send_bytes(pcm_to_wav_bytes(greeting_audio.audio, greeting_audio.sample_rate))
    await ws.send_json({"type": "turn_done"})

    try:
        while True:
            message = await ws.receive()

            if message.get("type") == "websocket.disconnect":
                break

            try:
                if "bytes" in message and message["bytes"] is not None:
                    user_text, language, low_confidence = await _handle_audio_turn(message["bytes"])
                    if user_text is None:
                        await ws.send_json({"type": "error", "message": "Didn't catch any speech in that recording — try again."})
                        await ws.send_json({"type": "turn_done"})
                        continue

                    await ws.send_json({"type": "user_text", "text": user_text, "language": language, "low_confidence": low_confidence})

                    if low_confidence:
                        # Measured bug (see PROGRESS.md): unclear/unfamiliar
                        # speech was silently transcribed into a plausible
                        # but wrong string and fed to the agent as fact —
                        # don't trust a low-confidence transcript, ask again.
                        await ws.send_json({"type": "agent_text", "text": UNCLEAR_SPEECH_MESSAGE})
                        clarify_audio = _tts.synthesize(UNCLEAR_SPEECH_MESSAGE)
                        await ws.send_bytes(pcm_to_wav_bytes(clarify_audio.audio, clarify_audio.sample_rate))
                    else:
                        tool_log_offset = await _speak_streaming(ws, agent, user_text, tool_log_offset)
                    await ws.send_json({"type": "turn_done"})

                elif "text" in message and message["text"] is not None:
                    payload = json.loads(message["text"])
                    if payload.get("type") == "text_input":
                        user_text = payload.get("text", "").strip()
                        if not user_text:
                            continue
                        await ws.send_json({"type": "user_text", "text": user_text, "language": None})
                        tool_log_offset = await _speak_streaming(ws, agent, user_text, tool_log_offset)
                        await ws.send_json({"type": "turn_done"})
                    elif payload.get("type") == "reset":
                        agent = SalesAgent(llm=OllamaAdapter())
                        tool_log_offset = 0
                        greeting = agent.greet()
                        await ws.send_json({"type": "agent_text", "text": greeting})
                        greeting_audio = _tts.synthesize(greeting)
                        await ws.send_bytes(pcm_to_wav_bytes(greeting_audio.audio, greeting_audio.sample_rate))
                        await ws.send_json({"type": "turn_done"})

            except Exception as exc:  # noqa: BLE001 - report to client, keep the call alive
                logger.exception("Error handling turn")
                await ws.send_json({"type": "error", "message": str(exc)})
                await ws.send_json({"type": "turn_done"})

    except WebSocketDisconnect:
        logger.info("Call ended (client disconnected)")


async def _handle_audio_turn(audio_bytes: bytes) -> tuple[str | None, str | None, bool]:
    """Decodes the browser's recorded utterance and transcribes it. The
    file is webm/opus (MediaRecorder's default) — faster-whisper's `av`
    dependency decodes that directly, the same as it would a WAV."""
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        result = transcribe(tmp_path)
    finally:
        os.unlink(tmp_path)

    text = result.text.strip()
    if not text:
        return None, None, False
    return text, result.language, result.is_low_confidence
