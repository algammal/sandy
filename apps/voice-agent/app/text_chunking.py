"""
Splits a stream of text deltas (as they arrive from an LLM) into complete
sentences as soon as each one is finished — lets the voice loop start TTS on
sentence 1 while the LLM is still generating sentence 2, instead of waiting
for the whole reply. Pure and deterministic: concatenating every yielded
piece reproduces the original streamed text exactly, so callers can safely
join them back together (e.g. to record full conversation history) without
losing or duplicating any character.
"""

from __future__ import annotations

from typing import Iterable, Iterator

SENTENCE_END_CHARS = ".!?؟"  # includes the Arabic question mark


def stream_sentences(chunks: Iterable[str]) -> Iterator[str]:
    buffer = ""
    for chunk in chunks:
        buffer += chunk
        while True:
            idx = next((i for i, ch in enumerate(buffer) if ch in SENTENCE_END_CHARS), None)
            if idx is None:
                break
            yield buffer[: idx + 1]
            buffer = buffer[idx + 1 :]
    if buffer:
        yield buffer
