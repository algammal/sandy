"""
Reproduces (or fails to reproduce) the reported "answers in English then
repeats in Arabic" bug with the real model, so the root cause is confirmed
rather than guessed. Prints every sentence chunk step_streaming() yields,
plus the decided language context and whether a forced tool/template path
was used, so it's clear whether duplication originates in the LLM's own
generation or somewhere else in the pipeline.
"""

from __future__ import annotations

from app.agent import SalesAgent
from app.langdetect import looks_arabic
from app.llm.ollama_adapter import OllamaAdapter

TURNS = [
    "أنا عايز شقة في التجمع الخامس",
    "عايز شقة two bedrooms في New Cairo بجيت خمس مليون",
    "السعر غالي شوية",
]


def main() -> None:
    agent = SalesAgent(llm=OllamaAdapter())
    print("agent>", agent.greet())

    for turn in TURNS:
        print(f"\nyou> {turn}")
        chunks = list(agent.step_streaming(turn))
        for i, chunk in enumerate(chunks):
            arabic = looks_arabic(chunk)
            print(f"  chunk[{i}] (arabic={arabic}): {chunk!r}")
        full = "".join(chunks)
        has_ar = looks_arabic(full)
        has_en = any(c.isalpha() and c.isascii() for c in full)
        print(f"  -> full reply contains Arabic={has_ar}, contains Latin letters={has_en}")


if __name__ == "__main__":
    main()
