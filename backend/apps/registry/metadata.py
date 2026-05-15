from __future__ import annotations

import inspect
from typing import Any, Dict, List, Type

from rest_framework import serializers


def _serializer_field_to_meta(name: str, field: serializers.Field) -> Optional[Dict[str, Any]]:
    if getattr(field, "write_only", False) and not getattr(field, "read_only", False):
        # hide pure write-only from list metadata (e.g. passwords)
        return None
    meta: Dict[str, Any] = {
        "name": name,
        "label": field.label or name.replace("_", " ").title(),
        "required": field.required,
        "read_only": bool(getattr(field, "read_only", False)),
        "help_text": getattr(field, "help_text", "") or "",
    }
    internal = field.__class__.__name__
    # map DRF / Django field to engine types
    if isinstance(field, serializers.BooleanField):
        meta["type"] = "boolean"
    elif isinstance(field, serializers.IntegerField):
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
        meta["related_resource"] = qs.model._meta.model_name if qs is not None else None
    else:
        meta["type"] = "string"
        meta["drf_class"] = internal
    return meta


def _collect_actions(viewset_class: Type) -> List[Dict[str, Any]]:
    actions: List[Dict[str, Any]] = []
    for name, method in inspect.getmembers(viewset_class, predicate=inspect.isfunction):
        detail = getattr(method, "detail", None)
        url_path = getattr(method, "url_path", None)
        mapping = getattr(method, "mapping", None)
        if detail is None or url_path is None:
            continue
        http_list = []
        if mapping:
            for http_method, fn_name in mapping.items():
                if fn_name == name:
                    http_list.append(http_method.lower())
        if not http_list:
            http_list = ["post"]
        actions.append(
            {
                "name": name,
                "url_path": url_path,
                "detail": bool(detail),
                "methods": http_list,
            }
        )
    return actions


def build_resource_metadata(
    slug: str,
    viewset_class: Type,
    *,
    title: str = "",
    description: str = "",
) -> Dict[str, Any]:
    serializer_class = getattr(viewset_class, "serializer_class", None)
    if serializer_class is None:
        raise ValueError(f"ViewSet {viewset_class} must define serializer_class for metadata")

    ser = serializer_class()
    fields_out: List[Dict[str, Any]] = []
    for name, field in ser.fields.items():
        meta = _serializer_field_to_meta(name, field)
        if meta:
            fields_out.append(meta)

    list_display = getattr(viewset_class, "resource_list_display", None)
    if not list_display:
        list_display = [f["name"] for f in fields_out if f["name"] != "notes" or len(fields_out) <= 6][:8]

    search_fields = list(getattr(viewset_class, "search_fields", ()) or ())
    filter_backends = [cls.__name__ for cls in getattr(viewset_class, "filter_backends", ()) or ()]

    ordering = list(getattr(viewset_class, "ordering", ()) or ())

    return {
        "resource": slug,
        "title": title or slug.replace("-", " ").title(),
        "description": description,
        "fields": fields_out,
        "list_display": list_display,
        "search": {"fields": search_fields},
        "filters": {"backends": filter_backends},
        "ordering": {"default": ordering},
        "actions": _collect_actions(viewset_class),
        "list_path": f"/api/resources/{slug}/",
        "detail_path_template": f"/api/resources/{slug}/{{id}}/",
    }
