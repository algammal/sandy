from typing import Any

from app.agent import SalesAgent, _is_grounded
from app.llm.base import LlmAdapter


class FakeLlm(LlmAdapter):
    """Returns canned replies in order, no network/Ollama required."""

    def __init__(self, replies: list[str] | None = None):
        self.replies = list(replies or [])
        self.calls: list[list[dict[str, Any]]] = []

    def chat(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        self.calls.append(messages)
        content = self.replies.pop(0) if self.replies else "ok"
        return {"role": "assistant", "content": content, "tool_calls": []}


def test_mentioning_a_property_by_name_forces_a_fresh_lookup_even_without_new_search_criteria():
    """Regression test: see PROGRESS.md Milestone 6 — a direct follow-up
    naming a property that had already been searched for didn't re-trigger a
    tool call, so the LLM answered from its own (hallucination-prone) memory
    of the conversation instead of a fresh, grounded fact."""
    agent = SalesAgent(llm=FakeLlm(["(phrased search result)", "(phrased property details)"]))
    agent.greet()
    agent.step("I want to buy a 2 bedroom apartment in New Cairo")
    assert agent.state.tool_call_log[-1]["tool"] == "search_properties"

    agent.step("Can you tell me about the Marina View Apartment?")
    assert agent.state.tool_call_log[-1]["tool"] == "get_property_by_id"
    assert agent.state.tool_call_log[-1]["args"] == {"property_id": "NV-101"}


def test_zero_match_search_never_reaches_the_llm():
    """The LLM must never be trusted to phrase a zero-match result (measured
    to hallucinate availability in Arabic) — it should be templated instead."""
    llm = FakeLlm()
    agent = SalesAgent(llm=llm)
    agent.greet()
    agent.step("I want a 2 bedroom apartment in North Coast")  # the only North Coast apartment in the dataset is sold
    assert agent.state.tool_call_log[-1]["tool"] == "search_properties"
    assert agent.state.tool_call_log[-1]["result"]["count"] == 0
    assert len(llm.calls) == 0  # templated reply, no LLM call made at all


def test_human_handover_only_fires_once():
    llm = FakeLlm()
    agent = SalesAgent(llm=llm)
    agent.greet()
    agent.step("can I speak to a human")
    agent.step("hello? anyone there?")
    handover_calls = [e for e in agent.state.tool_call_log if e["tool"] == "request_human_handover"]
    assert len(handover_calls) == 1


def test_a_reply_ignoring_the_tool_result_is_rejected_then_retried():
    """Measured bug: given a correctly grounded prompt, qwen2.5:1.5b sometimes
    ignores the tool result entirely and says something unrelated. That must
    be rejected and retried, not trusted into history."""
    llm = FakeLlm(["Sorry, we only handle rentals, I can't help with that.", "Marina View Apartment is available for 4,200,000 EGP."])
    agent = SalesAgent(llm=llm)
    agent.greet()
    reply = agent.step("I want a 2 bedroom apartment in New Cairo")
    assert "Marina View Apartment" in reply
    assert "only handle rentals" not in agent.history[-1]["content"]


def test_a_reply_with_the_wrong_currency_is_rejected_then_retried():
    """Measured bug: across repeated test calls, the model sometimes stated
    the wrong currency (Sterling, UAE dirham) despite being told to copy an
    exact pre-formatted string. Must be caught and retried."""
    llm = FakeLlm(["It's priced at 4,200,000 dirham.", "Marina View Apartment is available for 4,200,000 EGP."])
    agent = SalesAgent(llm=llm)
    agent.greet()
    reply = agent.step("I want a 2 bedroom apartment in New Cairo")
    assert "dirham" not in reply.lower()
    assert "Marina View Apartment" in reply


def test_a_reply_that_fails_grounding_twice_falls_back_to_a_deterministic_summary():
    """If the model fails the grounding check on every attempt, the agent
    must still produce a correct, grounded reply — never let two bad
    attempts become the final answer, since a bad reply written into history
    was measured to poison every subsequent turn (the "stuck repeating the
    same wrong answer" bug)."""
    llm = FakeLlm(["Sorry, we don't do that.", "It's 4,200,000 dirham."])
    agent = SalesAgent(llm=llm)
    agent.greet()
    reply = agent.step("I want a 2 bedroom apartment in New Cairo")
    assert "Marina View Apartment" in reply
    assert "4,200,000 EGP" in reply
    assert reply == agent.history[-1]["content"]  # the fallback, not either bad attempt, is what's saved


def test_is_grounded_rejects_known_wrong_currency_words():
    result = {"results": [{"name": "Marina View Apartment"}]}
    assert _is_grounded("Marina View Apartment costs 4,200,000 dirham", result) is False
    assert _is_grounded("شقة ماريناء فيو بسعر 4,200,000 جنيه إسترليني", result) is False
    assert _is_grounded("Marina View Apartment costs 4,200,000 EGP", result) is True


def test_is_grounded_requires_a_real_property_name_when_results_exist():
    result = {"results": [{"name": "Marina View Apartment"}]}
    assert _is_grounded("We have a lovely place called Nile Vista Townhouse for 5,000,000 EGP.", result) is False
    assert _is_grounded("Marina View Apartment is available for 4,200,000 EGP.", result) is True
