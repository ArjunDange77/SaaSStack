from __future__ import annotations

from typing import Any, Optional

from apps.registry.models import ActivityLog


def log_activity(
    *,
    tenant,
    resource_slug: str,
    object_id: str | int,
    verb: str,
    message: str,
    actor=None,
    metadata: Optional[dict[str, Any]] = None,
) -> ActivityLog:
    return ActivityLog.objects.create(
        tenant=tenant,
        resource_slug=resource_slug,
        object_id=str(object_id),
        verb=verb,
        message=message,
        actor=actor,
        metadata=metadata or {},
    )
