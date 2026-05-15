from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.registry.permissions import get_membership, get_tenant_role


class TenantRolePermission(BasePermission):
    """Mixin-style base: requires active tenant membership."""

    def has_permission(self, request, view):
        membership = get_membership(request)
        if membership is None:
            return False
        allowed = getattr(view, "allowed_roles", None)
        if allowed:
            return membership.role in allowed
        operator_roles = getattr(view, "operator_roles", None)
        if operator_roles:
            return membership.role in operator_roles
        return True

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class RoleBasedModelPermission(TenantRolePermission):
    """
    ViewSet hooks:
      allowed_roles — tuple of roles that may access the view
      staff_write_roles — roles allowed to mutate (default owner+staff)
      owner_only_destroy — if True, only owner may DELETE
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        role = get_tenant_role(request)
        if role is None:
            return False
        if request.method == "DELETE" and getattr(view, "owner_only_destroy", False):
            if role != "owner":
                staff_ok = getattr(view, "staff_can_destroy", False)
                if not staff_ok:
                    return False
        if request.method not in SAFE_METHODS:
            staff_write = getattr(view, "staff_write_roles", ("owner", "staff"))
            if role not in staff_write:
                resident_write = getattr(view, "resident_write_actions", ())
                if request.method == "POST" and hasattr(view, "action"):
                    if view.action in resident_write:
                        return role == "resident"
                return False
        return True

    def has_object_permission(self, request, view, obj):
        if not super().has_object_permission(request, view, obj):
            return False
        checker = getattr(view, "check_object_role_access", None)
        if checker:
            return checker(request, obj)
        return True
