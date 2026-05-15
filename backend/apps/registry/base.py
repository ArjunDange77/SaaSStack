from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.registry.mixins import TenantScopedQuerysetMixin
from apps.registry.permissions import KernelResourcePermission
from apps.registry.registry import get_resource


class RegistryPermissionMixin:
    """Applies permission_classes from the resource registry entry."""

    resource_slug: str = ""

    def get_permissions(self):
        entry = get_resource(self.resource_slug) if self.resource_slug else None
        if entry:
            return [p() for p in entry.permission_classes]
        return [KernelResourcePermission()]


class KernelModelViewSet(RegistryPermissionMixin, TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    """
    Base engine ViewSet: tenant-scoped querysets + registry-driven permissions.
    Subclasses must set resource_slug and serializer_class / queryset.
    """

    pass
