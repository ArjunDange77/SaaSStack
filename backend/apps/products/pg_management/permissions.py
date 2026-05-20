from rest_framework.permissions import BasePermission, SAFE_METHODS

from apps.registry.permissions import get_membership, get_tenant_role
from apps.registry.role_permissions import RoleBasedModelPermission

from .rbac import OPERATOR_ROLES, RESIDENT_ROLE, can_access_resource, is_operator, is_resident


class PGRolePermission(RoleBasedModelPermission):
    """Tenant membership + per-resource PG role matrix."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if get_membership(request) is None:
            return False
        slug = getattr(view, "resource_slug", "")
        if not can_access_resource(request, slug):
            return False
        role = get_tenant_role(request)
        if request.method == "DELETE":
            from .rbac import rules_for_role

            rules = rules_for_role(slug, role) or {}
            if not rules.get("delete"):
                return False
        if request.method in ("POST", "PUT", "PATCH") and not getattr(view, "action", None):
            from .rbac import rules_for_role

            rules = rules_for_role(slug, role) or {}
            if request.method == "POST" and not rules.get("create"):
                return False
            if request.method in ("PUT", "PATCH") and not rules.get("update"):
                return False
        action = getattr(view, "action", None)
        if action and action not in (
            "list",
            "create",
            "retrieve",
            "update",
            "partial_update",
            "destroy",
        ):
            if action == "timeline" and request.method in SAFE_METHODS:
                return True
            from .rbac import rules_for_role

            rules = rules_for_role(slug, role) or {}
            allowed = rules.get("actions")
            if allowed is not None and action not in allowed:
                return False
        return True

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
