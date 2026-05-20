from rest_framework.permissions import BasePermission, SAFE_METHODS

from apps.registry.permissions import get_membership, get_tenant_role
from apps.registry.role_permissions import RoleBasedModelPermission

from .rbac import OPERATOR_ROLES, PARENT_ROLE, can_access_resource, is_operator, is_parent
from .models import Driver, Parent, Student


def get_driver_for_user(request):
    if not getattr(request, "user", None) or not request.user.is_authenticated:
        return None
    if hasattr(request, "_sb_driver"):
        return request._sb_driver
    tenant = getattr(request, "tenant", None)
    if tenant is None:
        return None
    driver = Driver.objects.filter(tenant=tenant, user=request.user).first()
    request._sb_driver = driver
    return driver


def get_parent_for_user(request):
    if not getattr(request, "user", None) or not request.user.is_authenticated:
        return None
    if hasattr(request, "_sb_parent"):
        return request._sb_parent
    tenant = getattr(request, "tenant", None)
    if tenant is None:
        return None
    parent = Parent.objects.filter(tenant=tenant, user=request.user).first()
    request._sb_parent = parent
    return parent


class SBRolePermission(RoleBasedModelPermission):
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
        if request.user.is_superuser or is_operator(request):
            return True
        if is_parent(request):
            parent = get_parent_for_user(request)
            if parent is None:
                return False
            if isinstance(obj, Student):
                return obj.parent_id == parent.id
            if isinstance(obj, Parent):
                return obj.id == parent.id
        return False


class SBOperatorPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return get_membership(request) is not None and get_tenant_role(request) in OPERATOR_ROLES


class SBParentPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return get_membership(request) is not None and get_tenant_role(request) == PARENT_ROLE


class SBDriverPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return get_driver_for_user(request) is not None
