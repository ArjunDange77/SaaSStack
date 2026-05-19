"""
Shared Django settings for SaaSStack.
Environment-specific overrides live in local.py, staging.py, and production.py.
"""
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-secret")
DEBUG = os.getenv("DJANGO_DEBUG", "True").lower() in ("1", "true", "yes")
ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "*").split(",") if h.strip()]

APP_VERSION = os.getenv("APP_VERSION", "dev")
DEPLOY_ENV = os.getenv("DEPLOY_ENV", "local")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "apps.accounts",
    "apps.tenancy",
    "apps.registry",
    "apps.demo",
    "apps.products.pg_management",
    "apps.products.school_bus",
    "apps.cosmetix",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "apps.registry.middleware.RequestContextMiddleware",
    "apps.tenancy.middleware.TenantMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "saasstack"),
        "USER": os.getenv("POSTGRES_USER", "saas"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "changeme"),
        "HOST": os.getenv("DB_HOST", "db"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

USE_AZURE_STORAGE = os.getenv("USE_AZURE_STORAGE", "false").lower() in ("1", "true", "yes")

STORAGES = {
    "default": {
        "BACKEND": "apps.registry.storage.TenantPrefixedFileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

if USE_AZURE_STORAGE:
    STORAGES["default"] = {
        "BACKEND": "apps.registry.storage.TenantPrefixedAzureStorage",
    }
    AZURE_ACCOUNT_NAME = os.getenv("AZURE_STORAGE_ACCOUNT_NAME", "")
    AZURE_CONTAINER = os.getenv("AZURE_STORAGE_CONTAINER", "media")
    AZURE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "django_cache",
    }
}

PUBLIC_BOOKING_BURST_RATE = os.getenv("PUBLIC_BOOKING_BURST_RATE", "5/minute")
PUBLIC_BOOKING_ROOMS_RATE = os.getenv("PUBLIC_BOOKING_ROOMS_RATE", "60/hour")
PUBLIC_BOOKING_SUBMIT_RATE = os.getenv("PUBLIC_BOOKING_SUBMIT_RATE", "10/hour")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "public_booking_burst": PUBLIC_BOOKING_BURST_RATE,
        "public_booking_rooms": PUBLIC_BOOKING_ROOMS_RATE,
        "public_booking_submit": PUBLIC_BOOKING_SUBMIT_RATE,
    },
}


def _jwt_access_lifetime() -> timedelta:
    raw = os.getenv("SIMPLE_JWT_ACCESS_MINUTES") or os.getenv(
        "SIMPLE_JWT_ACCESS_TOKEN_LIFETIME_MINUTES"
    )
    if raw:
        return timedelta(minutes=int(raw))
    if DEBUG:
        return timedelta(days=7)
    return timedelta(minutes=15)


def _jwt_refresh_lifetime() -> timedelta:
    raw = os.getenv("SIMPLE_JWT_REFRESH_DAYS") or os.getenv(
        "SIMPLE_JWT_REFRESH_TOKEN_LIFETIME_DAYS"
    )
    return timedelta(days=int(raw or 30))


SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": _jwt_access_lifetime(),
    "REFRESH_TOKEN_LIFETIME": _jwt_refresh_lifetime(),
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_context": {
            "()": "apps.registry.logging_filters.RequestContextFilter",
        },
    },
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.json.JsonFormatter",
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s %(tenant_slug)s %(user_id)s",
        },
        "verbose": {
            "format": "%(asctime)s %(levelname)s [%(request_id)s] [%(tenant_slug)s] [%(user_id)s] %(name)s: %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "filters": ["request_context"],
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.getenv("LOG_LEVEL", "INFO"),
    },
}

APPLICATIONINSIGHTS_CONNECTION_STRING = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING", "")

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", f"redis://{REDIS_HOST}:{REDIS_PORT}/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_TASK_ALWAYS_EAGER", "True").lower() in ("1", "true", "yes")
CELERY_TASK_EAGER_PROPAGATES = True
