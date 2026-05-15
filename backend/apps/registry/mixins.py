"""
Tenant-scoped queryset mixin for engine ViewSets.
"""


class TenantScopedQuerysetMixin:
    """
    Filters queryset to request.tenant when the model has a tenant FK.
    If request.tenant is None, returns queryset.none() for tenant-scoped models.
    """

    tenant_field_name = "tenant"

    def _model_has_tenant_field(self) -> bool:
        qs = getattr(self, "queryset", None)
        if qs is None:
            return False
        names = {f.name for f in qs.model._meta.concrete_fields}
        return self.tenant_field_name in names

    def get_queryset(self):
        qs = super().get_queryset()
        if not self._model_has_tenant_field():
            return qs
        tenant = getattr(self.request, "tenant", None)
        if tenant is None:
            return qs.none()
        return qs.filter(**{self.tenant_field_name: tenant})

    def perform_create(self, serializer):
        tenant = getattr(self.request, "tenant", None)
        if tenant is not None and self._model_has_tenant_field():
            serializer.save(**{self.tenant_field_name: tenant})
        else:
            super().perform_create(serializer)
