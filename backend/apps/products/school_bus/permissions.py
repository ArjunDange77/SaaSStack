from rest_framework.permissions import BasePermission

from apps.registry.permissions import get_membership, get_tenant_role
from apps.registry.rbac import CapabilityResourcePermission

from .rbac import DRIVER_ROLE, OPERATOR_ROLES, PARENT_ROLE, can_access_resource, is_operator, is_parent, rules_for_role
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


class SBRolePermission(CapabilityResourcePermission):
    rules_for_role = staticmethod(rules_for_role)
    can_access_resource = staticmethod(can_access_resource)

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        if get_tenant_role(request) == DRIVER_ROLE:
            return False
        if is_operator(request):
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
