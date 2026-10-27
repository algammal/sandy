"""
Full-pipeline automated check: STT -> Agent -> TTS, driven by the existing
synthetic test WAVs instead of a live microphone (I have no voice or ears to
test the live mic path myself — see voice_loop.py docstring and PROGRESS.md.
A human needs to run `python -m app.voice_loop` to validate that part).

This DOES validate, with real measurements: does audio-in correctly reach
the agent as text, does the agent's grounded reply get synthesized back to
audio, and is that output audio intelligible (round-tripped through Whisper
again). Run from apps/voice-agent:

    python -m scripts.run_voice_pipeline_check
"""

from __future__ import annotations

import time
import wave
from pathlib import Path

import numpy as np

from app.agent import SalesAgent
from app.llm.ollama_adapter import OllamaAdapter
from app.stt.whisper_adapter import transcribe
from app.tts.piper_adapter import PiperAdapter

TEST_AUDIO_DIR = Path(__file__).parent.parent / "test_audio" / "en"
OUT_DIR = Path(__file__).parent.parent / "test_audio" / "pipeline_check"

# Simulated caller turns, in order — reusing Milestone 3's test clips as if
# they were live microphone input for this turn.
CALLER_TURNS = ["greeting.wav", "bedrooms_area.wav", "property_name.wav"]


def save_wav(path: Path, audio, sample_rate: int) -> None:
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio.tobytes())


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    agent = SalesAgent(llm=OllamaAdapter())
    tts = PiperAdapter()

    greeting = agent.greet()
    print(f"agent (greeting)> {greeting}\n")

    for i, filename in enumerate(CALLER_TURNS, start=1):
        audio_path = TEST_AUDIO_DIR / filename
        print(f"--- turn {i}: simulated caller audio = {filename} ---")

        t0 = time.monotonic()
        stt_result = transcribe(str(audio_path))
        stt_s = time.monotonic() - t0
        print(f"you (from audio)> {stt_result.text}  [STT: {stt_s:.2f}s]")

        t_turn_start = time.monotonic()
        first_sentence_at = None
        sentence_audios = []
        reply_parts = []
        for sentence in agent.step_streaming(stt_result.text):
            if first_sentence_at is None:
                first_sentence_at = time.monotonic() - t_turn_start
            reply_parts.append(sentence)
            tts_result = tts.synthesize(sentence.strip())
            sentence_audios.append(tts_result.audio)

        reply = "".join(reply_parts)
        full_audio = np.concatenate(sentence_audios) if sentence_audios else np.zeros(0, dtype=np.int16)
        total_s = time.monotonic() - t_turn_start
        print(f"agent> {reply}")
        print(f"       [time to first sentence: {first_sentence_at:.2f}s, total (agent+TTS): {total_s:.2f}s]")

        out_path = OUT_DIR / f"turn_{i}_reply.wav"
        save_wav(out_path, full_audio, 22050)
        roundtrip = transcribe(str(out_path))
        print(f"       [saved -> {out_path}]")
        print(f"       [round-trip STT of agent's own voice: {roundtrip.text!r}]\n")


if __name__ == "__main__":
    main()
