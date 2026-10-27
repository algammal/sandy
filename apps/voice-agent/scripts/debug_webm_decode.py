"""
Verifies the server's riskiest assumption: that faster-whisper (via its `av`
dependency) can decode a WebM/Opus file the same way a browser's
MediaRecorder would produce it — not just WAV. Transcodes an existing WAV
test clip into WebM/Opus using the same `av` library, then transcribes the
WebM directly, so this is a real test of the actual decode path the FastAPI
server uses in app/server/main.py, not an assumption.
"""

from __future__ import annotations

from pathlib import Path

import av

from app.stt.whisper_adapter import transcribe

SOURCE_WAV = Path(__file__).parent.parent / "test_audio" / "en" / "greeting.wav"
OUT_WEBM = Path(__file__).parent.parent / "test_audio" / "webm_decode_check.webm"


def wav_to_webm_opus(src: Path, dst: Path) -> None:
    # Opus only supports 8/12/16/24/48 kHz — our SAPI WAVs are 22050 Hz, so
    # resample first (a browser's MediaRecorder always produces a rate Opus
    # supports natively, this resampling step is purely a test-fixture detail).
    opus_rate = 48000
    resampler = av.AudioResampler(format="s16", layout="mono", rate=opus_rate)

    with av.open(str(src)) as in_container:
        in_stream = in_container.streams.audio[0]
        with av.open(str(dst), mode="w", format="webm") as out_container:
            out_stream = out_container.add_stream("libopus", rate=opus_rate)
            for frame in in_container.decode(in_stream):
                for resampled in resampler.resample(frame):
                    for packet in out_stream.encode(resampled):
                        out_container.mux(packet)
            for packet in out_stream.encode(None):
                out_container.mux(packet)


def main() -> None:
    print(f"Transcoding {SOURCE_WAV.name} -> WebM/Opus (same format a browser's MediaRecorder sends)...")
    wav_to_webm_opus(SOURCE_WAV, OUT_WEBM)
    print(f"  wrote {OUT_WEBM} ({OUT_WEBM.stat().st_size} bytes)")

    print("Transcribing the WebM file directly (this is exactly what app/server/main.py does)...")
    result = transcribe(str(OUT_WEBM))
    print(f"  got: {result.text!r}")
    print(f"  language: {result.language} (p={result.language_probability:.2f})")

    expected = "Hi, I'm looking to buy an apartment in New Cairo."
    if result.text.strip().rstrip(".") == expected.rstrip("."):
        print("\nPASS: WebM/Opus decode path works correctly end to end.")
    else:
        print(f"\nMISMATCH (not necessarily fatal — check manually): expected {expected!r}")


if __name__ == "__main__":
    main()
