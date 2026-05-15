from datetime import date, timedelta

import pytest

from apps.products.pg_management.models import Complaint, RentRecord, Resident


@pytest.mark.django_db
def test_rent_mark_paid_and_partial(pg_member, pg_tenant):
    resident = Resident.objects.create(tenant=pg_tenant, full_name="R", phone="7777777777")
    record = RentRecord.objects.create(
        tenant=pg_tenant,
        resident=resident,
        amount="5000",
        due_date=date.today(),
        paid_status="unpaid",
    )
    partial = pg_member.post(
        f"/api/meta/resources/pg-rent-records/{record.pk}/mark-paid/",
        {"paid_status": "partial"},
        format="json",
    )
    assert partial.status_code == 200
    assert partial.data["paid_status"] == "partial"

    paid = pg_member.post(
        f"/api/meta/resources/pg-rent-records/{record.pk}/mark-paid/",
        {"payment_method": "upi"},
        format="json",
    )
    assert paid.status_code == 200
    assert paid.data["paid_status"] == "paid"


@pytest.mark.django_db
def test_complaint_resolve_and_in_progress(pg_member, pg_tenant):
    resident = Resident.objects.create(tenant=pg_tenant, full_name="C", phone="6666666666")
    create = pg_member.post(
        "/api/meta/resources/pg-complaints/",
        {
            "resident": resident.pk,
            "title": "Water leak",
            "description": "Bathroom",
            "priority": "high",
        },
        format="json",
    )
    assert create.status_code == 201
    pk = create.data["id"]

    prog = pg_member.post(f"/api/meta/resources/pg-complaints/{pk}/in-progress/")
    assert prog.status_code == 200
    assert prog.data["status"] == "in_progress"

    resolved = pg_member.post(f"/api/meta/resources/pg-complaints/{pk}/resolve/")
    assert resolved.status_code == 200
    assert resolved.data["status"] == "resolved"
    assert resolved.data["resolved_at"] is not None


@pytest.mark.django_db
def test_rent_filter_by_paid_status(pg_member, pg_tenant):
    resident = Resident.objects.create(tenant=pg_tenant, full_name="F", phone="5555555555")
    RentRecord.objects.create(
        tenant=pg_tenant,
        resident=resident,
        amount="100",
        due_date=date.today() - timedelta(days=1),
        paid_status="unpaid",
    )
    listing = pg_member.get("/api/meta/resources/pg-rent-records/", {"paid_status": "unpaid"})
    assert listing.status_code == 200
    results = listing.data["results"]
    assert all(r["paid_status"] == "unpaid" for r in results)
