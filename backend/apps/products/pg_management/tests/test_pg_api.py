from datetime import date

import pytest

from apps.products.pg_management.models import Resident


@pytest.mark.django_db
def test_pg_residents_crud(pg_member):
    client = pg_member

    create = client.post(
        "/api/meta/resources/pg-residents/",
        {
            "full_name": "Arjun Dange",
            "phone": "9999999999",
            "email": "arjun@example.com",
            "onboarding_status": "pending",
            "active_status": "active",
        },
        format="json",
    )
    assert create.status_code == 201
    pk = create.data["id"]

    detail = client.get(f"/api/meta/resources/pg-residents/{pk}/")
    assert detail.status_code == 200
    assert detail.data["full_name"] == "Arjun Dange"

    schema = client.get("/api/meta/schema/pg-residents/")
    assert schema.status_code == 200
    status_field = next(f for f in schema.data["fields"] if f["name"] == "onboarding_status")
    assert status_field.get("ui", {}).get("variant") == "badge"


@pytest.mark.django_db
def test_pg_schema_in_catalog(auth_client, pg_member):
    catalog = auth_client.get("/api/meta/catalog/")
    slugs = {e["slug"] for e in catalog.data}
    assert "pg-residents" in slugs
    assert "pg-complaints" in slugs


@pytest.mark.django_db
def test_pg_list_pagination(pg_member, pg_tenant):
    for i in range(3):
        Resident.objects.create(
            tenant=pg_tenant,
            full_name=f"Resident {i}",
            phone=f"900000000{i}",
        )
    response = pg_member.get("/api/meta/resources/pg-residents/", {"page": 1, "page_size": 2})
    assert response.status_code == 200
    assert "results" in response.data
    assert len(response.data["results"]) == 2
    assert response.data["count"] == 3
