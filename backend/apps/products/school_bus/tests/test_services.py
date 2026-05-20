from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest
from django.utils import timezone

from apps.products.school_bus.models import Bus, FeeRecord, RouteStop, Stop, Student, Trip, TripAttendance
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


@pytest.mark.django_db
def test_record_fee_payment_marks_paid(sb_tenant):
    student = Student.objects.create(tenant=sb_tenant, full_name="Payer")
    fee = FeeRecord.objects.create(
        tenant=sb_tenant,
        student=student,
        month=timezone.localdate().strftime("%Y-%m"),
        amount=Decimal("1000"),
        due_date=timezone.localdate(),
        status=FeeRecord.STATUS_UNPAID,
    )
    services.record_fee_payment(fee, Decimal("1000"))
    fee.refresh_from_db()
    student.refresh_from_db()
    assert fee.status == FeeRecord.STATUS_PAID
    assert student.fee_status == Student.FEE_PAID


@pytest.mark.django_db
def test_operator_briefing_completed_trip(sb_tenant, sb_driver_setup):
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.create_user(username="brief-op", password="x")
    trip = services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    trip.status = Trip.STATUS_COMPLETED
    trip.completed_at = timezone.now()
    trip.save(update_fields=["status", "completed_at"])
    stop = Stop.objects.create(tenant=sb_tenant, name="Stop A")
    RouteStop.objects.create(
        tenant=sb_tenant,
        route=sb_driver_setup["route"],
        stop=stop,
        sequence=1,
    )
    payload = services.operator_briefing_payload(sb_tenant, user)
    assert payload["trips"]
    card = next(t for t in payload["trips"] if t["id"] == trip.id)
    assert card["status"] == Trip.STATUS_COMPLETED
    assert card["elapsed"] == ""
    assert card["completed_at_display"]


@pytest.mark.django_db
def test_parent_hero_pickup_time_ist(sb_tenant, sb_driver_setup, sb_parent_setup):
    parent = sb_parent_setup["parent"]
    stop = Stop.objects.create(tenant=sb_tenant, name="Mapusa")
    child = Student.objects.create(
        tenant=sb_tenant,
        full_name="Child IST",
        parent=parent,
        assigned_route=sb_driver_setup["route"],
        assigned_bus=sb_driver_setup["bus"],
        pickup_stop=stop,
    )
    trip = services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    services.start_trip(trip)
    marked_at = timezone.make_aware(datetime(2026, 5, 20, 8, 15, 0), ZoneInfo("Asia/Kolkata"))
    att, _ = TripAttendance.objects.get_or_create(
        tenant=sb_tenant,
        trip=trip,
        student=child,
    )
    att.pickup_status = TripAttendance.PRESENT
    att.marked_at = marked_at
    att.save(update_fields=["pickup_status", "marked_at", "updated_at"])
    payload = services.parent_me_payload(sb_tenant, parent)
    hero = payload["children"][0]["hero_status"]
    assert hero["level"] == "safe"
    assert "Mapusa" in hero["detail"]
    assert "8:15 AM" in hero["detail"]
