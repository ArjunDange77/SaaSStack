import pytest


@pytest.mark.django_db
def test_pg_residents_forbidden_without_membership(auth_client, pg_tenant):
    auth_client.credentials(HTTP_X_TENANT=pg_tenant.slug)
    response = auth_client.get("/api/meta/resources/pg-residents/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_pg_residents_allowed_with_membership(pg_member):
    response = pg_member.get("/api/meta/resources/pg-residents/")
    assert response.status_code == 200
