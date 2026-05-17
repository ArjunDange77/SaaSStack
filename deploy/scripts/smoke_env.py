"""Helpers for deploy smoke tests."""

from __future__ import annotations

import os


def env_nonempty(name: str, default: str) -> str:
    raw = os.getenv(name)
    if raw is None:
        return default
    stripped = raw.strip()
    return stripped if stripped else default
