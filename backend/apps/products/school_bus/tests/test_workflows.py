import pytest

from apps.products.school_bus import services
from apps.products.school_bus.models import Student, Trip


@pytest.mark.django_db
def test_operator_dashboard_api(sb_operator_client, sb_tenant, sb_driver_setup):
    response = sb_operator_client.get("/api/sb/operator/dashboard/")
    assert response.status_code == 200
    assert "active_buses" in response.json()


@pytest.mark.django_db
def test_driver_today_api(sb_driver_client, sb_tenant, sb_driver_setup):
    services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    response = sb_driver_client.get("/api/sb/driver/today/")
    assert response.status_code == 200
    data = response.json()
    assert data["trip_id"] is not None
    assert data["trip_status"] == Trip.STATUS_SCHEDULED
    assert data["can_open_checklist"] is False
    assert data["checklist"] == []


@pytest.mark.django_db
def test_driver_today_shows_completed_summary(sb_driver_client, sb_tenant, sb_driver_setup):
    trip = services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    services.start_trip(trip)
    services.complete_trip(trip)
    response = sb_driver_client.get("/api/sb/driver/today/")
    assert response.status_code == 200
    data = response.json()
    assert data["trip_id"] == trip.id
    assert data["trip_status"] == Trip.STATUS_COMPLETED
    assert data["completed_summary"] is not None
    assert data["checklist"] == []


@pytest.mark.django_db
def test_driver_trip_flow(sb_driver_client, sb_tenant, sb_driver_setup):
    trip = services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    today = sb_driver_client.get("/api/sb/driver/today/").json()
    trip_id = today["trip_id"] or trip.id
    assert sb_driver_client.post(f"/api/sb/driver/trips/{trip_id}/start/").status_code == 200
    assert (
        sb_driver_client.post(
            f"/api/sb/driver/trips/{trip_id}/attendance/",
            {"marks": []},
            format="json",
        ).status_code
        == 200
    )
    complete = sb_driver_client.post(f"/api/sb/driver/trips/{trip_id}/complete/")
    assert complete.status_code == 200
    trip = Trip.objects.get(pk=trip_id)
    assert trip.started_at is not None
    assert trip.completed_at is not None
    assert complete.json().get("summary") is not None


@pytest.mark.django_db
def test_parent_me_api(sb_parent_client, sb_tenant, sb_parent_setup):
    parent = sb_parent_setup["parent"]
    Student.objects.create(
        tenant=sb_tenant,
        full_name="Child",
        parent=parent,
    )
    response = sb_parent_client.get("/api/sb/parent/me/")
    assert response.status_code == 200
    data = response.json()
    assert len(data["children"]) == 1


@pytest.mark.django_db
def test_driver_schedule_api(sb_driver_client, sb_tenant, sb_driver_setup):
    services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    response = sb_driver_client.get("/api/sb/driver/schedule/?days=7")
    assert response.status_code == 200
    data = response.json()
    assert data["days"] == 7
    assert len(data["trips"]) >= 1


@pytest.mark.django_db
def test_operator_holidays_api(sb_operator_client, sb_tenant):
    from datetime import timedelta

    d = services._today()
    while d.weekday() >= 5:
        d += timedelta(days=1)
    create = sb_operator_client.post(
        "/api/sb/operator/holidays/",
        {"holiday_date": str(d), "name": "API holiday"},
        format="json",
    )
    assert create.status_code == 201
    holiday_id = create.json()["id"]
    listed = sb_operator_client.get("/api/sb/operator/holidays/")
    assert listed.status_code == 200
    assert any(h["id"] == holiday_id for h in listed.json()["holidays"])
    deleted = sb_operator_client.delete(f"/api/sb/operator/holidays/?id={holiday_id}")
    assert deleted.status_code == 204


@pytest.mark.django_db
def test_complete_trip_api_auto_marks_unmarked(sb_driver_client, sb_tenant, sb_driver_setup):
    from apps.products.school_bus.models import Student, TripAttendance

    driver = sb_driver_setup["driver"]
    student = Student.objects.create(
        tenant=sb_tenant,
        full_name="API On Bus",
        assigned_route=driver.assigned_route,
        assigned_bus=driver.assigned_bus,
    )
    trip = services.ensure_trip_for_driver(sb_tenant, driver)
    sb_driver_client.post(f"/api/sb/driver/trips/{trip.id}/start/")
    response = sb_driver_client.post(f"/api/sb/driver/trips/{trip.id}/complete/")
    assert response.status_code == 200
    att = TripAttendance.objects.get(trip=trip, student=student)
    assert att.pickup_status == TripAttendance.PRESENT


@pytest.mark.django_db
def test_parent_me_requires_parent_role(sb_operator_client):
    assert sb_operator_client.get("/api/sb/parent/me/").status_code == 403


@pytest.mark.django_db
def test_operator_briefing_api(sb_operator_client, sb_tenant, sb_driver_setup):
    services.ensure_trip_for_driver(sb_tenant, sb_driver_setup["driver"])
    response = sb_operator_client.get("/api/sb/operator/briefing/")
    assert response.status_code == 200
    data = response.json()
    assert "greeting" in data
    assert "trips" in data


@pytest.mark.django_db
def test_operator_fees_grouped_api(sb_operator_client, sb_tenant):
    response = sb_operator_client.get("/api/sb/operator/fees/")
    assert response.status_code == 200
    data = response.json()
    assert "overdue" in data
    assert "paid" in data
    assert "due_this_month" in data


@pytest.mark.django_db
def test_student_list_current_fee_status(sb_operator_client, sb_tenant):
    from decimal import Decimal
    from django.utils import timezone

    from apps.products.school_bus.models import FeeRecord, Student

    student = Student.objects.create(tenant=sb_tenant, full_name="List Fee Kid")
    month = timezone.localdate().strftime("%Y-%m")
    FeeRecord.objects.create(
        tenant=sb_tenant,
        student=student,
        month=month,
        amount=Decimal("2500"),
        due_date=timezone.localdate(),
        status=FeeRecord.STATUS_PAID,
    )
    response = sb_operator_client.get("/api/meta/resources/sb-students/")
    assert response.status_code == 200
    row = next(r for r in response.json()["results"] if r["id"] == student.id)
    assert row["current_fee_status"] == FeeRecord.STATUS_PAID
