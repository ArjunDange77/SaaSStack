from typing import List, Optional, TypeVar

from django.db import models

T = TypeVar("T", bound=models.Model)


def resolve_tenant_scoped_queryset(
    model: type[T],
    tenant,
    *,
    active_field: str = "is_active",
    order_by: tuple = ("sort_order", "pk"),
) -> models.QuerySet[T]:
    """
    Tenant-specific rows when tenant is set; otherwise global (tenant IS NULL).
    """
    qs = model.objects.filter(**{active_field: True})
    if tenant:
        scoped = qs.filter(tenant=tenant)
        if scoped.exists():
            return scoped.order_by(*order_by)
    return qs.filter(tenant__isnull=True).order_by(*order_by)
