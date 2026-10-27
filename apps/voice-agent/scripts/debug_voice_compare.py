"""
A/B comparison for the "sounds robotic" feedback: synthesizes the same
sentence with the current voice (en_US-amy-medium) and a higher-quality tier
(en_US-ryan-high), measuring latency and round-tripping both through Whisper.
Listen to both output files yourself — I have no ears, so I can only confirm
intelligibility, not which one sounds less robotic to a human.
"""

from __future__ import annotations

import time
import wave
from pathlib import Path

from piper import PiperVoice

from app.stt.whisper_adapter import transcribe

OUT_DIR = Path(__file__).parent.parent / "test_audio" / "voice_compare"
MODELS_DIR = Path(__file__).parent.parent / "models" / "piper"

TEXT = "Sure thing! We found a great match for you: the Marina View Apartment, available for 4,200,000 EGP."

VOICES = {
    "amy_medium (current default)": MODELS_DIR / "en_US-amy-medium.onnx",
    "ryan_high (candidate)": MODELS_DIR / "en_US-ryan-high.onnx",
}


def save_wav(path: Path, audio_bytes: bytes, sample_rate: int) -> None:
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_bytes)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for label, model_path in VOICES.items():
        voice = PiperVoice.load(model_path)
        t0 = time.monotonic()
        chunks = list(voice.synthesize(TEXT))
        elapsed = time.monotonic() - t0

        audio_bytes = b"".join(c.audio_int16_bytes for c in chunks)
        sample_rate = chunks[0].sample_rate
        duration_s = len(audio_bytes) / 2 / sample_rate

        out_path = OUT_DIR / f"{label.split()[0]}.wav"
        save_wav(out_path, audio_bytes, sample_rate)

        roundtrip = transcribe(str(out_path))
        print(f"[{label}]")
        print(f"  synth_time={elapsed:.2f}s  audio_duration={duration_s:.2f}s  realtime_factor={elapsed/duration_s:.2f}x")
        print(f"  saved -> {out_path}")
        print(f"  round-trip STT: {roundtrip.text!r}\n")

    print(f"Listen to the files in {OUT_DIR} yourself to judge naturalness — that part needs a human ear.")


if __name__ == "__main__":
    main()
