"""
SYNTHETIC TEST DATA — entirely fictional, for development only.

"Nile Vista Properties" is a made-up real estate company. Every compound,
address, price, and amenity below is invented for testing the agent's
grounding behavior (it must never invent facts beyond what's in this file).
Do not present this as real inventory to a real customer.
"""

from __future__ import annotations

from typing import TypedDict


class Property(TypedDict):
    id: str
    name: str
    compound: str
    area: str
    property_type: str  # "apartment" | "villa" | "townhouse"
    listing_type: str  # "sale" | "rent"
    bedrooms: int
    price_egp: int
    status: str  # "available" | "reserved" | "sold"
    amenities: list[str]


PROPERTIES: list[Property] = [
    {
        "id": "NV-101",
        "name": "Marina View Apartment",
        "compound": "Nile Vista Marina",
        "area": "New Cairo",
        "property_type": "apartment",
        "listing_type": "sale",
        "bedrooms": 2,
        "price_egp": 4_200_000,
        "status": "available",
        "amenities": ["pool", "gym", "24/7 security", "covered parking"],
    },
    {
        "id": "NV-102",
        "name": "Palm Residence Villa",
        "compound": "Nile Vista Palm Hills",
        "area": "6th of October",
        "property_type": "villa",
        "listing_type": "sale",
        "bedrooms": 4,
        "price_egp": 9_800_000,
        "status": "available",
        "amenities": ["private garden", "private pool", "gated community"],
    },
    {
        "id": "NV-103",
        "name": "Garden Townhouse",
        "compound": "Nile Vista Gardens",
        "area": "New Cairo",
        "property_type": "townhouse",
        "listing_type": "sale",
        "bedrooms": 3,
        "price_egp": 6_500_000,
        "status": "reserved",
        "amenities": ["shared garden", "kids area", "mosque nearby"],
    },
    {
        "id": "NV-104",
        "name": "Downtown Studio",
        "compound": "Nile Vista Central",
        "area": "Downtown Cairo",
        "property_type": "apartment",
        "listing_type": "rent",
        "bedrooms": 1,
        "price_egp": 18_000,
        "status": "available",
        "amenities": ["furnished", "elevator", "near metro"],
    },
    {
        "id": "NV-105",
        "name": "Family Apartment",
        "compound": "Nile Vista Marina",
        "area": "New Cairo",
        "property_type": "apartment",
        "listing_type": "rent",
        "bedrooms": 3,
        "price_egp": 35_000,
        "status": "available",
        "amenities": ["pool", "gym", "covered parking"],
    },
    {
        "id": "NV-106",
        "name": "Coastal Chalet",
        "compound": "Nile Vista North Coast",
        "area": "North Coast",
        "property_type": "apartment",
        "listing_type": "sale",
        "bedrooms": 2,
        "price_egp": 5_100_000,
        "status": "sold",
        "amenities": ["beach access", "pool"],
    },
]
