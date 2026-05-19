import pytest
from django.utils import timezone

from apps.products.school_bus.models import Bus, Driver, Route, Student, Trip, TripAttendance
from apps.products.school_bus import services


@pytest.mark.django_db
def test_trip_lifecycle(sb_tenant, sb_driver_setup):
    driver = sb_driver_setup["driver"]
    student = Student.objects.create(
        tenant=sb_tenant,
        full_name="Kid One",
        assigned_route=driver.assigned_route,
        assigned_bus=driver.assigned_bus,
    )
    trip = services.ensure_trip_for_driver(sb_tenant, driver)
    assert trip.status == Trip.STATUS_SCHEDULED
    services.start_trip(trip)
    trip.refresh_from_db()
    assert trip.status == Trip.STATUS_STARTED
    services.mark_attendance(
        trip,
        [{"student_id": student.id, "pickup_status": TripAttendance.PRESENT}],
        sb_driver_setup["user"],
    )
    trip.refresh_from_db()
    assert trip.status == Trip.STATUS_PICKUP_IN_PROGRESS
    services.complete_trip(trip)
    trip.refresh_from_db()
    assert trip.status == Trip.STATUS_COMPLETED


@pytest.mark.django_db
def test_operator_dashboard_counts(sb_tenant, sb_driver_setup):
    Bus.objects.create(tenant=sb_tenant, fleet_number="B2", capacity=30)
    payload = services.operator_dashboard_payload(sb_tenant)
    assert payload["active_buses"] >= 2
    assert "pending_fees_total" in payload
