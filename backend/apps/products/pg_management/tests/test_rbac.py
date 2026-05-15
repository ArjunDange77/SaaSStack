import pytest

from apps.products.pg_management.models import Complaint, Resident, Room

pytestmark = pytest.mark.django_db


@pytest.fixture
def pg_room(pg_tenant, user):
    return Room.objects.create(
        tenant=pg_tenant,
        room_number="T101",
        floor="1",
        occupancy_limit=2,
        room_status="available",
        created_by=user,
        updated_by=user,
    )


def test_rbac_staff_cannot_delete_room(pg_staff_client, pg_room):
    response = pg_staff_client.delete(f"/api/meta/resources/pg-rooms/{pg_room.pk}/")
    assert response.status_code == 403


def test_rbac_resident_sees_only_own_complaints(pg_resident_client, pg_tenant, user):
    own = Complaint.objects.create(
        tenant=pg_tenant,
        resident=pg_resident_client.resident,
        title="My issue",
        created_by=user,
        updated_by=user,
    )
    other_resident = Resident.objects.create(
        tenant=pg_tenant,
        full_name="Other",
        phone="8888888888",
        created_by=user,
        updated_by=user,
    )
    Complaint.objects.create(
        tenant=pg_tenant,
        resident=other_resident,
        title="Other issue",
        created_by=user,
        updated_by=user,
    )
    response = pg_resident_client.get("/api/meta/resources/pg-complaints/")
    assert response.status_code == 200
    ids = [r["id"] for r in response.data["results"]]
    assert ids == [own.id]


def test_rbac_resident_cannot_access_dashboard(pg_resident_client):
    response = pg_resident_client.get("/api/pg/dashboard/")
    assert response.status_code == 403


def test_schema_capabilities_staff_vs_owner(pg_staff_client, pg_member):
    staff_schema = pg_staff_client.get("/api/meta/schema/pg-rooms/").data
    owner_schema = pg_member.get("/api/meta/schema/pg-rooms/").data
    assert staff_schema["capabilities"]["delete"] is False
    assert owner_schema["capabilities"]["delete"] is True


def test_catalog_hides_admin_resources_for_resident(pg_resident_client, pg_member):
    resident_catalog = pg_resident_client.get("/api/meta/catalog/").data
    owner_catalog = pg_member.get("/api/meta/catalog/").data
    resident_slugs = {e["slug"] for e in resident_catalog}
    owner_slugs = {e["slug"] for e in owner_catalog}
    assert "pg-rooms" not in resident_slugs
    assert "pg-rooms" in owner_slugs
    assert "pg-complaints" in resident_slugs
