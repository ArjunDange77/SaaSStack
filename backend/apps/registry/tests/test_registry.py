import uuid

import pytest

from apps.registry.registry import get_resource, register_resource
from apps.demo.views import DemoItemViewSet


def test_demo_items_registered():
    entry = get_resource("demo-items")
    assert entry is not None
    assert entry.viewset_class is DemoItemViewSet


def test_duplicate_registration_raises():
    slug = f"dup-{uuid.uuid4().hex[:8]}"
    register_resource(slug, DemoItemViewSet)
    with pytest.raises(ValueError, match="already registered"):
        register_resource(slug, DemoItemViewSet)
