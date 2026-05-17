import pytest

from apps.products.pg_management.models import Room
from apps.products.pg_management.seatmap import (
    VISUAL_AVAIL_SHARED,
    VISUAL_AVAIL_SINGLE,
    VISUAL_FULL,
    VISUAL_MAINTENANCE,
    VISUAL_PARTIAL,
    build_public_seatmap_payload,
    is_room_publicly_bookable,
    seatmap_visual_status,
)

pytestmark = pytest.mark.django_db


def _room(pg_tenant, user, **kwargs):
    defaults = {
        "tenant": pg_tenant,
        "room_number": "X99",
        "floor": "1",
        "occupancy_limit": 2,
        "current_occupancy": 0,
        "room_status": "available",
        "created_by": user,
        "updated_by": user,
    }
    defaults.update(kwargs)
    return Room.objects.create(**defaults)


@pytest.mark.parametrize(
    "limit,occ,status,expected",
    [
        (1, 0, "maintenance", VISUAL_MAINTENANCE),
        (2, 2, "available", VISUAL_FULL),
        (1, 0, "available", VISUAL_AVAIL_SINGLE),
        (3, 0, "available", VISUAL_AVAIL_SHARED),
        (4, 2, "available", VISUAL_PARTIAL),
        (2, 2, "occupied", VISUAL_FULL),
    ],
)
def test_seatmap_visual_status(pg_tenant, user, limit, occ, status, expected):
    room = _room(
        pg_tenant,
        user,
        occupancy_limit=limit,
        current_occupancy=occ,
        room_status=status,
    )
    assert seatmap_visual_status(room) == expected


def test_is_room_selectable_matches_available_endpoint(api_client, pg_tenant, user):
    bookable = _room(pg_tenant, user, room_number="B1")
    full = _room(
        pg_tenant,
        user,
        room_number="F1",
        current_occupancy=2,
        occupancy_limit=2,
    )
    maintenance = _room(
        pg_tenant,
        user,
        room_number="M1",
        room_status="maintenance",
    )

    payload = build_public_seatmap_payload(tenant=pg_tenant)
    by_id = {r["id"]: r for fl in payload["floors"] for r in fl["rooms"]}

    assert by_id[bookable.id]["selectable"] is True
    assert by_id[full.id]["selectable"] is False
    assert by_id[maintenance.id]["selectable"] is False

    avail = api_client.get(f"/api/pg/public/{pg_tenant.slug}/rooms/available/")
    avail_ids = {r["id"] for r in avail.data}
    assert avail_ids == {rid for rid, r in by_id.items() if r["selectable"]}


def test_seatmap_returns_200_grouped_floors(api_client, pg_tenant, user):
    _room(pg_tenant, user, room_number="101", floor="1")
    _room(pg_tenant, user, room_number="201", floor="2")

    response = api_client.get(f"/api/pg/public/{pg_tenant.slug}/rooms/seatmap/")
    assert response.status_code == 200, response.content
    data = response.data
    assert data["schema_version"] == "1.0"
    assert data["tenant"]["slug"] == pg_tenant.slug
    assert len(data["floors"]) == 2
    keys = [f["key"] for f in data["floors"]]
    assert keys == sorted(keys, key=lambda k: (0, int(k)) if k.isdigit() else (1, k))


def test_seatmap_summary_counts(api_client, pg_tenant, user):
    _room(pg_tenant, user, room_number="101", floor="1", occupancy_limit=2, current_occupancy=0)
    _room(pg_tenant, user, room_number="102", floor="1", occupancy_limit=2, current_occupancy=2)
    _room(pg_tenant, user, room_number="103", floor="1", occupancy_limit=1, current_occupancy=1)

    data = api_client.get(f"/api/pg/public/{pg_tenant.slug}/rooms/seatmap/").data
    s = data["summary"]
    assert s["total_rooms"] == 3
    assert s["full_rooms"] == 2
    assert s["available_rooms"] == 1
    assert s["free_beds"] == 2


def test_seatmap_unknown_tenant_404(api_client):
    response = api_client.get("/api/pg/public/no-such-tenant/rooms/seatmap/")
    assert response.status_code == 404


def test_seatmap_excludes_soft_deleted(api_client, pg_tenant, user):
    visible = _room(pg_tenant, user, room_number="101")
    deleted = _room(pg_tenant, user, room_number="102")
    deleted.delete()

    data = api_client.get(f"/api/pg/public/{pg_tenant.slug}/rooms/seatmap/").data
    ids = {r["id"] for fl in data["floors"] for r in fl["rooms"]}
    assert visible.id in ids
    assert deleted.id not in ids


def test_seatmap_full_room_not_selectable(api_client, pg_tenant, user):
    full = _room(
        pg_tenant,
        user,
        room_number="999",
        current_occupancy=1,
        occupancy_limit=1,
    )
    data = api_client.get(f"/api/pg/public/{pg_tenant.slug}/rooms/seatmap/").data
    room = next(r for fl in data["floors"] for r in fl["rooms"] if r["id"] == full.id)
    assert room["visual_status"] == VISUAL_FULL
    assert room["selectable"] is False
