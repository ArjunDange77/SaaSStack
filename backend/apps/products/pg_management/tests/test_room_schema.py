import pytest

from apps.products.pg_management.models import Room


@pytest.mark.django_db
def test_room_schema_has_filter_counts_and_grid_view(pg_member):
    response = pg_member.get("/api/meta/schema/pg-rooms/")
    assert response.status_code == 200
    meta = response.data
    assert "grid" in meta.get("list_views", [])
    filters = meta.get("list_filters", [])
    assert any("count" in f for f in filters)
    assert "availability_label" not in meta["list_display"]


@pytest.mark.django_db
def test_public_room_includes_rent_and_amenities(api_client, pg_tenant, user):
    room = Room.objects.create(
        tenant=pg_tenant,
        room_number="501",
        floor="5",
        occupancy_limit=2,
        room_status="available",
        monthly_rent_per_bed=5000,
        amenities=["ac", "wifi"],
        created_by=user,
        updated_by=user,
    )
    response = api_client.get(f"/api/pg/public/{pg_tenant.slug}/rooms/available/")
    assert response.status_code == 200
    row = next(r for r in response.data if r["id"] == room.id)
    assert float(row["monthly_rent_per_bed"]) == 5000
    assert "ac" in row["amenities"]
