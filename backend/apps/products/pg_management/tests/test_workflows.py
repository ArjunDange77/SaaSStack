"""End-to-end operator workflows via the metadata API."""

from datetime import date, timedelta
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.products.pg_management.models import RentRecord, Resident, Room


@pytest.mark.django_db
def test_workflow_resident_onboarding(pg_member, pg_tenant):
    create = pg_member.post(
        "/api/meta/resources/pg-residents/",
        {
            "full_name": "Kavya Nair",
            "phone": "9888877776",
            "onboarding_status": "pending",
            "active_status": "inactive",
        },
        format="json",
    )
    assert create.status_code == 201
    pk = create.data["id"]
    detail = pg_member.get(f"/api/meta/resources/pg-residents/{pk}/")
    assert detail.status_code == 200
    assert detail.data["full_name"] == "Kavya Nair"


@pytest.mark.django_db
def test_workflow_room_assignment_and_vacate(pg_member, pg_tenant):
    resident = Resident.objects.create(
        tenant=pg_tenant, full_name="Assign Test", phone="9111111111"
    )
    room = Room.objects.create(
        tenant=pg_tenant,
        room_number="DEMO-1",
        floor="1",
        occupancy_limit=2,
        room_status="available",
    )
    assign = pg_member.post(
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
    assert room.current_occupancy >= 1

    pk = assign.data["id"]
    vacate = pg_member.post(f"/api/meta/resources/pg-bed-assignments/{pk}/vacate/")
    assert vacate.status_code == 200
    assert vacate.data["status"] == "vacated"
    room.refresh_from_db()
    assert room.current_occupancy == 0


@pytest.mark.django_db
def test_workflow_document_upload_and_verify(pg_member, pg_tenant):
    resident = Resident.objects.create(
        tenant=pg_tenant, full_name="Doc Test", phone="9222222222"
    )
    upload = pg_member.post(
        "/api/meta/resources/pg-documents/",
        {
            "resident": resident.pk,
            "document_type": "id_proof",
            "uploaded_file": SimpleUploadedFile(
                "id.pdf", b"fake pdf", content_type="application/pdf"
            ),
        },
        format="multipart",
    )
    assert upload.status_code == 201
    pk = upload.data["id"]
    verified = pg_member.post(f"/api/meta/resources/pg-documents/{pk}/verify/")
    assert verified.status_code == 200
    assert verified.data["verification_status"] == "verified"


@pytest.mark.django_db
def test_workflow_rent_unpaid_filter_and_mark_paid(pg_member, pg_tenant):
    resident = Resident.objects.create(
        tenant=pg_tenant, full_name="Rent Test", phone="9333333333"
    )
    record = RentRecord.objects.create(
        tenant=pg_tenant,
        resident=resident,
        amount="6000",
        due_date=date.today() - timedelta(days=3),
        paid_status="unpaid",
    )
    overdue_list = pg_member.get("/api/meta/resources/pg-rent-records/", {"overdue": "true"})
    assert overdue_list.status_code == 200
    ids = [r["id"] for r in overdue_list.data["results"]]
    assert record.pk in ids

    paid = pg_member.post(f"/api/meta/resources/pg-rent-records/{record.pk}/mark-paid/")
    assert paid.status_code == 200
    unpaid_list = pg_member.get(
        "/api/meta/resources/pg-rent-records/", {"paid_status": "unpaid"}
    )
    unpaid_ids = [r["id"] for r in unpaid_list.data["results"]]
    assert record.pk not in unpaid_ids


@pytest.mark.django_db
def test_workflow_complaint_resolution_timeline(pg_member, pg_tenant):
    resident = Resident.objects.create(
        tenant=pg_tenant, full_name="Complaint Test", phone="9444444444"
    )
    create = pg_member.post(
        "/api/meta/resources/pg-complaints/",
        {
            "resident": resident.pk,
            "title": "WiFi down",
            "description": "Common area",
            "priority": "medium",
        },
        format="json",
    )
    assert create.status_code == 201
    pk = create.data["id"]
    pg_member.post(f"/api/meta/resources/pg-complaints/{pk}/in-progress/")
    pg_member.post(f"/api/meta/resources/pg-complaints/{pk}/resolve/")

    timeline = pg_member.get(f"/api/meta/resources/pg-complaints/{pk}/timeline/")
    assert timeline.status_code == 200
    verbs = [e["verb"] for e in timeline.data]
    assert "complaint.created" in verbs
    assert "complaint.resolved" in verbs


@pytest.mark.django_db
def test_schema_list_filters_in_metadata(pg_member):
    schema = pg_member.get("/api/meta/schema/pg-rent-records/")
    assert schema.status_code == 200
    filters = schema.data.get("list_filters", [])
    params = {f["param"] for f in filters}
    assert "paid_status" in params
    assert "overdue" in params


@pytest.mark.django_db
def test_room_filter_occupied(pg_member, pg_tenant):
    Room.objects.create(
        tenant=pg_tenant,
        room_number="OCC-1",
        floor="1",
        occupancy_limit=1,
        room_status="occupied",
    )
    listing = pg_member.get("/api/meta/resources/pg-rooms/", {"room_status": "occupied"})
    assert listing.status_code == 200
    assert all(r["room_status"] == "occupied" for r in listing.data["results"])
