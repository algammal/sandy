"""Second isolation pass: same 4-tool schema as the real agent, comparing the
agent's actual (soft) system prompt wording against a strengthened version."""

from __future__ import annotations

import json

from app.llm.ollama_adapter import OllamaAdapter
from app.tools.property_search import TOOL_SCHEMAS

SOFT_PROMPT = (
    "You are a helpful real estate sales voice assistant for Nile Vista Properties, a fictional company used for testing.\n"
    "Follow this procedure, one step at a time, asking only ONE question per turn:\n"
    "1. Greet the caller briefly.\n"
    "2. Find out if they want to buy, rent, or just get information.\n"
    "3. Ask which area or compound interests them.\n"
    "4. Ask about property type, budget, bedrooms, and timing — one at a time, only what's missing.\n"
    "5. Once you have enough to search, call the search_properties tool. Never guess at a price, "
    "availability, amenity, or address — only state facts that came back from a tool call.\n"
    "6. Present only the matching options the tool actually returned.\n"
    "Respond naturally. Keep responses short.\n"
    "Facts already established this conversation: {\"area\": \"New Cairo\", \"max_budget_egp\": 5000000, \"bedrooms\": 2}"
)

STRONG_PROMPT = (
    "You are a real estate sales assistant for Nile Vista Properties.\n"
    "CRITICAL RULE: You have NO knowledge of real property prices, availability, or listings. "
    "The ONLY way to get a real answer is to call the search_properties tool right now. "
    "You are FORBIDDEN from writing a text reply until you have called a tool for this turn.\n"
    "Known so far: area=New Cairo, max_budget_egp=5000000, bedrooms=2. This is enough — call search_properties now."
)

HISTORY = [
    {"role": "user", "content": "Hi, I'm looking to buy an apartment."},
    {"role": "assistant", "content": "Great! Which area interests you?"},
    {"role": "user", "content": "New Cairo please."},
    {"role": "assistant", "content": "Got it. What's your budget and how many bedrooms?"},
    {"role": "user", "content": "My budget is around 5 million pounds, 2 bedrooms."},
]

if __name__ == "__main__":
    adapter = OllamaAdapter()
    for label, system_prompt in [("SOFT", SOFT_PROMPT), ("STRONG", STRONG_PROMPT)]:
        messages = [{"role": "system", "content": system_prompt}] + HISTORY
        result = adapter.chat(messages, tools=TOOL_SCHEMAS)
        print(f"--- {label} ---")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print()
