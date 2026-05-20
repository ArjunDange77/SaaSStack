"""Deployment health checks for probes and CI smoke gates."""

import os

from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView


def _deploy_environment() -> str:
    env = getattr(settings, "DEPLOY_ENV", None) or os.getenv("DEPLOY_ENV", "")
    env = str(env).strip().lower()
    if env in ("local", "staging", "production"):
        return env
    return "local"


def _check_database() -> str:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return "ok"
    except Exception:
        return "unavailable"


def _check_storage() -> str:
    if getattr(settings, "USE_AZURE_STORAGE", False):
        try:
            from django.core.files.storage import default_storage

            default_storage.listdir("")
            return "ok"
        except Exception:
            return "unavailable"
    media_root = getattr(settings, "MEDIA_ROOT", None)
    if not media_root:
        return "skipped"
    try:
        os.makedirs(media_root, exist_ok=True)
        probe = os.path.join(media_root, ".health_probe")
        with open(probe, "w", encoding="utf-8") as fh:
            fh.write("ok")
        os.remove(probe)
        return "ok"
    except Exception:
        return "unavailable"


class HealthView(APIView):
    """GET /api/health/ — app, database, and storage checks with deploy metadata."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        db_status = _check_database()
        storage_status = _check_storage()
        checks = {"database": db_status, "storage": storage_status}
        all_ok = all(v in ("ok", "skipped") for v in checks.values())
        payload = {
            "status": "ok" if all_ok else "degraded",
            "version": getattr(settings, "APP_VERSION", None) or os.getenv("APP_VERSION", "dev"),
            "environment": _deploy_environment(),
            "checks": checks,
        }
        status_code = 200 if all_ok else 503
        return JsonResponse(payload, status=status_code)
