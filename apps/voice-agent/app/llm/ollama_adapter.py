from __future__ import annotations

import json
import os
from typing import Any, Iterator

import requests

from app.llm.base import LlmAdapter

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("VOICE_AGENT_MODEL", "qwen2.5:1.5b")


class OllamaAdapter(LlmAdapter):
    """Thin wrapper over Ollama's /api/chat. Swappable: see app/llm/base.py."""

    def __init__(self, model: str = OLLAMA_MODEL, host: str = OLLAMA_HOST, temperature: float = 0.3):
        self.model = model
        self.host = host
        self.temperature = temperature

    def chat(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": self.temperature},
        }
        if tools:
            payload["tools"] = tools

        try:
            response = requests.post(f"{self.host}/api/chat", json=payload, timeout=120)
            response.raise_for_status()
        except requests.exceptions.ConnectionError as exc:
            raise RuntimeError(
                f"Could not reach Ollama at {self.host}. Is 'ollama serve' running and is the '{self.model}' model pulled?"
            ) from exc

        data = response.json()
        message = data.get("message", {})
        return {
            "role": "assistant",
            "content": message.get("content", ""),
            "tool_calls": message.get("tool_calls", []),
        }

    def chat_stream(self, messages: list[dict[str, Any]]) -> Iterator[str]:
        """Yields content deltas as they arrive. No tool support — only used
        for plain-text phrasing calls (see agent.py), so this doesn't need to
        handle tool_calls arriving mid-stream."""
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "options": {"temperature": self.temperature},
        }
        try:
            response = requests.post(f"{self.host}/api/chat", json=payload, timeout=120, stream=True)
            response.raise_for_status()
        except requests.exceptions.ConnectionError as exc:
            raise RuntimeError(
                f"Could not reach Ollama at {self.host}. Is 'ollama serve' running and is the '{self.model}' model pulled?"
            ) from exc

        for line in response.iter_lines():
            if not line:
                continue
            chunk = json.loads(line)
            delta = chunk.get("message", {}).get("content", "")
            if delta:
                yield delta
            if chunk.get("done"):
                break
