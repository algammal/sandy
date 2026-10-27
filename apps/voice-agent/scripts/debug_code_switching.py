"""
Verifies the code-switching fix with real synthesis + round-trip STT:
before this fix, an English name embedded in an Arabic sentence was forced
through the Arabic phonemizer and came out mangled. Checks that the English
span is now pronounced clearly enough for Whisper to transcribe it back
correctly as English.
"""

from __future__ import annotations

import wave
from pathlib import Path

from app.stt.whisper_adapter import transcribe
from app.tts.piper_adapter import PiperAdapter

OUT_DIR = Path(__file__).parent.parent / "test_audio" / "code_switch_check"

CASES = {
    "name_in_arabic.wav": "تم حفظ بياناتك يا Ahmed، وسيتواصل معك فريقنا قريبًا بخصوص هذا العقار.",
    "price_in_arabic.wav": "السعر هو 4,200,000 EGP ويشمل كل الخدمات.",
    "bilingual_greeting.wav": "Hi, thanks for calling Nile Vista Properties! أهلاً وسهلاً، إزاي أقدر أساعدك النهارده؟",
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

    for filename, text in CASES.items():
        result = tts.synthesize(text)  # no language override -> auto script-splitting
        out_path = OUT_DIR / filename
        save_wav(out_path, result.audio, result.sample_rate)

        roundtrip = transcribe(str(out_path))
        print(f"[{filename}]")
        print(f"  input:      {text}")
        print(f"  saved ->    {out_path}")
        print(f"  round-trip: {roundtrip.text!r}  (lang={roundtrip.language})")
        print()


if __name__ == "__main__":
    main()
