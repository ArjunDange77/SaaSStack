from decimal import Decimal

import pytest

from apps.products.school_bus.models import Bus, FeeRecord, Student, Trip, TripAttendance
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


@pytest.mark.django_db
def test_generate_daily_trips_weekday(sb_tenant, sb_driver_setup):
    route = sb_driver_setup["route"]
    route.default_driver = sb_driver_setup["driver"]
    route.save(update_fields=["default_driver"])
    created = services.generate_daily_trips(tenant=sb_tenant)
    assert created >= 1
    trip = Trip.objects.get(tenant=sb_tenant, route=route, trip_date=services._today())
    assert trip.status == Trip.STATUS_SCHEDULED


@pytest.mark.django_db
def test_annotate_student_fee_status(sb_tenant):
    from django.utils import timezone

    student = Student.objects.create(tenant=sb_tenant, full_name="Fee Kid")
    month = timezone.localdate().strftime("%Y-%m")
    FeeRecord.objects.create(
        tenant=sb_tenant,
        student=student,
        month=month,
        amount=Decimal("2500"),
        due_date=timezone.localdate(),
        status=FeeRecord.STATUS_PAID,
    )
    qs = services.annotate_student_fee_status(Student.objects.filter(pk=student.pk))
    row = qs.first()
    assert row.current_fee_status == FeeRecord.STATUS_PAID
