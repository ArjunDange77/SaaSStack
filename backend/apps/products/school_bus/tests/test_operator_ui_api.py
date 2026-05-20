import pytest

from apps.products.school_bus.models import FeeRecord, OutboundMessage


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
