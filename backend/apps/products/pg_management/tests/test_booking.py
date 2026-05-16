import pytest
from django.core.cache import cache
from django.test import override_settings

from apps.products.pg_management.models import BookingRequest, Resident
from apps.tenancy.models import TenantMembership

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def clear_throttle_cache():
    cache.clear()
    yield
    cache.clear()


def _public_booking_payload(room_id=None, **overrides):
    data = {
        "full_name": "Public Guest",
        "phone": "9876543210",
        "duration": "3 months",
        "remarks": "",
        "website": "",
    }
    if room_id is not None:
        data["preferred_room"] = room_id
    data.update(overrides)
    return data


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


def test_public_available_rooms_returns_200(api_client, pg_tenant, pg_available_room):
    response = api_client.get(f"/api/pg/public/{pg_tenant.slug}/rooms/available/")
    assert response.status_code == 200, response.content
    assert isinstance(response.data, list)
    assert any(r["id"] == pg_available_room.id for r in response.data)


def test_public_available_rooms_ok_when_throttle_cache_fails(api_client, pg_tenant, monkeypatch):
    from rest_framework.throttling import SimpleRateThrottle

    def broken_allow(self, request, view):
        raise RuntimeError("cache unavailable")

    monkeypatch.setattr(SimpleRateThrottle, "allow_request", broken_allow)
    response = api_client.get(f"/api/pg/public/{pg_tenant.slug}/rooms/available/")
    assert response.status_code == 200, response.content


def test_booking_public_create_and_operator_approve(api_client, pg_member, pg_tenant, pg_available_room):
    create = api_client.post(
        f"/api/pg/public/{pg_tenant.slug}/booking-requests/",
        _public_booking_payload(
            room_id=pg_available_room.id,
            phone="7777777777",
        ),
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


@pytest.mark.parametrize(
    "phone",
    ["1234567890", "98765", "abcdefghij"],
)
def test_public_booking_rejects_invalid_phone(api_client, pg_tenant, phone):
    response = api_client.post(
        f"/api/pg/public/{pg_tenant.slug}/booking-requests/",
        _public_booking_payload(phone=phone),
        format="json",
    )
    assert response.status_code == 400
    assert "phone" in response.data


def test_public_booking_requires_duration(api_client, pg_tenant):
    response = api_client.post(
        f"/api/pg/public/{pg_tenant.slug}/booking-requests/",
        _public_booking_payload(duration=""),
        format="json",
    )
    assert response.status_code == 400
    assert "duration" in response.data


def test_public_booking_rejects_honeypot(api_client, pg_tenant):
    response = api_client.post(
        f"/api/pg/public/{pg_tenant.slug}/booking-requests/",
        _public_booking_payload(website="http://spam.example"),
        format="json",
    )
    assert response.status_code == 400


def test_public_booking_normalizes_india_phone(api_client, pg_tenant):
    response = api_client.post(
        f"/api/pg/public/{pg_tenant.slug}/booking-requests/",
        _public_booking_payload(phone="+91 98765 43210"),
        format="json",
    )
    assert response.status_code == 201
    booking = BookingRequest.objects.get(pk=response.data["id"])
    assert booking.phone == "9876543210"


@override_settings(
    PUBLIC_BOOKING_BURST_RATE="1000/minute",
    PUBLIC_BOOKING_ROOMS_RATE="1000/hour",
    PUBLIC_BOOKING_SUBMIT_RATE="2/minute",
)
def test_public_booking_submit_throttled(api_client, pg_tenant):
    url = f"/api/pg/public/{pg_tenant.slug}/booking-requests/"
    for i in range(2):
        response = api_client.post(
            url,
            _public_booking_payload(phone=f"987654321{i}"),
            format="json",
        )
        assert response.status_code == 201, response.data
    third = api_client.post(
        url,
        _public_booking_payload(phone="9876543219"),
        format="json",
    )
    assert third.status_code == 429
