import pytest


@pytest.mark.django_db
def test_resident_me_returns_portal_bundle(pg_resident_client):
    response = pg_resident_client.get("/api/pg/resident/me/")
    assert response.status_code == 200
    data = response.data
    assert data["profile"]["full_name"] == "Test Resident"
    assert "documents" in data
    assert "recent_activity" in data


@pytest.mark.django_db
def test_resident_me_excludes_soft_deleted_documents(pg_resident_client):
    from apps.products.pg_management.models import Document

    resident = pg_resident_client.resident
    Document.objects.create(
        tenant=resident.tenant,
        resident=resident,
        document_type="id_proof",
        uploaded_file="test.pdf",
    )
    deleted = Document.objects.create(
        tenant=resident.tenant,
        resident=resident,
        document_type="agreement",
        uploaded_file="gone.pdf",
    )
    deleted.deleted_at = deleted.updated_at
    deleted.is_active = False
    deleted.save(update_fields=["deleted_at", "is_active"])

    response = pg_resident_client.get("/api/pg/resident/me/")
    assert response.status_code == 200
    types = {d["document_type"] for d in response.data["documents"]}
    assert types == {"id_proof"}


@pytest.mark.django_db
def test_resident_me_404_without_linked_profile(pg_resident_user, pg_tenant):
    from rest_framework.test import APIClient

    from apps.tenancy.models import TenantMembership

    client = APIClient()
    TenantMembership.objects.create(
        user=pg_resident_user,
        tenant=pg_tenant,
        role=TenantMembership.ROLE_RESIDENT,
        is_active=True,
    )
    client.force_authenticate(user=pg_resident_user)
    client.credentials(HTTP_X_TENANT=pg_tenant.slug)
    response = client.get("/api/pg/resident/me/")
    assert response.status_code == 404
    assert response.data["detail"] == "resident_profile_not_found"
