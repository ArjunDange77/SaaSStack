import pytest


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient

    return APIClient()


@pytest.fixture
def user(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(username="testuser", password="testpass123")


@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def tenant_a(db):
    from apps.tenancy.models import Tenant

    return Tenant.objects.create(name="Tenant A", slug="tenant-a", is_active=True)


@pytest.fixture
def tenant_b(db):
    from apps.tenancy.models import Tenant

    return Tenant.objects.create(name="Tenant B", slug="tenant-b", is_active=True)


@pytest.fixture
def demo_tenant(db):
    from apps.tenancy.models import Tenant

    return Tenant.objects.create(name="Demo Tenant", slug="demo", is_active=True)


@pytest.fixture
def pg_tenant(db):
    from apps.tenancy.models import Tenant

    return Tenant.objects.create(name="PG Demo", slug="pg-demo", is_active=True)


@pytest.fixture
def pg_member(auth_client, user, pg_tenant):
    from apps.tenancy.models import TenantMembership

    TenantMembership.objects.create(
        user=user,
        tenant=pg_tenant,
        role=TenantMembership.ROLE_OWNER,
        is_active=True,
    )
    auth_client.credentials(HTTP_X_TENANT=pg_tenant.slug)
    return auth_client
