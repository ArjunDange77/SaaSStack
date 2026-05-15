from datetime import date

import pytest

from apps.products.pg_management.models import BedAssignment, Resident, Room


@pytest.mark.django_db
def test_bed_assignment_updates_room_occupancy(pg_member, pg_tenant):
    client = pg_member
    tenant = pg_tenant

    resident = Resident.objects.create(tenant=tenant, full_name="R1", phone="1")
    room = Room.objects.create(
        tenant=tenant,
        room_number="101",
        floor="1",
        occupancy_limit=1,
        room_status="available",
    )

    assign = client.post(
        "/api/meta/resources/pg-bed-assignments/",
        {
            "resident": resident.pk,
            "room": room.pk,
            "assigned_date": str(date.today()),
            "status": "active",
        },
        format="json",
    )
    assert assign.status_code == 201
    room.refresh_from_db()
    assert room.current_occupancy == 1
    assert room.room_status == "occupied"

    vacate = client.post(f"/api/meta/resources/pg-bed-assignments/{assign.data['id']}/vacate/")
    assert vacate.status_code == 200
    room.refresh_from_db()
    assert room.current_occupancy == 0
    assert room.room_status == "available"


@pytest.mark.django_db
def test_assignment_rejects_full_room(pg_member, pg_tenant):
    tenant = pg_tenant
    resident = Resident.objects.create(tenant=tenant, full_name="R1", phone="2")
    other = Resident.objects.create(tenant=tenant, full_name="R2", phone="3")
    room = Room.objects.create(
        tenant=tenant,
        room_number="999",
        occupancy_limit=1,
        room_status="available",
    )
    BedAssignment.objects.create(
        tenant=tenant,
        resident=resident,
        room=room,
        assigned_date=date.today(),
        status="active",
    )
    from apps.products.pg_management.services import recalculate_room_occupancy

    recalculate_room_occupancy(room)
    response = pg_member.post(
        "/api/meta/resources/pg-bed-assignments/",
        {
            "resident": other.pk,
            "room": room.pk,
            "assigned_date": str(date.today()),
            "status": "active",
        },
        format="json",
    )
    assert response.status_code == 400
