"""
Deliberately simple energy/RMS-threshold voice activity detector — no extra
native-extension dependency (webrtcvad needs a C compiler on Windows, which
this machine may not have set up; this is pure numpy). Good enough to detect
end-of-turn in a quiet-ish room for Milestone 5's basic pipeline. A proper
VAD model is a reasonable Milestone 6 upgrade if this proves too noise-
sensitive in practice — that's a real-world-testing judgment, not something
to pre-emptively over-engineer here.
"""

from __future__ import annotations

import numpy as np


def rms(frame: np.ndarray) -> float:
    if frame.size == 0:
        return 0.0
    samples = frame.astype(np.float64)
    return float(np.sqrt(np.mean(samples * samples)))


class EnergyVad:
    def __init__(self, noise_multiplier: float = 3.0, min_threshold: float = 150.0):
        self.noise_multiplier = noise_multiplier
        self.min_threshold = min_threshold
        self.threshold = min_threshold

    def calibrate(self, ambient_frames: list[np.ndarray]) -> None:
        if not ambient_frames:
            self.threshold = self.min_threshold
            return
        ambient_rms = max(rms(frame) for frame in ambient_frames)
        self.threshold = max(self.min_threshold, ambient_rms * self.noise_multiplier)

    def is_speech(self, frame: np.ndarray) -> bool:
        return rms(frame) > self.threshold
