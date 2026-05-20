import pytest

from apps.products.pg_management.models import Complaint, RentRecord, Resident, Room


@pytest.mark.django_db
def test_pg_dashboard_stats(pg_member, pg_tenant):
    tenant = pg_tenant
    Resident.objects.create(
        tenant=tenant,
        full_name="Active",
        phone="1",
        active_status="active",
    )
    Room.objects.create(tenant=tenant, room_number="A1", room_status="occupied", current_occupancy=1)
    resident = Resident.objects.create(tenant=tenant, full_name="R2", phone="2")
    RentRecord.objects.create(
        tenant=tenant,
        resident=resident,
        amount="5000",
        due_date="2026-05-01",
        paid_status="unpaid",
    )
    Complaint.objects.create(
        tenant=tenant,
        resident=resident,
        title="Leak",
        description="Water leak",
        status="open",
    )

    response = pg_member.get("/api/pg/dashboard/")
    assert response.status_code == 200
    assert response.data["active_residents"] >= 1
    assert response.data["open_complaints"] >= 1
    assert response.data["rent_due_unpaid"] >= 1
    assert "occupancy_rate" in response.data
    assert "rent_overdue" in response.data
    assert "trends" in response.data
    assert "pending_bookings" in response.data["trends"]
    assert response.data["trends"]["pending_bookings"]["period"] == "7d"
