from rest_framework import generics, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import Branding, Menu, NavBarItem
from .serializers import BrandingSerializer, MenuSerializer, NavBarItemSerializer
from .shell import resolve_tenant_scoped_queryset

class BrandingResolveView(generics.RetrieveAPIView):
    """
    Resolve effective branding for the current request's tenant.
    If tenant-specific branding exists (is_active=True), return it,
    otherwise return global branding (tenant=None) if present.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = BrandingSerializer

    def get_object(self):
        request = self.request
        tenant = getattr(request, "tenant", None)
        # tenant-specific preferred
        if tenant:
            b = Branding.objects.filter(tenant=tenant, is_active=True).order_by("-updated_at").first()
            if b:
                return b
        # global fallback
        g = Branding.objects.filter(tenant__isnull=True, is_active=True).order_by("-updated_at").first()
        if g:
            return g
        # otherwise raise 404
        raise get_object_or_404(Branding, pk=-1)  # will trigger 404

class MenuResolveAPIView(generics.GenericAPIView):
    """
    GET /api/cosmetix/menu/<slug>/resolve/
    Returns resolved menu structure for tenant (tenant-specific -> global fallback)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug, *args, **kwargs):
        tenant = getattr(request, "tenant", None)
        menu = None
        if tenant:
            menu = Menu.objects.filter(tenant=tenant, slug=slug, is_active=True).order_by("-version").first()
        if not menu:
            menu = Menu.objects.filter(tenant__isnull=True, slug=slug, is_active=True).order_by("-version").first()
        if not menu:
            return Response({"detail":"menu_not_found"}, status=status.HTTP_404_NOT_FOUND)
        ser = MenuSerializer(menu)
        # return resolved structure (server may also add resolved fields in future)
        return Response(ser.data)


class NavBarItemListView(APIView):
    """GET /api/cosmetix/nav-items/ — API-driven shell navigation."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = getattr(request, "tenant", None)
        qs = resolve_tenant_scoped_queryset(NavBarItem, tenant)
        data = NavBarItemSerializer(qs, many=True).data
        return Response(data)
