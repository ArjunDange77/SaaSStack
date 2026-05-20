"""
Tenant-scoped queryset, audit, and soft-delete mixins for engine ViewSets.
"""

from django.utils import timezone


class TenantScopedQuerysetMixin:
    tenant_field_name = "tenant"
    soft_delete_field = "deleted_at"

    def _model_has_field(self, name: str) -> bool:
        qs = getattr(self, "queryset", None)
        if qs is None:
            return False
        names = {f.name for f in qs.model._meta.concrete_fields}
        return name in names

    def _model_has_tenant_field(self) -> bool:
        return self._model_has_field(self.tenant_field_name)

    def get_queryset(self):
        qs = super().get_queryset()
        if self._model_has_tenant_field():
            tenant = getattr(self.request, "tenant", None)
            if tenant is None:
                return qs.none()
            qs = qs.filter(**{self.tenant_field_name: tenant})
        if self._model_has_field(self.soft_delete_field):
            qs = qs.filter(**{f"{self.soft_delete_field}__isnull": True})
        return qs

    def perform_create(self, serializer):
        tenant = getattr(self.request, "tenant", None)
        extra = {}
        if tenant is not None and self._model_has_tenant_field():
            extra[self.tenant_field_name] = tenant
        user = getattr(self.request, "user", None)
        if user and user.is_authenticated:
            if self._model_has_field("created_by"):
                extra["created_by"] = user
            if self._model_has_field("updated_by"):
                extra["updated_by"] = user
        serializer.save(**extra)


class AuditedUpdateMixin:
    def perform_update(self, serializer):
        user = getattr(self.request, "user", None)
        if user and user.is_authenticated and self._model_has_field("updated_by"):
            serializer.save(updated_by=user)
        else:
            serializer.save()


class SoftDeleteDestroyMixin:
    """DELETE sets deleted_at instead of removing the row when model supports it."""

    hard_delete = False

    def perform_destroy(self, instance):
        if self.hard_delete or not self._model_has_field("deleted_at"):
            instance.delete()
            return
        instance.deleted_at = timezone.now()
        if self._model_has_field("is_active"):
            instance.is_active = False
        update_fields = ["deleted_at"]
        if self._model_has_field("is_active"):
            update_fields.append("is_active")
        instance.save(update_fields=update_fields)
