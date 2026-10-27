"""
Deliberately simple, deterministic slot extraction — regex/keyword based, not
an LLM call. This exists so the agent can decide WHEN a tool call is
mandatory without trusting the main LLM's judgment (see PROGRESS.md: a long
prose prompt alone was unreliable at getting a 1.5B model to actually call a
tool). This is a placeholder good enough to drive the controlled state
machine for Milestone 2 — robust multilingual entity extraction is explicitly
in scope for the Milestone 7 evaluation suite, not here.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

AREAS = ["New Cairo", "6th of October", "Downtown Cairo", "North Coast"]
AREA_KEYWORDS = {
    "new cairo": "New Cairo",
    "6th of october": "6th of October",
    "sixth of october": "6th of October",
    "downtown": "Downtown Cairo",
    "north coast": "North Coast",
    "مدينة نصر": "Nasr City",  # intentionally NOT a real area in our dataset — tests honest "no match"
    "التجمع": "New Cairo",
    "ساحل": "North Coast",
}
PROPERTY_TYPES = {"apartment": "apartment", "villa": "villa", "townhouse": "townhouse", "شقة": "apartment", "فيلا": "villa"}
BUY_KEYWORDS = ["buy", "purchase", "اشتري", "اشتريه", "شراء"]
RENT_KEYWORDS = ["rent", "أأجر", "استأجر", "ايجار"]
HUMAN_KEYWORDS = ["human", "real person", "agent", "person instead", "إنسان", "موظف", "حد يرد"]
CONSENT_KEYWORDS = ["yes", "sure", "ok", "okay", "تمام", "موافق", "اوك"]

NAME_RE = re.compile(r"(?:name is|اسمي)\s+([A-Za-z؀-ۿ]+)", re.IGNORECASE)
PHONE_RE = re.compile(r"(?:\+?\d[\d\s-]{8,14}\d)")
BUDGET_RE = re.compile(r"(\d[\d,.]*)\s*(million|m\b|مليون)", re.IGNORECASE)
PLAIN_NUMBER_RE = re.compile(r"\b(\d[\d,]{3,})\b")
BEDROOMS_RE = re.compile(r"(\d)\s*(?:bed|bedroom|غرف|غرفة)", re.IGNORECASE)


@dataclass
class ExtractedSlots:
    intent: str | None = None
    area: str | None = None
    property_type: str | None = None
    bedrooms: int | None = None
    max_budget_egp: int | None = None
    wants_human: bool = False
    phone: str | None = None
    name: str | None = None
    affirmed_consent: bool = False


def extract_slots(text: str) -> ExtractedSlots:
    lowered = text.lower()
    slots = ExtractedSlots()

    if any(k in lowered for k in BUY_KEYWORDS):
        slots.intent = "buy"
    elif any(k in lowered for k in RENT_KEYWORDS):
        slots.intent = "rent"

    for keyword, area in AREA_KEYWORDS.items():
        if keyword in lowered or keyword in text:
            slots.area = area
            break

    for keyword, ptype in PROPERTY_TYPES.items():
        if keyword in lowered or keyword in text:
            slots.property_type = ptype
            break

    bedrooms_match = BEDROOMS_RE.search(text)
    if bedrooms_match:
        slots.bedrooms = int(bedrooms_match.group(1))

    # Phone numbers (10-11 digits) must be identified before the plain-number
    # budget fallback, so a phone digit run never gets misread as a budget
    # (measured bug: "phone 01099998888" was parsed as a 1.09 billion EGP budget).
    phone_match = PHONE_RE.search(text)
    if phone_match:
        slots.phone = phone_match.group(0).strip()

    budget_match = BUDGET_RE.search(text)
    if budget_match:
        amount = float(budget_match.group(1).replace(",", ""))
        slots.max_budget_egp = int(amount * 1_000_000)
    else:
        for plain in PLAIN_NUMBER_RE.finditer(text):
            digits = plain.group(1).replace(",", "")
            if phone_match and digits in phone_match.group(0).replace(" ", "").replace("-", ""):
                continue  # this digit run is (part of) the phone number, not a budget
            if len(digits) >= 10:
                continue  # phone-number-length, not a plausible plain EGP budget
            slots.max_budget_egp = int(digits)
            break

    if any(k in lowered for k in HUMAN_KEYWORDS):
        slots.wants_human = True

    name_match = NAME_RE.search(text)
    if name_match:
        slots.name = name_match.group(1).strip()

    if any(k in lowered for k in CONSENT_KEYWORDS):
        slots.affirmed_consent = True

    return slots
