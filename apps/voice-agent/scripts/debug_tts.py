"""Smoke test for the Piper TTS adapter — synthesizes English and Arabic
sentences to WAV files and prints timing, so results are measured, not
assumed to work."""

from __future__ import annotations

import wave
from pathlib import Path

from app.stt.whisper_adapter import transcribe
from app.tts.piper_adapter import PiperAdapter

OUT_DIR = Path(__file__).parent.parent / "test_audio" / "tts_debug"

SAMPLES = {
    "en_greeting.wav": "Hi, thanks for calling Nile Vista Properties! Are you looking to buy, rent, or just get some information today?",
    "en_price.wav": "The Marina View Apartment is listed for sale at 4,200,000 EGP.",
    "ar_zero_match.wav": "للأسف لا يوجد لدينا أي عقارات متاحة تطابق هذا الطلب حاليًا. هل تود تعديل المنطقة أو الميزانية؟",
}


def save_wav(path: Path, audio, sample_rate: int) -> None:
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio.tobytes())


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tts = PiperAdapter()

    for filename, text in SAMPLES.items():
        result = tts.synthesize(text)
        duration_s = len(result.audio) / result.sample_rate

        out_path = OUT_DIR / filename
        save_wav(out_path, result.audio, result.sample_rate)
        load_note = f" (+{result.model_load_s:.2f}s model load)" if result.model_load_s > 0 else ""
        print(f"[{filename}] text={text!r}")
        print(f"  sample_rate={result.sample_rate}  audio_duration={duration_s:.2f}s  synth_time={result.synth_s:.2f}s{load_note}  "
              f"realtime_factor={result.synth_s / duration_s:.2f}x")
        print(f"  saved -> {out_path}")

        # Self-check: I have no ears, so round-trip the synthesized audio back
        # through faster-whisper. A close match means the output is at least
        # intelligible speech, not garbage audio — it says nothing about
        # whether a human would judge the accent/dialect as natural.
        stt_result = transcribe(str(out_path), model_size="base")
        print(f"  round-trip STT ({stt_result.language}): {stt_result.text!r}\n")


if __name__ == "__main__":
    main()
