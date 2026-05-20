import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.tenancy.models import Tenant, TenantMembership

User = get_user_model()


@pytest.fixture
def sb_client(db):
    tenant = Tenant.objects.create(slug="sb-demo", name="SB Demo")
    user = User.objects.create_user(username="sbadmin", password="admin")
    TenantMembership.objects.create(tenant=tenant, user=user, role="owner")
    client = APIClient()
    client.credentials(HTTP_X_TENANT=tenant.slug)
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_school_bus_dashboard_legacy_alias(sb_operator_client):
    response = sb_operator_client.get("/api/sb/dashboard/")
    assert response.status_code == 200
    assert "active_buses" in response.json()
