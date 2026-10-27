from __future__ import annotations

import numpy as np
import sounddevice as sd


def play(audio: np.ndarray, sample_rate: int) -> None:
    if audio.size == 0:
        return
    sd.play(audio, sample_rate)
    sd.wait()
