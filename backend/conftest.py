import pytest


@pytest.fixture(scope="session", autouse=True)
def django_cache_table(django_db_setup, django_db_blocker):
    """Create django_cache table used by public booking throttles (same as staging)."""
    with django_db_blocker.unblock():
        from django.core.management import call_command

        call_command("createcachetable", verbosity=0)


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


@pytest.fixture
def pg_staff_user(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(username="pgstaff", password="testpass123")


@pytest.fixture
def pg_staff_client(pg_staff_user, pg_tenant):
    from rest_framework.test import APIClient

    from apps.tenancy.models import TenantMembership

    client = APIClient()
    TenantMembership.objects.create(
        user=pg_staff_user,
        tenant=pg_tenant,
        role=TenantMembership.ROLE_STAFF,
        is_active=True,
    )
    client.force_authenticate(user=pg_staff_user)
    client.credentials(HTTP_X_TENANT=pg_tenant.slug)
    return client


@pytest.fixture
def pg_resident_user(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(username="pgresident", password="testpass123")


@pytest.fixture
def pg_resident_client(pg_resident_user, pg_tenant):
    from rest_framework.test import APIClient

    from apps.products.pg_management.models import Resident
    from apps.tenancy.models import TenantMembership

    client = APIClient()
    resident = Resident.objects.create(
        tenant=pg_tenant,
        full_name="Test Resident",
        phone="9999999999",
        user=pg_resident_user,
    )
    TenantMembership.objects.create(
        user=pg_resident_user,
        tenant=pg_tenant,
        role=TenantMembership.ROLE_RESIDENT,
        is_active=True,
    )
    client.force_authenticate(user=pg_resident_user)
    client.credentials(HTTP_X_TENANT=pg_tenant.slug)
    client.resident = resident
    return client
