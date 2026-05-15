import uuid

import pytest

from apps.demo.models import DemoItem


@pytest.mark.django_db
def test_demo_items_list_requires_tenant_header(auth_client, demo_tenant):
    DemoItem.objects.create(tenant=demo_tenant, name="Item", sku="1", category="parts", price=10)
    response = auth_client.get("/api/meta/resources/demo-items/")
    assert response.status_code == 200
    data = response.data
    results = data["results"] if isinstance(data, dict) else data
    assert len(results) == 0


@pytest.mark.django_db
def test_demo_items_crud_with_tenant(auth_client, demo_tenant):
    auth_client.credentials(HTTP_X_TENANT=demo_tenant.slug)

    create = auth_client.post(
        "/api/meta/resources/demo-items/",
        {"name": "Widget", "sku": "W1", "category": "parts", "price": "19.99", "in_stock": True},
        format="json",
    )
    assert create.status_code == 201
    pk = create.data["id"]

    detail = auth_client.get(f"/api/meta/resources/demo-items/{pk}/")
    assert detail.status_code == 200
    assert detail.data["name"] == "Widget"

    patch = auth_client.patch(
        f"/api/meta/resources/demo-items/{pk}/",
        {"name": "Widget Pro"},
        format="json",
    )
    assert patch.status_code == 200

    listing = auth_client.get("/api/meta/resources/demo-items/")
    data = listing.data
    results = data["results"] if isinstance(data, dict) else data
    assert len(results) == 1

    delete = auth_client.delete(f"/api/meta/resources/demo-items/{pk}/")
    assert delete.status_code == 204


@pytest.mark.django_db
def test_demo_items_archive_action(auth_client, demo_tenant):
    auth_client.credentials(HTTP_X_TENANT=demo_tenant.slug)
    item = DemoItem.objects.create(
        tenant=demo_tenant, name="Archive me", sku="A1", category="parts", price=5
    )
    response = auth_client.post(f"/api/meta/resources/demo-items/{item.pk}/archive/")
    assert response.status_code == 200
    item.refresh_from_db()
    assert item.archived is True


@pytest.mark.django_db
def test_cross_tenant_detail_denied(auth_client, demo_tenant, tenant_b):
    item = DemoItem.objects.create(
        tenant=demo_tenant, name="Secret", sku="S1", category="parts", price=1
    )
    auth_client.credentials(HTTP_X_TENANT=tenant_b.slug)
    response = auth_client.get(f"/api/meta/resources/demo-items/{item.pk}/")
    assert response.status_code == 404
