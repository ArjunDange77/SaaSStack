"""PG product RBAC: capabilities for metadata and permission checks."""

from __future__ import annotations

from apps.registry.metadata import _collect_actions
from apps.registry.permissions import get_resident_id_for_user, get_tenant_role

OPERATOR_ROLES = ("owner", "staff")
RESIDENT_ROLE = "resident"

# Per slug, per role: create, update, delete, action names (None = all declared actions)
_RESOURCE_RULES: dict[str, dict[str, dict]] = {
    "pg-rooms": {
        "owner": {"create": True, "update": True, "delete": True, "actions": None},
        "staff": {"create": True, "update": True, "delete": False, "actions": None},
        "resident": {"create": False, "update": False, "delete": False, "actions": []},
    },
    "pg-residents": {
        "owner": {"create": True, "update": True, "delete": True, "actions": None},
        "staff": {"create": True, "update": True, "delete": False, "actions": None},
        "resident": {"create": False, "update": False, "delete": False, "actions": []},
    },
    "pg-bed-assignments": {
        "owner": {"create": True, "update": True, "delete": True, "actions": None},
        "staff": {"create": True, "update": True, "delete": False, "actions": ["vacate", "transfer"]},
        "resident": {"create": False, "update": False, "delete": False, "actions": []},
    },
    "pg-documents": {
        "owner": {"create": True, "update": True, "delete": True, "actions": ["verify", "reject"]},
        "staff": {"create": True, "update": True, "delete": False, "actions": ["verify", "reject"]},
        "resident": {"create": True, "update": False, "delete": False, "actions": []},
    },
    "pg-rent-records": {
        "owner": {"create": True, "update": True, "delete": True, "actions": ["mark_paid"]},
        "staff": {"create": False, "update": False, "delete": False, "actions": ["mark_paid"]},
        "resident": {"create": False, "update": False, "delete": False, "actions": []},
    },
    "pg-complaints": {
        "owner": {"create": True, "update": True, "delete": True, "actions": ["in_progress", "resolve"]},
        "staff": {"create": True, "update": True, "delete": False, "actions": ["in_progress", "resolve"]},
        "resident": {"create": True, "update": False, "delete": False, "actions": []},
    },
    "pg-booking-requests": {
        "owner": {"create": False, "update": True, "delete": False, "actions": ["approve", "reject"]},
        "staff": {"create": False, "update": True, "delete": False, "actions": ["approve", "reject"]},
        "resident": {"create": False, "update": False, "delete": False, "actions": []},
    },
}

# Slugs visible in operator catalog (residents use portal, not catalog)
CATALOG_OPERATOR = OPERATOR_ROLES
CATALOG_RESIDENT = ("resident",)  # only complaints in engine for residents


def _all_action_names(viewset_class) -> list[str]:
    return [a["name"] for a in _collect_actions(viewset_class)]


def rules_for_role(slug: str, role: str | None) -> dict | None:
    if not role:
        return None
    resource = _RESOURCE_RULES.get(slug, {})
    return resource.get(role)


def build_capabilities(request, viewset_class) -> dict:
    slug = getattr(viewset_class, "resource_slug", "")
    role = get_tenant_role(request)
    rules = rules_for_role(slug, role)
    all_actions = _all_action_names(viewset_class)
    if rules is None:
        return {"create": False, "update": False, "delete": False, "actions": []}
    action_names = rules.get("actions")
    if action_names is None:
        action_names = all_actions
    return {
        "create": bool(rules.get("create")),
        "update": bool(rules.get("update")),
        "delete": bool(rules.get("delete")),
        "actions": [n for n in action_names if n in all_actions],
    }


def can_access_resource(request, slug: str) -> bool:
    role = get_tenant_role(request)
    if slug not in _RESOURCE_RULES:
        return False
    if role in OPERATOR_ROLES:
        return True
    if role == RESIDENT_ROLE:
        return slug in (
            "pg-complaints",
            "pg-documents",
            "pg-rent-records",
            "pg-bed-assignments",
        )
    return False


def resident_queryset_filter(request, qs, *, resident_field="resident"):
    resident_id = get_resident_id_for_user(request)
    if resident_id is None:
        return qs.none()
    return qs.filter(**{f"{resident_field}__id": resident_id})


def is_operator(request) -> bool:
    return get_tenant_role(request) in OPERATOR_ROLES


def is_resident(request) -> bool:
    return get_tenant_role(request) == RESIDENT_ROLE
