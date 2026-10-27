"""
Text-only test harness for Milestone 2 — no audio involved yet.
Run from apps/voice-agent with:  python -m app.cli
"""

from __future__ import annotations

import json

from app.agent import SalesAgent
from app.llm.ollama_adapter import OllamaAdapter


def main() -> None:
    agent = SalesAgent(llm=OllamaAdapter())
    print(agent.greet())
    print("(type 'quit' to exit, 'debug' to print the current conversation state + tool call log)\n")

    while True:
        try:
            user_text = input("you> ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not user_text:
            continue
        if user_text.lower() in {"quit", "exit"}:
            break
        if user_text.lower() == "debug":
            print(json.dumps(agent.state.__dict__, indent=2, default=str, ensure_ascii=False))
            continue

        reply = agent.step(user_text)
        print(f"agent> {reply}\n")


if __name__ == "__main__":
    main()
