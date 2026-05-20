from __future__ import annotations

import inspect
from typing import Any, Dict, List, Optional, Type

from rest_framework import serializers

from django.contrib.auth import get_user_model

from apps.registry.constants import (
    KERNEL_RELATION_DISPLAY_DEFAULTS,
    KERNEL_USER_DISPLAY_FIELD,
    KERNEL_USER_RESOURCE_SLUG,
    REGISTRY_SCHEMA_VERSION,
    USER_RELATION_FIELD_NAMES,
)
from apps.registry.relation_map import model_to_resource_slug

User = get_user_model()


def _apply_ui_overrides(meta: Dict[str, Any], viewset_class: Type, field_name: str) -> None:
    overrides = getattr(viewset_class, "field_ui_overrides", {}) or {}
    ui = overrides.get(field_name)
    if ui:
        meta["ui"] = ui
    help_text = meta.get("help_text") or ""
    if help_text and "ui" not in meta:
        meta["ui"] = {"help_text": help_text}
    elif help_text and "ui" in meta and "help_text" not in meta["ui"]:
        meta["ui"]["help_text"] = help_text


def _serializer_field_to_meta(
    name: str,
    field: serializers.Field,
    viewset_class: Type,
) -> Optional[Dict[str, Any]]:
    if getattr(field, "write_only", False) and not getattr(field, "read_only", False):
        return None
    meta: Dict[str, Any] = {
        "name": name,
        "label": field.label or name.replace("_", " ").title(),
        "required": field.required,
        "read_only": bool(getattr(field, "read_only", False)),
        "help_text": getattr(field, "help_text", "") or "",
    }
    internal = field.__class__.__name__
    if isinstance(field, serializers.BooleanField):
        meta["type"] = "boolean"
    elif isinstance(field, serializers.IntegerField):
        if name in USER_RELATION_FIELD_NAMES:
            meta["type"] = "relation"
            meta["related_resource"] = KERNEL_USER_RESOURCE_SLUG
            meta["relation_display_field"] = KERNEL_RELATION_DISPLAY_DEFAULTS[name]
        else:
            meta["type"] = "integer"
    elif isinstance(field, serializers.DecimalField):
        meta["type"] = "decimal"
    elif isinstance(field, serializers.ChoiceField):
        meta["type"] = "choice"
        opts: List[Any] = []
        choices = getattr(field, "choices", {}) or {}
        if hasattr(choices, "items"):
            for key, _label in choices.items():
                opts.append(key)
        else:
            for c in choices:
                opts.append(c[0] if isinstance(c, (list, tuple)) else c)
        meta["choices"] = opts
    elif isinstance(field, serializers.FileField):
        meta["type"] = "file"
    elif isinstance(field, serializers.CharField):
        style = getattr(field, "style", {}) or {}
        if style.get("base_template") == "textarea.html" or internal == "TextField":
            meta["type"] = "text"
        else:
            meta["type"] = "string"
    elif isinstance(field, serializers.DateTimeField):
        meta["type"] = "datetime"
    elif isinstance(field, serializers.DateField):
        meta["type"] = "date"
    elif isinstance(field, serializers.PrimaryKeyRelatedField):
        meta["type"] = "relation"
        qs = getattr(field, "queryset", None)
        slug = None
        if qs is not None:
            if qs.model == User:
                slug = KERNEL_USER_RESOURCE_SLUG
            else:
                slug = model_to_resource_slug(qs.model)
        elif name in USER_RELATION_FIELD_NAMES:
            slug = KERNEL_USER_RESOURCE_SLUG
        meta["related_resource"] = slug
        display_fields = getattr(viewset_class, "relation_display_fields", {}) or {}
        defaults = dict(KERNEL_RELATION_DISPLAY_DEFAULTS)
        meta["relation_display_field"] = display_fields.get(
            name, defaults.get(name, "id")
        )
    else:
        meta["type"] = "string"
        meta["drf_class"] = internal
    _apply_ui_overrides(meta, viewset_class, name)
    return meta


# Kernel read-only endpoints — not operator-facing action buttons in the UI.
_DEFAULT_EXCLUDED_ACTION_PATHS = frozenset({"timeline"})


