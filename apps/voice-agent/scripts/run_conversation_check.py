"""
Manual Milestone-2 verification script — scripted multi-turn conversation
against the real local LLM (not a pytest unit test: it needs Ollama running
and takes real wall-clock time). Run from apps/voice-agent:

    python -m scripts.run_conversation_check

Prints the transcript, every tool call made, and per-turn latency so results
are measured, not claimed.
"""

from __future__ import annotations

import time

from app.agent import SalesAgent
from app.llm.ollama_adapter import OllamaAdapter

SCRIPT = [
    "Hi, I'm looking to buy an apartment.",
    "New Cairo please.",
    "My budget is around 5 million pounds, 2 bedrooms.",
    "عايز اعرف لو في حاجة في مدينة نصر كمان",  # code-switch: "I want to know if there's anything in Nasr City too" — tests grounded empty result
    "Ok I'm interested in the Marina View Apartment. My name is Ahmed, phone 01099998888, yes you can contact me.",
    "Actually can I speak to a real person instead?",
]


def main() -> None:
    agent = SalesAgent(llm=OllamaAdapter())

    print("=" * 70)
    t0 = time.monotonic()
    greeting = agent.greet()
    print(f"[{time.monotonic() - t0:.2f}s] agent> {greeting}\n")

    for user_text in SCRIPT:
        print(f"you> {user_text}")
        t0 = time.monotonic()
        reply = agent.step(user_text)
        elapsed = time.monotonic() - t0
        print(f"[{elapsed:.2f}s] agent> {reply}\n")

    print("=" * 70)
    print("Final state:", agent.state)
    print("\nTool call log:")
    for entry in agent.state.tool_call_log:
        print(f"  - {entry['tool']}({entry['args']}) -> {entry['result']}")


if __name__ == "__main__":
    main()
