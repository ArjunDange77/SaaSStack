import pytest
from django.core.management import call_command

from apps.cosmetix.models import Branding, NavBarItem
from apps.tenancy.models import Tenant


@pytest.mark.django_db
def test_seed_kernel_creates_demo_tenant_and_nav():
    call_command("seed_kernel")
    assert Tenant.objects.filter(slug="demo").exists()
    assert NavBarItem.objects.filter(tenant__isnull=True, label="Home").exists()
    nav = NavBarItem.objects.get(tenant__isnull=True, label="Demo catalog")
    assert nav.resource_slug == "demo-items"
    assert Branding.objects.filter(tenant__isnull=True, is_active=True).exists()


@pytest.mark.django_db
def test_nav_items_api(auth_client):
    call_command("seed_kernel")
    response = auth_client.get("/api/cosmetix/nav-items/")
    assert response.status_code == 200
    assert len(response.data) >= 1
    assert any(item.get("label") == "Home" for item in response.data)


@pytest.mark.django_db
def test_branding_resolve_global(auth_client):
    call_command("seed_kernel")
    response = auth_client.get("/api/cosmetix/branding/resolve/")
    assert response.status_code == 200
    assert "css_vars" in response.data


@pytest.mark.django_db
def test_branding_tenant_override(auth_client, demo_tenant):
    call_command("seed_kernel")
    Branding.objects.create(
        tenant=demo_tenant,
        name="tenant-brand",
        css_vars={"--brand-primary": "#ff0000"},
        is_active=True,
    )
    auth_client.credentials(HTTP_X_TENANT=demo_tenant.slug)
    response = auth_client.get("/api/cosmetix/branding/resolve/")
    assert response.status_code == 200
    assert response.data["css_vars"].get("--brand-primary") == "#ff0000"
