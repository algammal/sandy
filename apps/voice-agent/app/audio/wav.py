"""Pure helper: wraps raw int16 PCM samples in a WAV container, in memory.
Used by the web server to send Piper's output to the browser as playable
audio without touching disk."""

from __future__ import annotations

import io
import wave

import numpy as np


def pcm_to_wav_bytes(audio: np.ndarray, sample_rate: int) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio.tobytes())
    return buffer.getvalue()
