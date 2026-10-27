"""
Microphone capture, turn-based (record until the caller stops talking, then
return) — not full-duplex streaming. Barge-in / interrupting the agent while
it speaks is explicitly a later milestone; this is the Milestone 5 baseline:
a complete, working mic-to-text turn, nothing fancier yet.
"""

from __future__ import annotations

import numpy as np
import sounddevice as sd

from app.audio.vad import EnergyVad

SAMPLE_RATE = 16000  # Whisper's native rate — avoids a resample step
FRAME_MS = 30
FRAME_SAMPLES = SAMPLE_RATE * FRAME_MS // 1000
CALIBRATION_S = 0.4
SILENCE_TO_STOP_S = 1.0
MAX_UTTERANCE_S = 20.0
MIN_SPEECH_S = 0.3  # ignore a stray cough/click as a full utterance


def record_until_silence() -> np.ndarray:
    """Blocks until the caller finishes speaking (or MAX_UTTERANCE_S is hit).
    Returns int16 mono samples at SAMPLE_RATE, or an empty array if nothing
    but silence was heard."""
    vad = EnergyVad()
    frames: list[np.ndarray] = []
    calibration_frames: list[np.ndarray] = []

    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="int16", blocksize=FRAME_SAMPLES) as stream:
        n_calibration_frames = int(CALIBRATION_S * 1000 / FRAME_MS)
        for _ in range(n_calibration_frames):
            frame, _ = stream.read(FRAME_SAMPLES)
            calibration_frames.append(frame[:, 0])
        vad.calibrate(calibration_frames)

        speech_frames = 0
        silence_frames_after_speech = 0
        frames_per_second = 1000 / FRAME_MS
        max_frames = int(MAX_UTTERANCE_S * frames_per_second)
        silence_frames_to_stop = int(SILENCE_TO_STOP_S * frames_per_second)
        min_speech_frames = int(MIN_SPEECH_S * frames_per_second)

        for _ in range(max_frames):
            frame, _ = stream.read(FRAME_SAMPLES)
            frame = frame[:, 0]
            frames.append(frame)

            if vad.is_speech(frame):
                speech_frames += 1
                silence_frames_after_speech = 0
            elif speech_frames >= min_speech_frames:
                silence_frames_after_speech += 1
                if silence_frames_after_speech >= silence_frames_to_stop:
                    break

    if speech_frames < min_speech_frames:
        return np.zeros(0, dtype=np.int16)

    return np.concatenate(frames)
