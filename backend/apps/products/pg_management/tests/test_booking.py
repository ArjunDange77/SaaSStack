import pytest

from apps.products.pg_management.models import BookingRequest, Resident
from apps.tenancy.models import TenantMembership

pytestmark = pytest.mark.django_db


@pytest.fixture
def pg_available_room(pg_tenant, user):
    from apps.products.pg_management.models import Room

    return Room.objects.create(
        tenant=pg_tenant,
        room_number="B101",
        floor="1",
        occupancy_limit=2,
        current_occupancy=0,
        room_status="available",
        created_by=user,
        updated_by=user,
    )


def test_booking_public_create_and_operator_approve(api_client, pg_member, pg_tenant, pg_available_room):
    create = api_client.post(
        f"/api/pg/public/{pg_tenant.slug}/booking-requests/",
        {
            "full_name": "Public Guest",
            "phone": "7777777777",
            "duration": "3 months",
            "preferred_room": pg_available_room.id,
        },
        format="json",
    )
    assert create.status_code == 201
    booking_id = create.data["id"]

    pending = pg_member.get("/api/meta/resources/pg-booking-requests/?status=pending")
    assert pending.status_code == 200
    assert any(r["id"] == booking_id for r in pending.data["results"])

    approve = pg_member.post(
        f"/api/meta/resources/pg-booking-requests/{booking_id}/approve/",
        {},
        format="json",
    )
    assert approve.status_code == 200
    booking = BookingRequest.objects.get(pk=booking_id)
    assert booking.status == "approved"


def test_booking_approve_creates_resident_login(pg_member, pg_tenant, user):
    from apps.products.pg_management.models import Room

    room = Room.objects.create(
        tenant=pg_tenant,
        room_number="B102",
        floor="1",
        occupancy_limit=1,
        room_status="available",
        created_by=user,
        updated_by=user,
    )
    booking = BookingRequest.objects.create(
        tenant=pg_tenant,
        full_name="New Resident",
        phone="6666666666",
        preferred_room=room,
        status="pending",
        is_active=True,
        created_by=user,
        updated_by=user,
    )
    response = pg_member.post(
        f"/api/meta/resources/pg-booking-requests/{booking.id}/approve/",
        {"create_login": True, "username": "newresident", "password": "secret123"},
        format="json",
    )
    assert response.status_code == 200
    resident = Resident.objects.get(phone="6666666666")
    assert resident.user is not None
    assert TenantMembership.objects.filter(
        user=resident.user, tenant=pg_tenant, role=TenantMembership.ROLE_RESIDENT
    ).exists()
