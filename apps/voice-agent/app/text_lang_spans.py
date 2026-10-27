"""
Splits mixed Arabic/English text into language-homogeneous spans, so each
span can be synthesized with the correct voice instead of forcing an entire
mixed sentence through one phonemizer.

Measured bug this fixes (see PROGRESS.md): a sentence like "تم حفظ بياناتك يا
Ahmed" was synthesized entirely through the Arabic voice, which tried to
pronounce "Ahmed" using Arabic phonetic rules — mangled. With this splitter,
"Ahmed" becomes its own span and is synthesized with the English voice
instead.

Classification is per-character: Arabic-block letters (and Arabic
punctuation, which shares the same Unicode block) are 'ar'; Latin letters and
digits are 'en'. Whitespace and other neutral punctuation don't start a new
span on their own — they're attached to whichever span they're adjacent to —
so an ordinary Arabic sentence with regular spaces doesn't get needlessly
fragmented into one span per word.
"""

from __future__ import annotations


def _char_lang(ch: str) -> str | None:
    if "؀" <= ch <= "ۿ":
        return "ar"
    if ch.isalpha() or ch.isdigit():
        return "en"
    return None  # neutral: space, latin punctuation, etc.


def split_by_language(text: str) -> list[tuple[str, str]]:
    """Returns [(span_text, 'ar'|'en'), ...]. Concatenating every span_text
    reproduces the original text exactly."""
    spans: list[tuple[str, str]] = []
    current_lang: str | None = None
    buffer: list[str] = []

    for ch in text:
        lang = _char_lang(ch)
        if lang is None:
            buffer.append(ch)
            continue
        if current_lang is None or lang == current_lang:
            current_lang = lang
            buffer.append(ch)
        else:
            spans.append(("".join(buffer), current_lang))
            buffer = [ch]
            current_lang = lang

    if buffer:
        spans.append(("".join(buffer), current_lang or "en"))

    return spans
