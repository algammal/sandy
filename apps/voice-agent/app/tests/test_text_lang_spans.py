from app.text_lang_spans import split_by_language


def test_pure_arabic_sentence_stays_one_span():
    text = "تم حفظ بياناتك وسيتواصل معك فريقنا"
    spans = split_by_language(text)
    assert len(spans) == 1
    assert spans[0][1] == "ar"


def test_pure_english_sentence_stays_one_span():
    text = "The Marina View Apartment is available for sale."
    spans = split_by_language(text)
    assert len(spans) == 1
    assert spans[0][1] == "en"


def test_embedded_english_name_in_arabic_sentence_becomes_its_own_span():
    """Regression test for the measured bug: 'Ahmed' was pronounced with
    Arabic phonetic rules because the whole sentence went through one voice."""
    text = "تم حفظ بياناتك يا Ahmed وسيتواصل معك فريقنا"
    spans = split_by_language(text)
    langs = [lang for _, lang in spans]
    texts = [t for t, _ in spans]
    assert "en" in langs
    assert any("Ahmed" in t for t, lang in spans if lang == "en")


def test_price_with_currency_code_stays_together_as_one_english_span():
    text = "السعر 4,200,000 EGP شامل كل شيء"
    spans = split_by_language(text)
    english_spans = [t for t, lang in spans if lang == "en"]
    assert any("4,200,000" in t and "EGP" in t for t in english_spans)


def test_concatenating_all_spans_reproduces_the_original_text_exactly():
    text = "Hi! أهلاً وسهلاً، how can I help you يا صاحبي؟"
    spans = split_by_language(text)
    assert "".join(t for t, _ in spans) == text


def test_empty_text_returns_no_spans():
    assert split_by_language("") == []


def test_leading_whitespace_attaches_to_first_language_span():
    spans = split_by_language("  hello")
    assert spans == [("  hello", "en")]
