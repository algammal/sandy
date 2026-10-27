"""
Tool implementations the LLM can call. These are the ONLY source of property
facts and lead storage — the model never gets to assert a price, an
availability status, or a lead confirmation on its own. If a tool finds
nothing, it returns an explicit empty result; it never fabricates a match.
"""

from __future__ import annotations

from typing import Any

from app.data.properties import PROPERTIES, Property

# In-memory only — this is a lab, not a CRM. Cleared on process restart.
_CAPTURED_LEADS: list[dict[str, Any]] = []


def search_properties(
    area: str | None = None,
    property_type: str | None = None,
    listing_type: str | None = None,
    max_budget_egp: int | None = None,
    bedrooms: int | None = None,
) -> dict[str, Any]:
    """Filters the synthetic dataset. Never invents a listing that isn't here."""
    results: list[Property] = []
    for prop in PROPERTIES:
        if prop["status"] != "available":
            continue
        if area and area.strip().lower() not in prop["area"].lower():
            continue
        if property_type and property_type.strip().lower() != prop["property_type"].lower():
            continue
        if listing_type and listing_type.strip().lower() != prop["listing_type"].lower():
            continue
        if max_budget_egp and prop["price_egp"] > max_budget_egp:
            continue
        if bedrooms and prop["bedrooms"] != bedrooms:
            continue
        results.append(prop)

    return {
        "count": len(results),
        "results": results[:3],
        "note": "Only listings explicitly present in the test dataset are returned. Empty results are real — do not invent a substitute.",
    }


def get_property_by_id(property_id: str) -> dict[str, Any]:
    for prop in PROPERTIES:
        if prop["id"].lower() == property_id.strip().lower():
            return {"found": True, "property": prop}
    return {"found": False, "property": None}


def capture_lead(name: str, phone: str, consent_to_contact: bool, interested_property_id: str | None = None) -> dict[str, Any]:
    if not consent_to_contact:
        return {"saved": False, "reason": "Consent not given — do not store contact details without explicit consent."}
    record = {
        "name": name,
        "phone": phone,
        "interested_property_id": interested_property_id,
        "consent_to_contact": True,
    }
    _CAPTURED_LEADS.append(record)
    return {"saved": True, "lead": record}


def request_human_handover(reason: str) -> dict[str, Any]:
    return {
        "handover_requested": True,
        "reason": reason,
        "message": "A human agent will follow up — this demo has no live transfer capability.",
    }


def get_captured_leads() -> list[dict[str, Any]]:
    """Test/debug helper — not an LLM tool."""
    return list(_CAPTURED_LEADS)


# Ollama/OpenAI-style function-calling schemas. Kept next to the implementations
# on purpose so the contract and the code it describes can't drift apart silently.
TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_properties",
            "description": (
                "Search the real estate listing database for available properties. "
                "This is the ONLY way to find real property facts — never state a price, "
                "area, or amenity that didn't come from this tool's result."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "area": {"type": "string", "description": "Area or city district, e.g. 'New Cairo'."},
                    "property_type": {"type": "string", "enum": ["apartment", "villa", "townhouse"]},
                    "listing_type": {"type": "string", "enum": ["sale", "rent"]},
                    "max_budget_egp": {"type": "integer", "description": "Maximum budget in Egyptian Pounds."},
                    "bedrooms": {"type": "integer"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_property_by_id",
            "description": "Look up one specific property's verified details by its listing ID.",
            "parameters": {
                "type": "object",
                "properties": {"property_id": {"type": "string"}},
                "required": ["property_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "capture_lead",
            "description": "Save a caller's contact details as a sales lead. Only call this after the caller has given explicit consent to be contacted.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "phone": {"type": "string"},
                    "consent_to_contact": {"type": "boolean"},
                    "interested_property_id": {"type": "string"},
                },
                "required": ["name", "phone", "consent_to_contact"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "request_human_handover",
            "description": "Call this when the caller asks to speak with a human, or when the request is outside the agent's authorized sales role.",
            "parameters": {
                "type": "object",
                "properties": {"reason": {"type": "string"}},
                "required": ["reason"],
            },
        },
    },
]

TOOL_FUNCTIONS = {
    "search_properties": search_properties,
    "get_property_by_id": get_property_by_id,
    "capture_lead": capture_lead,
    "request_human_handover": request_human_handover,
}
