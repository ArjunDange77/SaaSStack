"""Azure production environment."""

import os

from .base import *  # noqa: F401,F403

DEPLOY_ENV = "production"
DEBUG = False

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if o.strip()
]

CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS
SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "true").lower() in ("1", "true", "yes")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

MIDDLEWARE = [  # noqa: F405
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    *MIDDLEWARE[2:],  # noqa: F405
]

if APPLICATIONINSIGHTS_CONNECTION_STRING:  # noqa: F405
    from config.instrumentation import configure_app_insights

    configure_app_insights()
