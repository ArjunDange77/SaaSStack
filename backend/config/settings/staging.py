"""Azure staging environment."""

import os

from .base import *  # noqa: F401,F403

DEPLOY_ENV = "staging"
DEBUG = os.getenv("DJANGO_DEBUG", "False").lower() in ("1", "true", "yes")

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if o.strip()
]

CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

MIDDLEWARE = [  # noqa: F405
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    *MIDDLEWARE[2:],  # noqa: F405
]

if APPLICATIONINSIGHTS_CONNECTION_STRING:  # noqa: F405
    from config.instrumentation import configure_app_insights

    configure_app_insights()
