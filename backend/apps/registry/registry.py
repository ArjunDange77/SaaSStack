from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple, Type

from rest_framework.permissions import BasePermission

from apps.registry.permissions import KernelResourcePermission


@dataclass
class ResourceEntry:
    """Maps a public resource slug to its DRF surface and metadata hints."""

    slug: str
    viewset_class: Type
    title: str = ""
    permission_classes: Tuple[Type[BasePermission], ...] = (KernelResourcePermission,)
    description: str = ""
    catalog_roles: Tuple[str, ...] = ()
    catalog_hidden: bool = False

    def resolved_title(self) -> str:
        return self.title or self.slug.replace("-", " ").title()


_REGISTRY: Dict[str, ResourceEntry] = {}


def register_resource(
    slug: str,
    viewset_class: Type,
    *,
    title: str = "",
    description: str = "",
    permission_classes: Optional[Tuple[Type[BasePermission], ...]] = None,
    catalog_roles: Tuple[str, ...] = (),
    catalog_hidden: bool = False,
) -> None:
    if slug in _REGISTRY:
        raise ValueError(f"Resource slug already registered: {slug}")
    entry = ResourceEntry(
        slug=slug,
        viewset_class=viewset_class,
        title=title,
        description=description,
        permission_classes=permission_classes or (KernelResourcePermission,),
        catalog_roles=catalog_roles,
        catalog_hidden=catalog_hidden,
    )
    _REGISTRY[slug] = entry


def get_resource(slug: str) -> Optional[ResourceEntry]:
    return _REGISTRY.get(slug)


def iter_resources() -> List[ResourceEntry]:
    return list(_REGISTRY.values())


def all_slugs() -> List[str]:
    return sorted(_REGISTRY.keys())
