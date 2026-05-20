from __future__ import annotations

import logging
from typing import Any, Optional

from django.db import DatabaseError

from apps.registry.models import ActivityLog

logger = logging.getLogger(__name__)


def log_activity(
    *,
    tenant,
    resource_slug: str,
    object_id: str | int,
    verb: str,
    message: str,
    actor=None,
    metadata: Optional[dict[str, Any]] = None,
) -> ActivityLog | None:
    """Write activity row; never fail the parent request if logging is unavailable."""
    try:
        return ActivityLog.objects.create(
            tenant=tenant,
            resource_slug=resource_slug,
            object_id=str(object_id),
            verb=verb,
            message=message,
            actor=actor,
            metadata=metadata or {},
        )
    except DatabaseError as exc:
        logger.warning(
            "Activity log skipped (run migrate on apps.registry): %s",
            exc,
        )
        return None
