"""Isolates whether qwen2.5:1.5b can invoke tools via Ollama at all, with a
minimal single-tool prompt, before blaming the agent's own prompt/loop."""

from __future__ import annotations

import json

from app.llm.ollama_adapter import OllamaAdapter

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_properties",
            "description": "Search for real estate properties by area and budget.",
            "parameters": {
                "type": "object",
                "properties": {
                    "area": {"type": "string"},
                    "max_budget_egp": {"type": "integer"},
                },
            },
        },
    }
]

MESSAGES = [
    {"role": "system", "content": "You are a real estate assistant. You MUST call the search_properties tool whenever the user gives search criteria. Never answer from memory."},
    {"role": "user", "content": "I want an apartment in New Cairo under 5 million pounds."},
]

if __name__ == "__main__":
    adapter = OllamaAdapter()
    result = adapter.chat(MESSAGES, tools=TOOLS)
    print(json.dumps(result, indent=2, ensure_ascii=False))
