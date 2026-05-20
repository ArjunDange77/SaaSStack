"""
Declarative capability RBAC for product meta resources.

Products define RESOURCE_RULES in rbac.py (per slug, per role: create/update/delete/actions).
ViewSets use product permission classes that subclass CapabilityResourcePermission.
"""

from __future__ import annotations

from typing import Callable

from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.registry.permissions import get_membership, get_tenant_role

RulesForRoleFn = Callable[[str, str | None], dict | None]
CanAccessResourceFn = Callable[..., bool]

STANDARD_ACTIONS = frozenset(
    {
        "list",
        "create",
        "retrieve",
        "update",
        "partial_update",
        "destroy",
    }
)


class CapabilityResourcePermission(BasePermission):
    """
    Shared permission logic for PG/SB kernel resources.
    Subclasses set `rules_for_role` and `can_access_resource` callables (from product rbac.py).
    """

    rules_for_role: RulesForRoleFn | None = None
    can_access_resource: CanAccessResourceFn | None = None

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if get_membership(request) is None:
            return False
        slug = getattr(view, "resource_slug", "")
        if self.can_access_resource is None or not self.can_access_resource(request, slug):
            return False
        role = get_tenant_role(request)
        rules_fn = self.rules_for_role
        if rules_fn is None:
            return True
        action = getattr(view, "action", None)
        if request.method == "DELETE" or action == "destroy":
            rules = rules_fn(slug, role) or {}
            if not rules.get("delete"):
                return False
        if request.method == "POST" and (action in (None, "create")):
            rules = rules_fn(slug, role) or {}
            if not rules.get("create"):
                return False
        if request.method in ("PUT", "PATCH") or action in ("update", "partial_update"):
            rules = rules_fn(slug, role) or {}
            if not rules.get("update"):
                return False
        if action and action not in STANDARD_ACTIONS:
            if action == "timeline" and request.method in SAFE_METHODS:
                return True
            rules = rules_fn(slug, role) or {}
            allowed = rules.get("actions")
            if allowed is not None and action not in allowed:
                return False
        return True

    def has_object_permission(self, request, view, obj):
        return True


class ProductRBACMixin:
    """Mixin for ViewSets — documents that RESOURCE_RULES live in product rbac.py."""

    RESOURCE_RULES: dict = {}


def build_capability_permission(
    *,
    rules_for_role: RulesForRoleFn,
    can_access_resource: CanAccessResourceFn,
    object_permission_class: type[CapabilityResourcePermission] | None = None,
) -> type[CapabilityResourcePermission]:
    """Factory for product-specific permission classes without duplicating has_permission."""

    base = object_permission_class or CapabilityResourcePermission

    class _Permission(base):
        rules_for_role = staticmethod(rules_for_role)
        can_access_resource = staticmethod(can_access_resource)

    _Permission.__name__ = f"{base.__name__}Derived"
    return _Permission
