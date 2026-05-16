#!/usr/bin/env python3
"""Validate required environment variables before deploy."""

from __future__ import annotations

import os
import sys

PROFILES: dict[str, list[str]] = {
    "staging": [
        "DJANGO_SECRET_KEY",
        "POSTGRES_DB",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "DB_HOST",
        "ALLOWED_HOSTS",
        "CORS_ALLOWED_ORIGINS",
    ],
    "production": [
        "DJANGO_SECRET_KEY",
        "POSTGRES_DB",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "DB_HOST",
        "ALLOWED_HOSTS",
        "CORS_ALLOWED_ORIGINS",
    ],
}


def main() -> None:
    profile = os.getenv("DEPLOY_PROFILE", "staging")
    required = PROFILES.get(profile, PROFILES["staging"])
    missing = [k for k in required if not os.getenv(k)]
    if profile == "production" and os.getenv("SEED_PG_DEMO", "false").lower() in (
        "1",
        "true",
        "yes",
    ):
        print("SEED_PG_DEMO must be false in production", file=sys.stderr)
        sys.exit(1)
    if missing:
        print(f"Missing env vars for {profile}: {', '.join(missing)}", file=sys.stderr)
        sys.exit(1)
    print(f"Environment validation passed ({profile}).")


if __name__ == "__main__":
    main()
