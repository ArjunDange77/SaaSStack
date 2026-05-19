import pytest
from django.utils import timezone

from apps.products.school_bus.models import Trip, TripAttendance
from apps.products.school_bus import services


@pytest.mark.django_db
def test_operator_attendance_history(sb_operator_client, sb_tenant, sb_driver_setup):
    from apps.products.school_bus.models import Student

    driver = sb_driver_setup["driver"]
    student = Student.objects.create(
        tenant=sb_tenant,
        full_name="History Student",
        assigned_route=driver.assigned_route,
        assigned_bus=driver.assigned_bus,
    )
    trip = services.ensure_trip_for_driver(sb_tenant, driver)
    att, _ = TripAttendance.objects.get_or_create(
        tenant=sb_tenant,
        trip=trip,
        student=student,
    )
    att.pickup_status = TripAttendance.PRESENT
    att.marked_at = timezone.now()
    att.save()

    response = sb_operator_client.get("/api/sb/operator/attendance-history/")
    assert response.status_code == 200
    results = response.json()["results"]
    assert any(r["student_name"] == "History Student" for r in results)


@pytest.mark.django_db
def test_trip_delayed_status_on_model(sb_tenant, sb_driver_setup):
    driver = sb_driver_setup["driver"]
    trip = services.ensure_trip_for_driver(sb_tenant, driver)
    trip.status = Trip.STATUS_DELAYED
    trip.save(update_fields=["status"])
    assert trip.status == Trip.STATUS_DELAYED


@pytest.mark.django_db
def test_start_trip_from_delayed(sb_tenant, sb_driver_setup):
    driver = sb_driver_setup["driver"]
    trip = services.ensure_trip_for_driver(sb_tenant, driver)
    trip.status = Trip.STATUS_DELAYED
    trip.save(update_fields=["status"])
    services.start_trip(trip)
    trip.refresh_from_db()
    assert trip.status == Trip.STATUS_STARTED
