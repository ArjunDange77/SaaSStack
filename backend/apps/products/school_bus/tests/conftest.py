import pytest
from django.contrib.auth import get_user_model

from apps.tenancy.models import Tenant, TenantMembership

User = get_user_model()


@pytest.fixture
def sb_tenant(db):
    return Tenant.objects.create(name="SB Test", slug="sb-test", is_active=True)


@pytest.fixture
def sb_operator_client(api_client, sb_tenant):
    user = User.objects.create_user(username="sb-op", password="testpass123")
    TenantMembership.objects.create(
        user=user,
        tenant=sb_tenant,
        role=TenantMembership.ROLE_OWNER,
        is_active=True,
    )
    api_client.force_authenticate(user=user)
    api_client.credentials(HTTP_X_TENANT=sb_tenant.slug)
    return api_client


@pytest.fixture
def sb_second_driver_setup(sb_tenant):
    from apps.products.school_bus.models import Bus, Driver, Route

    user = User.objects.create_user(username="sb-drv2", password="testpass123")
    TenantMembership.objects.create(
        user=user,
        tenant=sb_tenant,
        role=TenantMembership.ROLE_DRIVER,
        is_active=True,
    )
    bus = Bus.objects.create(tenant=sb_tenant, fleet_number="T-2", capacity=40)
    route = Route.objects.create(tenant=sb_tenant, name="Route 2")
    driver = Driver.objects.create(
        tenant=sb_tenant,
        full_name="Other Driver",
        assigned_bus=bus,
        assigned_route=route,
        user=user,
    )
    return {"user": user, "driver": driver, "bus": bus, "route": route}


@pytest.fixture
def sb_driver_setup(sb_tenant):
    from apps.products.school_bus.models import Bus, Driver, Route

    user = User.objects.create_user(username="sb-drv", password="testpass123")
    TenantMembership.objects.create(
        user=user,
        tenant=sb_tenant,
        role=TenantMembership.ROLE_DRIVER,
        is_active=True,
    )
    bus = Bus.objects.create(tenant=sb_tenant, fleet_number="T-1", capacity=40)
    route = Route.objects.create(tenant=sb_tenant, name="Test Route")
    driver = Driver.objects.create(
        tenant=sb_tenant,
        full_name="Test Driver",
        assigned_bus=bus,
        assigned_route=route,
        user=user,
    )
    return {"user": user, "driver": driver, "bus": bus, "route": route}


@pytest.fixture
def sb_driver_client(api_client, sb_tenant, sb_driver_setup):
    api_client.force_authenticate(user=sb_driver_setup["user"])
    api_client.credentials(HTTP_X_TENANT=sb_tenant.slug)
    return api_client


@pytest.fixture
def sb_parent_setup(sb_tenant):
    from apps.products.school_bus.models import Parent

    user = User.objects.create_user(username="sb-par", password="testpass123")
    TenantMembership.objects.create(
        user=user,
        tenant=sb_tenant,
        role=TenantMembership.ROLE_PARENT,
        is_active=True,
    )
    parent = Parent.objects.create(tenant=sb_tenant, full_name="Test Parent", user=user)
    return {"user": user, "parent": parent}


@pytest.fixture
def sb_parent_client(api_client, sb_tenant, sb_parent_setup):
    api_client.force_authenticate(user=sb_parent_setup["user"])
    api_client.credentials(HTTP_X_TENANT=sb_tenant.slug)
    return api_client
