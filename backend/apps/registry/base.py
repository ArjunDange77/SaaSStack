from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.registry.activity import log_activity
from apps.registry.mixins import AuditedUpdateMixin, SoftDeleteDestroyMixin, TenantScopedQuerysetMixin
from apps.registry.pagination import KernelPageNumberPagination
from apps.registry.permissions import KernelResourcePermission
from apps.registry.registry import get_resource


class RegistryPermissionMixin:
    resource_slug: str = ""

    def get_permissions(self):
        entry = get_resource(self.resource_slug) if self.resource_slug else None
        if entry:
            return [p() for p in entry.permission_classes]
        return [KernelResourcePermission()]


class KernelActivityMixin:
    """Opt-in automatic activity logging for CRUD (disable with auto_activity_log = False)."""

    auto_activity_log: bool = True

    def _auto_log(self, verb: str, message: str, object_id, metadata=None):
        if not getattr(self, "auto_activity_log", True):
            return
        self._log(verb, message, object_id, metadata=metadata)

    def perform_create(self, serializer):
        super().perform_create(serializer)
        obj = serializer.instance
        label = str(obj)
        self._auto_log("created", f"{self.resource_slug}: {label} created", obj.pk)

    def perform_update(self, serializer):
        super().perform_update(serializer)
        obj = serializer.instance
        self._auto_log("updated", f"{self.resource_slug}: {obj} updated", obj.pk)

    def perform_destroy(self, instance):
        pk = instance.pk
        label = str(instance)
        super().perform_destroy(instance)
        self._auto_log("deleted", f"{self.resource_slug}: {label} removed", pk)


class KernelModelViewSet(
    RegistryPermissionMixin,
    KernelActivityMixin,
    SoftDeleteDestroyMixin,
    AuditedUpdateMixin,
    TenantScopedQuerysetMixin,
    viewsets.ModelViewSet,
):
    """
    Base engine ViewSet: tenant scope, audit, soft delete, pagination, optional activity.
    """

    pagination_class = KernelPageNumberPagination
    field_ui_overrides: dict = {}
    relation_display_fields: dict = {}

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["tenant"] = getattr(self.request, "tenant", None)
        return ctx

    @action(detail=True, methods=["get"], url_path="timeline")
    def timeline(self, request, pk=None):
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return Response([])
        from apps.registry.models import ActivityLog
        from apps.registry.serializers import ActivityLogSerializer

        logs = (
            ActivityLog.objects.filter(
                tenant=tenant,
                resource_slug=self.resource_slug,
                object_id=str(pk),
            )
            .select_related("actor")[:50]
        )
        return Response(ActivityLogSerializer(logs, many=True).data)

    def _log(self, verb: str, message: str, object_id, metadata=None):
        tenant = getattr(self.request, "tenant", None)
        if not tenant or not self.resource_slug:
            return
        log_activity(
            tenant=tenant,
            resource_slug=self.resource_slug,
            object_id=object_id,
            verb=verb,
            message=message,
            actor=getattr(self.request, "user", None),
            metadata=metadata,
        )
