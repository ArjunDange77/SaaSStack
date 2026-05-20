"""Map Django models to registered resource slugs for relation metadata."""

from __future__ import annotations

from typing import Optional, Type

from apps.registry.registry import iter_resources


def model_to_resource_slug(model: Type) -> Optional[str]:
    for entry in iter_resources():
        vs = entry.viewset_class
        qs = getattr(vs, "queryset", None)
        if qs is not None and qs.model == model:
            return entry.slug
    return None
