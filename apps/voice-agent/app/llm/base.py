"""Model-adapter interface so the LLM backend can be swapped later without touching agent.py."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Iterator


class LlmAdapter(ABC):
    @abstractmethod
    def chat(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """Returns one assistant message dict, e.g. {"role": "assistant", "content": "...", "tool_calls": [...]}."""
        raise NotImplementedError

    def chat_stream(self, messages: list[dict[str, Any]]) -> Iterator[str]:
        """Optional: yields content deltas for plain-text (no tool) calls, to
        let the voice loop start speaking before the full reply is ready.
        Not abstract — an adapter that doesn't implement streaming can skip it
        and callers fall back to the blocking `chat`."""
        raise NotImplementedError
