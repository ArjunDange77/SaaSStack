"""Test settings — SQLite in-memory (no Docker Postgres required)."""

from .settings import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

MEDIA_ROOT = BASE_DIR / "test_media"  # noqa: F405
