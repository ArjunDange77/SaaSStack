"""Product shell contract — each vertical registers at AppConfig.ready()."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ProductConfig:
    slug: str
    label: str
    url_prefix: str
    roles: list[str] = field(default_factory=list)
    default_operator_role: str = "owner"
    nav_sections: list[dict[str, Any]] = field(default_factory=list)
    seed_command: str | None = None
    demo_tenant_slug: str | None = None
    notification_adapter: type | None = None
    payment_adapter: type | None = None


class ProductRegistry:
    _products: dict[str, ProductConfig] = {}

    @classmethod
    def register(cls, config: ProductConfig) -> None:
        cls._products[config.slug] = config

    @classmethod
    def get(cls, slug: str) -> ProductConfig | None:
        return cls._products.get(slug)

    @classmethod
    def all(cls) -> list[ProductConfig]:
        return list(cls._products.values())

    @classmethod
    def clear(cls) -> None:
        """Test helper."""
        cls._products.clear()
