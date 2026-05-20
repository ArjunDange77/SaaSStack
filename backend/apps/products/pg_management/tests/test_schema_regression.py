import pytest


@pytest.mark.parametrize(
    "slug,required_fields",
    [
        ("pg-rooms", ["room_number", "room_status", "occupancy_display"]),
        ("pg-residents", ["full_name", "phone", "active_status"]),
        ("pg-booking-requests", ["full_name", "phone", "status"]),
    ],
)
def test_pg_schema_regression_field_contract(pg_member, slug, required_fields):
    response = pg_member.get(f"/api/meta/schema/{slug}/")
    assert response.status_code == 200
    body = response.data
    assert body.get("schema_version")
    field_names = {f["name"] for f in body["fields"]}
    for name in required_fields:
        assert name in field_names, f"{slug} missing field {name}"
    assert body.get("list_display")
    assert body.get("resource") == slug
