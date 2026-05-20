from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tenancy.models import Tenant, TenantMembership
from apps.tenancy.serializers import TenantSerializer


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAdminUser]


class MyTenantsView(APIView):
    """Tenants the current user may access (active memberships)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.is_superuser:
            tenants = Tenant.objects.filter(is_active=True).order_by("name")
            data = [{"slug": t.slug, "name": t.name, "role": "owner"} for t in tenants]
            return Response(data)
        memberships = (
            TenantMembership.objects.filter(user=user, is_active=True)
            .select_related("tenant")
            .order_by("tenant__name")
        )
        data = [
            {"slug": m.tenant.slug, "name": m.tenant.name, "role": m.role}
            for m in memberships
            if m.tenant.is_active
        ]
        return Response(data)
