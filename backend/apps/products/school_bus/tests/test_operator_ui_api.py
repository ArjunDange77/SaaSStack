from datetime import timedelta
from decimal import Decimal

import pytest

from apps.products.school_bus import services
from apps.products.school_bus.models import FeeRecord, OutboundMessage, TenantHoliday


@pytest.mark.django_db
def test_operator_trips_today(sb_operator_client, sb_tenant, sb_driver_setup):
    response = sb_operator_client.get("/api/sb/operator/trips/today/")
    assert response.status_code == 200
    data = response.json()
    assert "stats" in data
    assert "trips" in data


@pytest.mark.django_db
def test_operator_attendance_summary(sb_operator_client, sb_tenant, sb_driver_setup):
    response = sb_operator_client.get("/api/sb/operator/attendance/summary/?month=2026-05")
    assert response.status_code == 200
    data = response.json()
    assert "students" in data
    assert "stats" in data


@pytest.mark.django_db
def test_operator_notifications_unread_count(sb_operator_client, sb_tenant):
    response = sb_operator_client.get("/api/sb/operator/notifications/?count=1")
    assert response.status_code == 200
    assert "unread_count" in response.json()


@pytest.mark.django_db
def test_operator_fee_remind(sb_operator_client, sb_tenant, sb_driver_setup):
    from apps.products.school_bus.models import Parent, Student

    parent = Parent.objects.create(
        tenant=sb_tenant, full_name="Remind Parent", phone="+919999999999"
    )
    student = Student.objects.create(
        tenant=sb_tenant,
        full_name="Remind Student",
        parent=parent,
        assigned_route=sb_driver_setup["route"],
        assigned_bus=sb_driver_setup["bus"],
    )
    fee = FeeRecord.objects.create(
        tenant=sb_tenant,
        student=student,
        month="2026-05",
        amount="2500.00",
        due_date="2026-05-01",
        status=FeeRecord.STATUS_UNPAID,
    )
    response = sb_operator_client.post(f"/api/sb/operator/fees/{fee.id}/remind/")
    assert response.status_code == 200
    assert OutboundMessage.objects.filter(tenant=sb_tenant, event_type="fee_reminder").exists()


@pytest.mark.django_db
def test_operator_live_fleet(sb_operator_client, sb_tenant, sb_driver_setup):
    trip = services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    services.start_trip(trip)
    services.record_trip_location(trip, Decimal("15.4909"), Decimal("73.8278"))
    response = sb_operator_client.get("/api/sb/operator/live-fleet/")
    assert response.status_code == 200
    trips = response.json()["trips"]
    assert len(trips) >= 1
    assert trips[0]["last_location"] is not None


@pytest.mark.django_db
def test_operator_trips_generate_week(sb_operator_client, sb_tenant, sb_driver_setup):
    start = services._today()
    if start.weekday() >= 5:
        start = start + timedelta(days=(7 - start.weekday()))
    response = sb_operator_client.post(
        "/api/sb/operator/trips/generate/",
        {"start_date": str(start), "end_date": str(start + timedelta(days=6))},
        format="json",
    )
    assert response.status_code == 200
    assert response.json()["created"] >= 0


@pytest.mark.django_db
def test_generate_trips_skips_holiday(sb_tenant, sb_driver_setup):
    d = services._today()
    while d.weekday() >= 5:
        d += timedelta(days=1)
    TenantHoliday.objects.create(tenant=sb_tenant, holiday_date=d, name="Test holiday")
    result = services.generate_trips_for_range(sb_tenant, d, d)
    assert result["skipped_holiday"] == 1
    assert result["created"] == 0


@pytest.mark.django_db
def test_operator_holidays_crud(sb_operator_client, sb_tenant):
    from datetime import timedelta

    d = services._today() + timedelta(days=14)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    created = sb_operator_client.post(
        "/api/sb/operator/holidays/",
        {"holiday_date": str(d), "name": "Operator UI holiday"},
        format="json",
    )
    assert created.status_code == 201
    hid = created.json()["id"]
    assert sb_operator_client.delete(f"/api/sb/operator/holidays/?id={hid}").status_code == 204


@pytest.mark.django_db
def test_operator_trip_summary_after_complete(sb_operator_client, sb_tenant, sb_driver_setup):
    from apps.products.school_bus.models import Student, TripAttendance

    driver = sb_driver_setup["driver"]
    student = Student.objects.create(
        tenant=sb_tenant,
        full_name="Summary Student",
        assigned_route=driver.assigned_route,
        assigned_bus=driver.assigned_bus,
    )
    trip = services.ensure_trip_for_driver(sb_tenant, driver)
    services.start_trip(trip)
    services.mark_attendance(
        trip,
        [{"student_id": student.id, "pickup_status": TripAttendance.PRESENT}],
        driver.user,
    )
    services.complete_trip(trip)
    response = sb_operator_client.get(f"/api/sb/operator/trips/{trip.id}/summary/")
    assert response.status_code == 200
    data = response.json()
    assert data["trip_id"] == trip.id
    assert "present_count" in data
