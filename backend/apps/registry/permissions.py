from rest_framework.permissions import BasePermission, SAFE_METHODS

from apps.tenancy.models import TenantMembership


def get_membership(request):
    if not getattr(request, "user", None) or not request.user.is_authenticated:
        return None
    if hasattr(request, "_tenant_membership"):
        return request._tenant_membership
    tenant = getattr(request, "tenant", None)
    if tenant is None:
        return None
    membership = (
        TenantMembership.objects.filter(
            user=request.user,
            tenant=tenant,
            is_active=True,
        )
        .select_related("tenant")
        .first()
    )
    request._tenant_membership = membership
    return membership


def get_tenant_role(request) -> str | None:
    membership = get_membership(request)
    return membership.role if membership else None


def get_resident_id_for_user(request) -> int | None:
    if not getattr(request, "user", None) or not request.user.is_authenticated:
        return None
    if hasattr(request, "_pg_resident_id"):
        return request._pg_resident_id
    tenant = getattr(request, "tenant", None)
    if tenant is None:
        return None
    from apps.products.pg_management.models import Resident

    resident = (
        Resident.objects.filter(
            tenant=tenant,
            user=request.user,
            deleted_at__isnull=True,
        )
        .values_list("id", flat=True)
        .first()
    )
    request._pg_resident_id = resident
    return resident


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
