import pytest
from rest_framework.test import APIRequestFactory

from apps.demo.models import DemoItem
from apps.demo.views import DemoItemViewSet


@pytest.mark.django_db
def test_list_scoped_to_tenant(demo_tenant, tenant_b):
    DemoItem.objects.create(tenant=demo_tenant, name="A", sku="1")
    DemoItem.objects.create(tenant=tenant_b, name="B", sku="2")

    factory = APIRequestFactory()
    request = factory.get("/")
    request.tenant = demo_tenant

    view = DemoItemViewSet()
    view.request = request
    view.format_kwarg = None
    qs = view.get_queryset()
    assert qs.count() == 1
    assert qs.first().name == "A"


@pytest.mark.django_db
def test_list_empty_without_tenant(demo_tenant):
    DemoItem.objects.create(tenant=demo_tenant, name="A", sku="1")

    factory = APIRequestFactory()
    request = factory.get("/")
    request.tenant = None

    view = DemoItemViewSet()
    view.request = request
    view.format_kwarg = None
    assert view.get_queryset().count() == 0


@pytest.mark.django_db
def test_create_sets_tenant(demo_tenant):
    factory = APIRequestFactory()
    request = factory.post("/")
    request.tenant = demo_tenant

    view = DemoItemViewSet()
    view.request = request
    view.format_kwarg = None

    serializer = view.get_serializer(data={"name": "New", "sku": "n1", "category": "parts", "price": "10.00"})
    assert serializer.is_valid(), serializer.errors
    view.perform_create(serializer)
    assert serializer.instance.tenant_id == demo_tenant.id
