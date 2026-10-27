"""Shared by agent.py (phrasing language) and the TTS adapter (voice selection)."""

from __future__ import annotations


def looks_arabic(text: str) -> bool:
    return any("؀" <= ch <= "ۿ" for ch in text)


# Bilingual on purpose — if speech was unclear enough to distrust, we don't
# reliably know which language was intended either, so say it in both.
UNCLEAR_SPEECH_MESSAGE = (
    "Sorry, I didn't catch that clearly — could you say that again؟ "
    "معلش، مش قادر أسمعك كويس، تقدر تكرر اللي قلته؟"
)
