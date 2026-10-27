"""
faster-whisper wrapper. CPU-only on this machine (see PROGRESS.md hardware
report) — int8 compute_type is faster-whisper's recommended setting for CPU
inference, trading a little accuracy for speed on a 2-core machine.

Model size is configurable (env var) rather than hardcoded, per the spec's
"keep the model configuration easy to change" instruction — don't assume
"base" stays the right choice once real Egyptian Arabic audio is evaluated.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field

import numpy as np
from faster_whisper import WhisperModel

DEFAULT_MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "base")

_loaded_models: dict[str, WhisperModel] = {}


@dataclass
class TranscriptSegment:
    start: float
    end: float
    text: str
    avg_logprob: float
    no_speech_prob: float


@dataclass
class TranscriptionResult:
    text: str
    language: str
    language_probability: float
    audio_duration_s: float
    inference_s: float
    model_load_s: float
    segments: list[TranscriptSegment] = field(default_factory=list)

    @property
    def is_low_confidence(self) -> bool:
        """
        Measured bug (see PROGRESS.md): unclear/unfamiliar-dialect speech was
        silently transcribed into plausible-looking garbage (e.g. a random
        digit string) and fed straight into the agent as if it were
        confidently understood — exactly what the spec explicitly warns
        against ("do not silently transform uncertain... into confident
        business facts"). These thresholds are a heuristic starting point
        (faster-whisper community-typical ranges), not calibrated against
        real Egyptian Arabic recordings yet — expect to retune once real
        audio is available.
        """
        if not self.segments:
            return True
        avg_logprob = sum(s.avg_logprob for s in self.segments) / len(self.segments)
        max_no_speech = max(s.no_speech_prob for s in self.segments)
        return avg_logprob < -1.0 or max_no_speech > 0.6


def _get_model(model_size: str) -> WhisperModel:
    if model_size not in _loaded_models:
        _loaded_models[model_size] = WhisperModel(model_size, device="cpu", compute_type="int8")
    return _loaded_models[model_size]


def transcribe(audio: str | np.ndarray, model_size: str = DEFAULT_MODEL_SIZE) -> TranscriptionResult:
    """`audio` is either a file path (str) or int16 mono PCM samples at 16kHz
    (e.g. straight from app.audio.capture) — the live voice loop passes the
    array directly, skipping a disk round-trip."""
    load_start = time.monotonic()
    already_loaded = model_size in _loaded_models
    model = _get_model(model_size)
    model_load_s = 0.0 if already_loaded else (time.monotonic() - load_start)

    if isinstance(audio, np.ndarray):
        audio = audio.astype(np.float32) / 32768.0

    infer_start = time.monotonic()
    segments_iter, info = model.transcribe(audio, beam_size=5)
    segments = [
        TranscriptSegment(start=s.start, end=s.end, text=s.text.strip(), avg_logprob=s.avg_logprob, no_speech_prob=s.no_speech_prob)
        for s in segments_iter
    ]
    inference_s = time.monotonic() - infer_start

    return TranscriptionResult(
        text=" ".join(s.text for s in segments).strip(),
        language=info.language,
        language_probability=info.language_probability,
        audio_duration_s=info.duration,
        inference_s=inference_s,
        model_load_s=model_load_s,
        segments=segments,
    )
