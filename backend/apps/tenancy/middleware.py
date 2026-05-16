from django.utils.deprecation import MiddlewareMixin

from apps.registry.storage import set_storage_tenant_slug

from .models import Tenant


class TenantMiddleware(MiddlewareMixin):
    """
    Resolve tenant from:
      1. X-Tenant header (preferred in local/dev/testing)
      2. Host header: domain match to Tenant.domain
      3. Fallback to None (global)
    Sets request.tenant (Tenant instance or None)
    """

    def process_request(self, request):
        request.tenant = None
        tenant_slug = request.headers.get("X-Tenant") or request.META.get("HTTP_X_TENANT")
        if tenant_slug:
            try:
                request.tenant = Tenant.objects.get(slug=tenant_slug, is_active=True)
            except Tenant.DoesNotExist:
                request.tenant = None
        elif request.get_host():
            host = request.get_host().split(":")[0]
            if host:
                try:
                    request.tenant = Tenant.objects.get(domain__iexact=host, is_active=True)
                except Tenant.DoesNotExist:
                    request.tenant = None

        tenant = getattr(request, "tenant", None)
        set_storage_tenant_slug(getattr(tenant, "slug", None) if tenant else None)
