from rest_framework.permissions import BasePermission, SAFE_METHODS

from apps.tenancy.models import TenantMembership


class KernelResourcePermission(BasePermission):
    """Phase-1: authenticated users only."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class TenantMembershipPermission(BasePermission):
    """Authenticated user with active membership for request.tenant (superuser bypass)."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return False
        return TenantMembership.objects.filter(
            user=user,
            tenant=tenant,
            is_active=True,
        ).exists()


class KernelReadWritePermission(BasePermission):
    """Optional: authenticated reads; writes require staff."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return user.is_staff
