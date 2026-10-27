"""
Piper TTS wrapper (CPU, ONNX runtime — same approach as faster-whisper). Piper
is MIT-licensed and fully local; voice *models* are separately licensed per
model card (checked below), not blanket-covered by Piper's own license.

IMPORTANT, measured gap (see PROGRESS.md Milestone 4): Piper's public voice
catalog (huggingface.co/rhasspy/piper-voices/voices.json, checked directly,
not assumed) has exactly one Arabic voice family: `ar_JO-kareem` — Jordanian
Arabic, male. There is no Egyptian Arabic voice. Using it for Egyptian-dialect
text will produce a real voice reading the text with Jordanian-accented MSA
phonetics, not authentic Egyptian pronunciation. This is the closest available
free/local option, not a validated Egyptian Arabic voice — don't present it to
an end user as "our Egyptian Arabic voice" without saying so.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from piper import PiperVoice

from app.text_lang_spans import split_by_language
from app.tts.base import TtsAdapter

# Brief pause between spans of different languages so a code-switch reads as
# a deliberate language change, not a jarring mid-word cut. Both current
# voices output 22050Hz, so a fixed sample count is fine; if a voice at a
# different rate is ever added, this needs to become per-span-rate aware.
_SWITCH_PAUSE_SAMPLES = 2205  # 100ms @ 22050Hz

MODELS_DIR = Path(__file__).parent.parent.parent / "models" / "piper"

VOICE_FILES = {
    "en": MODELS_DIR / "en_US-amy-medium.onnx",
    "ar": MODELS_DIR / "ar_JO-kareem-medium.onnx",  # Jordanian — see module docstring
}

_loaded_voices: dict[str, PiperVoice] = {}


def _get_voice(language: str) -> PiperVoice:
    if language not in _loaded_voices:
        model_path = VOICE_FILES[language]
        if not model_path.exists():
            raise FileNotFoundError(
                f"Piper voice model not found at {model_path}. Run: "
                f"python -m piper.download_voices --download-dir models/piper "
                f"{'ar_JO-kareem-medium' if language == 'ar' else 'en_US-amy-medium'}"
            )
        _loaded_voices[language] = PiperVoice.load(model_path)
    return _loaded_voices[language]


@dataclass
class SynthesisResult:
    audio: np.ndarray
    sample_rate: int
    synth_s: float
    model_load_s: float


class PiperAdapter(TtsAdapter):
    def synthesize(self, text: str, language: str | None = None) -> SynthesisResult:
        if language is not None:
            # Explicit override (debug/test use) — force the whole text
            # through one voice, no script splitting.
            return self._synthesize_one_voice(text, language)
        return self._synthesize_mixed(text)

    def _synthesize_one_voice(self, text: str, lang: str) -> SynthesisResult:
        load_start = time.monotonic()
        already_loaded = lang in _loaded_voices
        voice = _get_voice(lang)
        model_load_s = 0.0 if already_loaded else (time.monotonic() - load_start)

        synth_start = time.monotonic()
        chunks = list(voice.synthesize(text))
        synth_s = time.monotonic() - synth_start

        if not chunks:
            return SynthesisResult(np.zeros(0, dtype=np.int16), voice.config.sample_rate, synth_s, model_load_s)

        audio = np.concatenate([chunk.audio_int16_array for chunk in chunks])
        return SynthesisResult(audio, chunks[0].sample_rate, synth_s, model_load_s)

    def _synthesize_mixed(self, text: str) -> SynthesisResult:
        """
        Splits the text by script and synthesizes each span with the correct
        voice (see app/text_lang_spans.py), then stitches the results
        together with a short pause at each language switch. Measured bug
        this fixes: an English name/price embedded in an Arabic sentence
        used to be forced through the Arabic phonemizer and came out
        mangled. This produces correct per-language pronunciation — it does
        NOT produce one seamless bilingual voice identity (Piper has no such
        capability; this alternates between two distinct voice models).
        """
        spans = split_by_language(text)
        if not spans:
            return SynthesisResult(np.zeros(0, dtype=np.int16), 22050, 0.0, 0.0)

        audio_parts: list[np.ndarray] = []
        sample_rate = 22050
        total_synth_s = 0.0
        total_model_load_s = 0.0

        last_span_index = len(spans) - 1

        for i, (span_text, lang) in enumerate(spans):
            stripped = span_text.strip()
            if not stripped:
                continue
            # Measured fix: a SHORT span synthesized in total isolation (e.g.
            # a single embedded name, no following punctuation because the
            # next span is a different language) came out mispronounced
            # ("Ahmed" -> "Ah, Fmit"). Giving it a terminal period for
            # synthesis purposes only (not stored anywhere) measurably
            # improved it ("Ahmed." -> "Athmed."). Measured the opposite for
            # a LONGER span ("4,200,000 EGP"): adding the period made the
            # round-trip transcription worse (the numbers dropped out
            # entirely), so this is deliberately scoped to short spans only,
            # not applied universally.
            synth_text = span_text
            if i != last_span_index and len(stripped) <= 20 and stripped[-1] not in ".!?؟،,":
                synth_text = span_text + "."
            result = self._synthesize_one_voice(synth_text, lang)
            total_synth_s += result.synth_s
            total_model_load_s += result.model_load_s
            sample_rate = result.sample_rate
            if audio_parts and spans[i - 1][1] != lang:
                audio_parts.append(np.zeros(_SWITCH_PAUSE_SAMPLES, dtype=np.int16))
            audio_parts.append(result.audio)

        if not audio_parts:
            return SynthesisResult(np.zeros(0, dtype=np.int16), sample_rate, total_synth_s, total_model_load_s)

        return SynthesisResult(np.concatenate(audio_parts), sample_rate, total_synth_s, total_model_load_s)
