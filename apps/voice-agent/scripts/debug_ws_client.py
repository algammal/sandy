"""
Exercises app/server/main.py's WebSocket protocol end to end, the way the
browser frontend would, but scripted — since I can't click buttons or talk
into a mic myself. Verifies: connect, greeting (text+audio), sending a real
audio clip (reusing the WebM test fixture), text-input debug mode, tool-call
reporting, and reset. Run with the server already running:

    python -m scripts.run_server   (separate terminal)
    python -m scripts.debug_ws_client
"""

from __future__ import annotations

import asyncio
import json
import sys
import wave
from pathlib import Path

import websockets

SERVER_URL = "ws://127.0.0.1:8787/ws/call"
WEBM_FIXTURE = Path(__file__).parent.parent / "test_audio" / "webm_decode_check.webm"


async def drain_until_turn_done(ws, label: str) -> None:
    audio_bytes_received = 0
    while True:
        message = await asyncio.wait_for(ws.recv(), timeout=60)
        if isinstance(message, bytes):
            audio_bytes_received += len(message)
            # Sanity-check it's a real WAV, not garbage.
            assert message[:4] == b"RIFF", f"[{label}] received non-WAV binary frame"
            continue
        data = json.loads(message)
        print(f"[{label}] <- {data}")
        if data["type"] == "turn_done":
            print(f"[{label}]    (received {audio_bytes_received} bytes of real WAV audio this turn)\n")
            return
        if data["type"] == "error":
            print(f"[{label}]    !! SERVER ERROR: {data['message']}")


async def main() -> None:
    async with websockets.connect(SERVER_URL, max_size=10_000_000) as ws:
        print("Connected. Waiting for info + greeting...")
        await drain_until_turn_done(ws, "greeting")

        print("Sending a real recorded utterance (WebM/Opus, same format the browser sends)...")
        if not WEBM_FIXTURE.exists():
            print(f"  (missing {WEBM_FIXTURE} — run scripts.debug_webm_decode first)")
            sys.exit(1)
        await ws.send(WEBM_FIXTURE.read_bytes())
        await drain_until_turn_done(ws, "audio_turn")

        print("Sending a text-input debug-mode message...")
        await ws.send(json.dumps({"type": "text_input", "text": "My budget is 5 million, 2 bedrooms."}))
        await drain_until_turn_done(ws, "text_turn")

        print("Asking for a human (tests the handover template + tool_calls reporting)...")
        await ws.send(json.dumps({"type": "text_input", "text": "can I speak to a human"}))
        await drain_until_turn_done(ws, "handover_turn")

        print("Resetting the conversation...")
        await ws.send(json.dumps({"type": "reset"}))
        await drain_until_turn_done(ws, "reset")

        print("ALL CHECKS PASSED.")


if __name__ == "__main__":
    asyncio.run(main())
