"""School Bus RBAC: capabilities for metadata and permission checks."""

from __future__ import annotations

from apps.registry.metadata import _collect_actions
from apps.registry.permissions import get_tenant_role

OPERATOR_ROLES = ("owner", "staff")
PARENT_ROLE = "parent"
DRIVER_ROLE = "driver"

_OPERATOR = {"create": True, "update": True, "delete": True, "actions": None}
_STAFF = {"create": True, "update": True, "delete": False, "actions": None}
_PARENT_READ = {"create": False, "update": False, "delete": False, "actions": []}
_DRIVER_TRIP = {"create": True, "update": True, "delete": False, "actions": ["mark_paid"]}

_RESOURCE_RULES: dict[str, dict[str, dict]] = {
    "sb-drivers": {"owner": _OPERATOR, "staff": _STAFF, "parent": _PARENT_READ},
    "sb-buses": {"owner": _OPERATOR, "staff": _STAFF, "parent": _PARENT_READ},
    "sb-routes": {"owner": _OPERATOR, "staff": _STAFF, "parent": _PARENT_READ},
    "sb-stops": {"owner": _OPERATOR, "staff": _STAFF, "parent": _PARENT_READ},
    "sb-route-stops": {"owner": _OPERATOR, "staff": _STAFF, "parent": _PARENT_READ},
    "sb-students": {"owner": _OPERATOR, "staff": _STAFF, "parent": _PARENT_READ},
    "sb-parents": {"owner": _OPERATOR, "staff": _STAFF, "parent": _PARENT_READ},
    "sb-trips": {"owner": _OPERATOR, "staff": _STAFF, "parent": _PARENT_READ},
    "sb-trip-attendance": {"owner": _OPERATOR, "staff": _STAFF, "parent": _PARENT_READ},
    "sb-fee-records": {
        "owner": _OPERATOR,
        "staff": _STAFF,
        "parent": _PARENT_READ,
    },
    "sb-fee-payments": {"owner": _OPERATOR, "staff": _STAFF, "parent": _PARENT_READ},
    "sb-incidents": {"owner": _OPERATOR, "staff": _STAFF, "parent": _PARENT_READ},
    "sb-reminders": {"owner": _OPERATOR, "staff": _STAFF, "parent": _PARENT_READ},
}

CATALOG_OPERATOR = tuple(_RESOURCE_RULES.keys())

# Declarative contract (registry ProductRBACMixin)
RESOURCE_RULES = _RESOURCE_RULES


def rules_for_role(slug: str, role: str | None) -> dict | None:
    if role is None:
        return None
    return _RESOURCE_RULES.get(slug, {}).get(role)


def can_access_resource(request, slug: str) -> bool:
    role = get_tenant_role(request)
    if role is None:
        return False
    if role == DRIVER_ROLE:
        return False
    if role in OPERATOR_ROLES:
        return slug in CATALOG_OPERATOR
    if role == PARENT_ROLE:
        return slug in CATALOG_OPERATOR and rules_for_role(slug, role) is not None
    return False


def is_operator(request) -> bool:
    return get_tenant_role(request) in OPERATOR_ROLES


def is_parent(request) -> bool:
    return get_tenant_role(request) == PARENT_ROLE


def build_capabilities(request, viewset_class):
    from apps.registry.metadata import _default_capabilities

    caps = _default_capabilities(viewset_class)
    slug = getattr(viewset_class, "resource_slug", "")
    role = get_tenant_role(request)
    rules = rules_for_role(slug, role) or {}
    caps["create"] = bool(rules.get("create"))
    caps["update"] = bool(rules.get("update"))
    caps["delete"] = bool(rules.get("delete"))
    allowed_actions = rules.get("actions")
    if allowed_actions is not None:
        declared = _collect_actions(viewset_class)
        caps["actions"] = [a for a in declared if a in allowed_actions]
    return caps
