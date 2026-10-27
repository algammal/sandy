from app.tools.property_search import capture_lead, search_properties


def test_search_returns_only_available_matching_area():
    result = search_properties(area="New Cairo")
    assert result["count"] >= 1
    assert all(p["area"] == "New Cairo" for p in result["results"])
    assert all(p["status"] == "available" for p in result["results"])


def test_search_excludes_sold_and_reserved():
    result = search_properties(property_type="apartment")
    ids = {p["id"] for p in result["results"]}
    assert "NV-106" not in ids  # sold
    assert "NV-103" not in ids  # reserved townhouse (also wrong type, but double-checks status filter)


def test_search_respects_budget_ceiling():
    result = search_properties(max_budget_egp=5_000_000)
    assert all(p["price_egp"] <= 5_000_000 for p in result["results"])


def test_search_with_no_match_returns_empty_not_invented():
    result = search_properties(area="Alexandria")
    assert result["count"] == 0
    assert result["results"] == []


def test_capture_lead_requires_consent():
    result = capture_lead(name="Test Caller", phone="0100000000", consent_to_contact=False)
    assert result["saved"] is False


def test_capture_lead_with_consent_saves():
    result = capture_lead(name="Test Caller", phone="0100000000", consent_to_contact=True, interested_property_id="NV-101")
    assert result["saved"] is True
    assert result["lead"]["phone"] == "0100000000"
