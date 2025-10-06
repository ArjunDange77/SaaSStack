from django.utils.deprecation import MiddlewareMixin
from .models import Tenant
from urllib.parse import urlparse

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
        # 1) X-Tenant header (slug)
        tenant_slug = request.headers.get("X-Tenant") or request.META.get("HTTP_X_TENANT")
        if tenant_slug:
            try:
                request.tenant = Tenant.objects.get(slug=tenant_slug, is_active=True)
                return
            except Tenant.DoesNotExist:
                request.tenant = None

        # 2) Host header / domain mapping
        host = request.get_host().split(":")[0]
        if host:
            try:
                request.tenant = Tenant.objects.get(domain__iexact=host, is_active=True)
                return
            except Tenant.DoesNotExist:
                request.tenant = None

        # else leave as None (global)
        return
