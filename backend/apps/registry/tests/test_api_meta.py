import pytest
from django.urls import reverse

from apps.registry.constants import REGISTRY_SCHEMA_VERSION


@pytest.mark.django_db
def test_catalog_requires_auth(api_client):
    response = api_client.get("/api/meta/catalog/")
    assert response.status_code == 401


@pytest.mark.django_db
def test_catalog_lists_demo_items(auth_client):
    response = auth_client.get("/api/meta/catalog/")
    assert response.status_code == 200
    slugs = [r["slug"] for r in response.data]
    assert "demo-items" in slugs
    entry = next(r for r in response.data if r["slug"] == "demo-items")
    assert entry["schema_version"] == REGISTRY_SCHEMA_VERSION


@pytest.mark.django_db
def test_schema_unknown_slug(auth_client):
    response = auth_client.get("/api/meta/schema/unknown-slug-xyz/")
    assert response.status_code == 404
    assert response.data["detail"] == "unknown_resource"


@pytest.mark.django_db
def test_schema_demo_items_v1_contract(auth_client):
    response = auth_client.get("/api/meta/schema/demo-items/")
    assert response.status_code == 200
    data = response.data
    assert data["schema_version"] == REGISTRY_SCHEMA_VERSION
    assert data["resource"] == "demo-items"
    assert "fields" in data
    assert "list_display" in data
    assert any(a["name"] == "archive" for a in data["actions"])
