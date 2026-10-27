from app.text_chunking import stream_sentences


def test_splits_on_sentence_boundaries_across_chunks():
    chunks = ["Hello there", ". How are", " you? Fine", "!"]
    sentences = list(stream_sentences(chunks))
    assert sentences == ["Hello there.", " How are you?", " Fine!"]


def test_single_chunk_with_multiple_sentences():
    sentences = list(stream_sentences(["One. Two. Three."]))
    assert sentences == ["One.", " Two.", " Three."]


def test_trailing_text_without_terminal_punctuation_is_still_yielded():
    sentences = list(stream_sentences(["No ending punctuation here"]))
    assert sentences == ["No ending punctuation here"]


def test_arabic_question_mark_is_a_sentence_boundary():
    sentences = list(stream_sentences(["هل تريد المساعدة؟", " بالتأكيد."]))
    assert sentences == ["هل تريد المساعدة؟", " بالتأكيد."]


def test_concatenating_all_chunks_reproduces_original_text_exactly():
    original_parts = ["Part one. ", "Part two! ", "Part three?"]
    full_text = "".join(original_parts)
    reconstructed = "".join(stream_sentences(original_parts))
    assert reconstructed == full_text


def test_empty_input_yields_nothing():
    assert list(stream_sentences([])) == []
