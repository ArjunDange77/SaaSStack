"""Test settings — SQLite in-memory."""

from config.settings.base import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

MEDIA_ROOT = BASE_DIR / "test_media"  # noqa: F405
DEPLOY_ENV = "local"
CORS_ALLOW_ALL_ORIGINS = True
