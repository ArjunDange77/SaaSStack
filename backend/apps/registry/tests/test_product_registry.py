import pytest

from apps.registry.product import ProductConfig, ProductRegistry


@pytest.fixture
def isolated_registry():
    saved = dict(ProductRegistry._products)
    ProductRegistry.clear()
    yield
    ProductRegistry._products.clear()
    ProductRegistry._products.update(saved)


def test_register_and_get(isolated_registry):
    ProductRegistry.register(
        ProductConfig(slug="hostel", label="Hostel", url_prefix="/api/hostel/")
    )
    cfg = ProductRegistry.get("hostel")
    assert cfg is not None
    assert cfg.label == "Hostel"


def test_all_products(isolated_registry):
    ProductRegistry.register(ProductConfig(slug="a", label="A", url_prefix="/api/a/"))
    ProductRegistry.register(ProductConfig(slug="b", label="B", url_prefix="/api/b/"))
    slugs = {p.slug for p in ProductRegistry.all()}
    assert slugs == {"a", "b"}
