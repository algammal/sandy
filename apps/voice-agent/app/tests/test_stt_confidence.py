from app.stt.whisper_adapter import TranscriptionResult, TranscriptSegment


def _result(segments: list[TranscriptSegment]) -> TranscriptionResult:
    return TranscriptionResult(
        text=" ".join(s.text for s in segments),
        language="en",
        language_probability=0.9,
        audio_duration_s=2.0,
        inference_s=0.1,
        model_load_s=0.0,
        segments=segments,
    )


def test_confident_segment_is_not_low_confidence():
    result = _result([TranscriptSegment(start=0, end=1, text="hello", avg_logprob=-0.3, no_speech_prob=0.05)])
    assert result.is_low_confidence is False


def test_very_negative_avg_logprob_is_low_confidence():
    """Measured bug: unclear speech got transcribed into a plausible but wrong
    string (e.g. a random number) and was trusted as fact. A sharply negative
    avg_logprob is faster-whisper's own signal that it wasn't confident."""
    result = _result([TranscriptSegment(start=0, end=1, text="500000", avg_logprob=-1.4, no_speech_prob=0.1)])
    assert result.is_low_confidence is True


def test_high_no_speech_probability_is_low_confidence():
    result = _result([TranscriptSegment(start=0, end=1, text="uh", avg_logprob=-0.2, no_speech_prob=0.8)])
    assert result.is_low_confidence is True


def test_no_segments_at_all_is_low_confidence():
    assert _result([]).is_low_confidence is True


def test_one_bad_segment_among_good_ones_can_still_trip_no_speech_check():
    result = _result(
        [
            TranscriptSegment(start=0, end=1, text="hello", avg_logprob=-0.3, no_speech_prob=0.05),
            TranscriptSegment(start=1, end=2, text="???", avg_logprob=-0.4, no_speech_prob=0.9),
        ]
    )
    assert result.is_low_confidence is True
