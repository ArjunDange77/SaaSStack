#!/usr/bin/env python3
"""Post-deploy smoke tests for staging and production."""

from __future__ import annotations

import os
import sys

import httpx

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000").rstrip("/")
SMOKE_SWA_URL = os.getenv("SMOKE_SWA_URL", "").rstrip("/")
SMOKE_USERNAME = os.getenv("SMOKE_USERNAME", "admin")
SMOKE_PASSWORD = os.getenv("SMOKE_PASSWORD", "admin")
SMOKE_TENANT = os.getenv("SMOKE_TENANT", "pg-demo")
EXPECTED_ENV = os.getenv("EXPECTED_ENV", "")
EXPECTED_VERSION = os.getenv("EXPECTED_VERSION", "")
PUBLIC_TENANT = os.getenv("SMOKE_PUBLIC_TENANT", "pg-demo")


def fail(msg: str) -> None:
    print(f"SMOKE FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def ok(msg: str) -> None:
    print(f"SMOKE OK: {msg}")


def main() -> None:
    client = httpx.Client(base_url=API_BASE_URL, timeout=30.0)

    health = client.get("/api/health/")
    if health.status_code != 200:
        fail(f"health status {health.status_code}: {health.text}")
    data = health.json()
    if data.get("status") != "ok":
        fail(f"health not ok: {data}")
    if EXPECTED_ENV and data.get("environment") != EXPECTED_ENV:
        fail(f"environment expected {EXPECTED_ENV}, got {data.get('environment')}")
    if EXPECTED_VERSION and data.get("version") != EXPECTED_VERSION:
        fail(f"version expected {EXPECTED_VERSION}, got {data.get('version')}")
    ok("health")

    if SMOKE_SWA_URL:
        swa = httpx.get(SMOKE_SWA_URL, timeout=30.0, follow_redirects=True)
        if swa.status_code >= 400:
            fail(f"frontend status {swa.status_code} at {SMOKE_SWA_URL}")
        ok("frontend")

    login = client.post(
        "/api/auth/login/",
        json={"username": SMOKE_USERNAME, "password": SMOKE_PASSWORD},
    )
    if login.status_code != 200:
        fail(f"login status {login.status_code}: {login.text}")
    token = login.json().get("access")
    if not token:
        fail("login missing access token")
    ok("login")

    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant": SMOKE_TENANT,
    }
    catalog = client.get("/api/meta/catalog/", headers=headers)
    if catalog.status_code != 200:
        fail(f"catalog status {catalog.status_code}: {catalog.text}")
    catalog_body = catalog.json()
    resources = catalog_body if isinstance(catalog_body, list) else catalog_body.get("resources") or []
    if not resources:
        fail("catalog has no resources (run seed_pg --demo)")
    ok("catalog")

    dashboard = client.get("/api/pg/dashboard/", headers=headers)
    if dashboard.status_code != 200:
        fail(f"dashboard status {dashboard.status_code}: {dashboard.text}")
    ok("dashboard")

    booking = client.get(f"/api/pg/public/{PUBLIC_TENANT}/rooms/available/")
    if booking.status_code != 200:
        fail(f"public booking rooms status {booking.status_code}: {booking.text}")
    ok("public booking reachable")

    print("All smoke tests passed.")


if __name__ == "__main__":
    main()