def _collect_actions(viewset_class: Type) -> List[Dict[str, Any]]:
    excluded = set(_DEFAULT_EXCLUDED_ACTION_PATHS)
    excluded.update(getattr(viewset_class, "metadata_excluded_actions", ()) or ())
    actions: List[Dict[str, Any]] = []
    for name, method in inspect.getmembers(viewset_class, predicate=inspect.isfunction):
        detail = getattr(method, "detail", None)
        url_path = getattr(method, "url_path", None)
        mapping = getattr(method, "mapping", None)
        if detail is None or url_path is None:
            continue
        if url_path in excluded or name in excluded:
            continue
        http_list = []
        if mapping:
            for http_method, fn_name in mapping.items():
                if fn_name == name:
                    http_list.append(http_method.lower())
        if not http_list:
            http_list = ["post"]
        action_labels = getattr(viewset_class, "action_labels", {}) or {}
        actions.append(
            {
                "name": name,
                "label": action_labels.get(name, name.replace("_", " ").title()),
                "url_path": url_path,
                "detail": bool(detail),
                "methods": http_list,
            }
        )
    return actions


def _default_capabilities(viewset_class: Type) -> Dict[str, Any]:
    actions = _collect_actions(viewset_class)
    return {
        "create": True,
        "update": True,
        "delete": True,
        "actions": [a["name"] for a in actions],
    }


def build_resource_metadata(
    slug: str,
    viewset_class: Type,
    *,
    title: str = "",
    description: str = "",
    request=None,
) -> Dict[str, Any]:
    serializer_class = getattr(viewset_class, "serializer_class", None)
    if serializer_class is None:
        raise ValueError(f"ViewSet {viewset_class} must define serializer_class for metadata")

    ser = serializer_class()
    fields_out: List[Dict[str, Any]] = []
    for name, field in ser.fields.items():
        meta = _serializer_field_to_meta(name, field, viewset_class)
        if meta:
            fields_out.append(meta)

    list_display = getattr(viewset_class, "resource_list_display", None)
    if not list_display:
        list_display = [f["name"] for f in fields_out if f["name"] != "notes" or len(fields_out) <= 6][:8]

    search_fields = list(getattr(viewset_class, "search_fields", ()) or ())
    filter_backends = [cls.__name__ for cls in getattr(viewset_class, "filter_backends", ()) or ()]
    ordering = list(getattr(viewset_class, "ordering", ()) or ())

    pagination_class = getattr(viewset_class, "pagination_class", None)
    page_size = 25
    if pagination_class is not None:
        page_size = getattr(pagination_class, "page_size", 25)

    list_filters = list(getattr(viewset_class, "list_filters", ()) or ())
    empty_state = getattr(viewset_class, "empty_state", "") or ""

    meta = {
        "schema_version": REGISTRY_SCHEMA_VERSION,
        "resource": slug,
        "title": title or slug.replace("-", " ").title(),
        "description": description,
        "fields": fields_out,
        "list_display": list(list_display),
        "search": {"fields": search_fields},
        "filters": {"backends": filter_backends},
        "ordering": {"default": ordering},
        "pagination": {"style": "page", "page_size": page_size, "max_page_size": 100},
        "actions": _collect_actions(viewset_class),
        "list_path": f"/api/meta/resources/{slug}/",
        "detail_path_template": f"/api/meta/resources/{slug}/{{id}}/",
    }
    if list_filters:
        enriched = []
        counts_fn = getattr(viewset_class, "get_list_filter_counts", None)
        counts = counts_fn(request) if request is not None and counts_fn else {}
        for f in list_filters:
            entry = dict(f)
            key = f"{f.get('param')}={f.get('value', 'true')}"
            if key in counts:
                entry["count"] = counts[key]
            elif f.get("param") in counts:
                entry["count"] = counts[f["param"]]
            enriched.append(entry)
        meta["list_filters"] = enriched
    if empty_state:
        meta["empty_state"] = empty_state
    empty_cta = getattr(viewset_class, "empty_state_cta", None)
    if empty_cta:
        meta["empty_state_cta"] = empty_cta
    alt_views = getattr(viewset_class, "list_alternate_views", None)
    if alt_views:
        meta["list_views"] = ["table", *alt_views]
    if request is not None and hasattr(viewset_class, "get_metadata_capabilities"):
        caps = viewset_class.get_metadata_capabilities(request)
    elif request is not None:
        caps = _default_capabilities(viewset_class)
    else:
        caps = None
    if caps is not None:
        meta["capabilities"] = caps
    return meta
