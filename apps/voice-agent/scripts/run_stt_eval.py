"""
Milestone 3 evaluation: runs faster-whisper against the synthetic English
test set for multiple model sizes, measuring real WER and latency on this
machine — not estimated numbers. Run from apps/voice-agent:

    python -m scripts.run_stt_eval
"""

from __future__ import annotations

import json
from pathlib import Path

from app.eval.wer import word_error_rate
from app.stt.whisper_adapter import transcribe

TEST_AUDIO_DIR = Path(__file__).parent.parent / "test_audio" / "en"
MODEL_SIZES = ["tiny", "base"]


def main() -> None:
    manifest = json.loads((TEST_AUDIO_DIR / "manifest.json").read_text(encoding="utf-8"))

    for model_size in MODEL_SIZES:
        print("=" * 70)
        print(f"Model: {model_size}")
        print("=" * 70)
        total_wer = 0.0
        total_inference_s = 0.0
        total_audio_s = 0.0
        n = 0

        for filename, ground_truth in manifest.items():
            audio_path = TEST_AUDIO_DIR / filename
            result = transcribe(str(audio_path), model_size=model_size)
            wer = word_error_rate(ground_truth, result.text)

            load_note = f" (+{result.model_load_s:.2f}s model load)" if result.model_load_s > 0 else ""
            print(f"\n[{filename}]")
            print(f"  expected:   {ground_truth}")
            print(f"  got:        {result.text}")
            print(f"  language:   {result.language} (p={result.language_probability:.2f})")
            print(f"  WER:        {wer:.2%}")
            print(f"  audio dur:  {result.audio_duration_s:.2f}s | inference: {result.inference_s:.2f}s{load_note}")

            total_wer += wer
            total_inference_s += result.inference_s
            total_audio_s += result.audio_duration_s
            n += 1

        print(f"\n--- {model_size} summary: avg WER {total_wer / n:.2%}, "
              f"total inference {total_inference_s:.2f}s for {total_audio_s:.2f}s of audio "
              f"(realtime factor {total_inference_s / total_audio_s:.2f}x) ---\n")


if __name__ == "__main__":
    main()
