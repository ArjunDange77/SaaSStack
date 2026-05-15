import pytest

from apps.demo.models import DemoItem
from apps.registry.models import ActivityLog


@pytest.mark.django_db
def test_timeline_returns_entries(auth_client, demo_tenant):
    item = DemoItem.objects.create(
        tenant=demo_tenant, name="Logged", sku="L1", category="parts", price=1
    )
    ActivityLog.objects.create(
        tenant=demo_tenant,
        resource_slug="demo-items",
        object_id=str(item.pk),
        verb="test.created",
        message="Test entry",
    )
    auth_client.credentials(HTTP_X_TENANT=demo_tenant.slug)
    response = auth_client.get(f"/api/meta/resources/demo-items/{item.pk}/timeline/")
    assert response.status_code == 200
    assert len(response.data) >= 1
    assert response.data[0]["verb"] == "test.created"
    assert "actor_username" in response.data[0]
