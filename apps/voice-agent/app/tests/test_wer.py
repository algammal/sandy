from app.eval.wer import word_error_rate


def test_identical_text_has_zero_wer():
    assert word_error_rate("hello world", "hello world") == 0.0


def test_one_substitution_out_of_two_words():
    assert word_error_rate("hello world", "hello there") == 0.5


def test_case_and_punctuation_insensitive():
    assert word_error_rate("Hello, world!", "hello world") == 0.0


def test_empty_hypothesis_is_total_error():
    assert word_error_rate("hello world", "") == 1.0


def test_empty_reference_with_empty_hypothesis_is_zero():
    assert word_error_rate("", "") == 0.0
