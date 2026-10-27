"""Model-adapter interface for TTS, mirroring app/llm/base.py and app/stt's
pattern — swappable, so Piper isn't permanently load-bearing."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class TtsAdapter(ABC):
    @abstractmethod
    def synthesize(self, text: str, language: str | None = None) -> Any:
        """Returns a result with at least .audio (int16 PCM) and .sample_rate — see piper_adapter.SynthesisResult."""
        raise NotImplementedError
