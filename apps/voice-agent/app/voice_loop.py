"""
Milestone 5: the complete microphone-to-audio conversation loop. Turn-based
(record → transcribe → think → speak → repeat), not full-duplex — no
barge-in yet (Milestone 6). This is the smallest version that is honestly a
full spoken conversation, not a demo of disconnected pieces: every stage
below is real (real mic capture, real STT, real LLM, real TTS, real
playback), and every stage's timing is printed so latency is measured, not
assumed.
"""

from __future__ import annotations

import time

from app.agent import SalesAgent
from app.audio.capture import record_until_silence
from app.audio.playback import play
from app.langdetect import UNCLEAR_SPEECH_MESSAGE
from app.llm.ollama_adapter import OllamaAdapter
from app.stt.whisper_adapter import transcribe
from app.tts.piper_adapter import PiperAdapter


def _speak(tts: PiperAdapter, text: str) -> float:
    t0 = time.monotonic()
    result = tts.synthesize(text)
    synth_elapsed = time.monotonic() - t0
    play(result.audio, result.sample_rate)
    return synth_elapsed


def main() -> None:
    print("Loading models (one-time cold start — this is the slow part, see PROGRESS.md)...")
    agent = SalesAgent(llm=OllamaAdapter())
    tts = PiperAdapter()

    greeting = agent.greet()
    print(f"\nagent> {greeting}")
    _speak(tts, greeting)

    print("\nReady. Speak after 'Listening...'. Ctrl+C to end the call.\n")

    try:
        while True:
            print("Listening...")
            t_listen_start = time.monotonic()
            audio = record_until_silence()
            listen_elapsed = time.monotonic() - t_listen_start

            if audio.size == 0:
                print("(heard nothing — try again)\n")
                continue

            t0 = time.monotonic()
            stt_result = transcribe(audio)
            stt_elapsed = time.monotonic() - t0

            user_text = stt_result.text.strip()
            if not user_text or stt_result.is_low_confidence:
                # Measured bug (see PROGRESS.md): unclear/unfamiliar speech was
                # silently transcribed into a plausible-looking but wrong
                # string (e.g. a random number) and fed to the agent as fact.
                # Low-confidence transcripts now get a clarification instead
                # of being trusted.
                print(f"you> (unclear speech — raw transcript was {user_text!r})\nagent> {UNCLEAR_SPEECH_MESSAGE}")
                _speak(tts, UNCLEAR_SPEECH_MESSAGE)
                continue

            print(f"you> {user_text}  [heard in {listen_elapsed:.1f}s, transcribed in {stt_elapsed:.1f}s, lang={stt_result.language}]")

            t_turn_start = time.monotonic()
            first_sentence_at: float | None = None
            reply_parts: list[str] = []
            print("agent> ", end="", flush=True)
            for sentence in agent.step_streaming(user_text):
                if first_sentence_at is None:
                    first_sentence_at = time.monotonic() - t_turn_start
                print(sentence, end="", flush=True)
                reply_parts.append(sentence)
                _speak(tts, sentence.strip())
            print()

            total_turn = time.monotonic() - t_turn_start
            print(f"       [time to first spoken sentence: {first_sentence_at:.1f}s, total turn: {total_turn:.1f}s]\n")

    except KeyboardInterrupt:
        goodbye = "Thanks for calling, goodbye!"
        print(f"\nagent> {goodbye}")
        _speak(tts, goodbye)


if __name__ == "__main__":
    main()
