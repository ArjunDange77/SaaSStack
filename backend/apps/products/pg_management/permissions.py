from rest_framework.permissions import BasePermission

from apps.registry.permissions import get_membership, get_tenant_role
from apps.registry.rbac import CapabilityResourcePermission

from .rbac import OPERATOR_ROLES, RESIDENT_ROLE, can_access_resource, is_operator, is_resident, rules_for_role


class PGRolePermission(CapabilityResourcePermission):
    """Tenant membership + per-resource PG role matrix."""

    rules_for_role = staticmethod(rules_for_role)
    can_access_resource = staticmethod(can_access_resource)

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        if is_operator(request):
            return True
        if is_resident(request):
            resident_id = getattr(obj, "resident_id", None)
            if resident_id is not None:
                from apps.registry.permissions import get_resident_id_for_user

                return resident_id == get_resident_id_for_user(request)
            if hasattr(obj, "user_id") and obj.user_id == request.user.id:
                return True
        return False


class PGOperatorPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return get_membership(request) is not None and get_tenant_role(request) in OPERATOR_ROLES


class PGResidentOnlyPermission(PGRolePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if get_membership(request) is None:
            return False
        return get_tenant_role(request) == RESIDENT_ROLE
