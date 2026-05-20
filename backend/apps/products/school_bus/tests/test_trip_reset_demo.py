from datetime import timedelta

import pytest
from django.utils import timezone

from apps.products.school_bus import services
from apps.products.school_bus.models import Trip, TripAttendance, TripLocation


@pytest.mark.django_db
def test_reset_trip_for_demo_moves_to_today_and_clears_state(
    sb_operator_client, sb_tenant, sb_driver_setup
):
    from apps.products.school_bus.models import Student

    driver = sb_driver_setup["driver"]
    Student.objects.create(
        tenant=sb_tenant,
        full_name="Reset Kid",
        assigned_route=driver.assigned_route,
        assigned_bus=driver.assigned_bus,
    )
    yesterday = timezone.localdate() - timedelta(days=1)
    trip = services.ensure_trip_for_driver(sb_tenant, driver, trip_date=yesterday)
    services.start_trip(trip)
    trip.status = Trip.STATUS_PICKUP_IN_PROGRESS
    trip.save(update_fields=["status", "updated_at"])
    att = TripAttendance.objects.filter(trip=trip).first()
    assert att is not None
    att.pickup_status = TripAttendance.PRESENT
    att.marked_at = timezone.now()
    att.save(update_fields=["pickup_status", "marked_at", "updated_at"])
    TripLocation.objects.create(
        tenant=sb_tenant,
        trip=trip,
        latitude="15.490000",
        longitude="73.820000",
    )

    response = sb_operator_client.post(f"/api/meta/resources/sb-trips/{trip.id}/reset-for-demo/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == Trip.STATUS_SCHEDULED
    assert data["trip_date"] == str(timezone.localdate())
    assert data["started_at"] is None
    assert data["completed_at"] is None

    trip.refresh_from_db()
    assert trip.trip_date == timezone.localdate()
    assert not TripLocation.objects.filter(trip=trip).exists()
    assert not TripAttendance.objects.filter(trip=trip).exclude(
        pickup_status=TripAttendance.NOT_MARKED
    ).exists()


@pytest.mark.django_db
def test_driver_sees_trip_after_reset(
    sb_tenant, sb_driver_setup, sb_driver_client, sb_operator_client
):
    driver = sb_driver_setup["driver"]
    yesterday = timezone.localdate() - timedelta(days=1)
    trip = services.ensure_trip_for_driver(sb_tenant, driver, trip_date=yesterday)
    services.start_trip(trip)

    reset = sb_operator_client.post(f"/api/meta/resources/sb-trips/{trip.id}/reset-for-demo/")
    assert reset.status_code == 200

    sb_driver_client.force_authenticate(user=sb_driver_setup["user"])
    response = sb_driver_client.get("/api/sb/driver/today/")
    assert response.status_code == 200
    assert response.json()["trip_id"] == trip.id
    assert response.json()["trip_status"] == Trip.STATUS_SCHEDULED

