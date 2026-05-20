#!/usr/bin/env python3
"""Post-deploy smoke tests for staging and production."""

from __future__ import annotations

import os
import sys

import httpx

try:
    from smoke_env import env_nonempty
except ImportError:  # pragma: no cover - fallback if PYTHONPATH is wrong in CI

    def env_nonempty(name: str, default: str) -> str:
        raw = os.getenv(name)
        if raw is None:
            return default
        stripped = raw.strip()
        return stripped if stripped else default


def smoke_credential(name: str, default: str) -> str:
    """Read at use-time so empty GitHub secrets cannot stick as blank env vars."""
    return env_nonempty(name, default)


API_BASE_URL = smoke_credential("API_BASE_URL", "http://localhost:8000").rstrip("/")
SMOKE_SWA_URL = smoke_credential("SMOKE_SWA_URL", "").rstrip("/")
SMOKE_TENANT = smoke_credential("SMOKE_TENANT", "pg-demo")
EXPECTED_ENV = smoke_credential("EXPECTED_ENV", "")
EXPECTED_VERSION = smoke_credential("EXPECTED_VERSION", "")
PUBLIC_TENANT = smoke_credential("SMOKE_PUBLIC_TENANT", "pg-demo")
SMOKE_MIN_SEATMAP_ROOMS = int(smoke_credential("SMOKE_MIN_SEATMAP_ROOMS", "0") or "0")


def fail(msg: str) -> None:
    print(f"SMOKE FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def ok(msg: str) -> None:
    print(f"SMOKE OK: {msg}")


def login(client: httpx.Client, role: str, username: str, password: str) -> str:
    user = (username or "").strip()
    pwd = (password or "").strip()
    if not user or not pwd:
        fail(
            f"login ({role}) missing credentials for {role}; "
            f"set env vars or remove empty GitHub secrets so defaults apply "
            f"(resident: resident/admin, operator: admin/admin)"
        )
    response = client.post(
        "/api/auth/login/",
        json={"username": user, "password": pwd},
    )
    if response.status_code != 200:
        fail(f"login ({role}:{user}) status {response.status_code}: {response.text}")
    token = response.json().get("access")
    if not token:
        fail(f"login ({role}:{user}) missing access token")
    return token


def min_seatmap_rooms() -> int:
    if SMOKE_MIN_SEATMAP_ROOMS > 0:
        return SMOKE_MIN_SEATMAP_ROOMS
    if EXPECTED_ENV == "staging":
        return 48
    return 0


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

    operator_user = smoke_credential("SMOKE_USERNAME", "admin")
    operator_pass = smoke_credential("SMOKE_PASSWORD", "admin")
    operator_token = login(client, "operator", operator_user, operator_pass)
    ok("operator login")

    headers = {
        "Authorization": f"Bearer {operator_token}",
        "X-Tenant": SMOKE_TENANT,
    }

    me = client.get("/api/accounts/me/", headers=headers)
    if me.status_code != 200:
        fail(f"accounts/me status {me.status_code}: {me.text}")
    me_body = me.json()
    if not me_body.get("username"):
        fail("accounts/me missing username")
    ok("accounts/me")

    catalog = client.get("/api/meta/catalog/", headers=headers)
    if catalog.status_code != 200:
        fail(f"catalog status {catalog.status_code}: {catalog.text}")
    catalog_body = catalog.json()
    resources = catalog_body if isinstance(catalog_body, list) else catalog_body.get("resources") or []
    if not resources:
        fail("catalog has no resources (run seed_pg --demo)")
    ok("catalog")

    schema = client.get("/api/meta/schema/pg-rooms/", headers=headers)
    if schema.status_code != 200:
        fail(f"schema pg-rooms status {schema.status_code}: {schema.text}")
    if not schema.json().get("fields"):
        fail("schema pg-rooms missing fields")
    ok("schema pg-rooms")

    dashboard = client.get("/api/pg/dashboard/", headers=headers)
    if dashboard.status_code != 200:
        fail(f"dashboard status {dashboard.status_code}: {dashboard.text}")
    ok("dashboard")

    booking = client.get(f"/api/pg/public/{PUBLIC_TENANT}/rooms/available/")
    if booking.status_code != 200:
        fail(f"public booking rooms status {booking.status_code}: {booking.text}")
    ok("public booking reachable")

    seatmap = client.get(f"/api/pg/public/{PUBLIC_TENANT}/rooms/seatmap/")
    if seatmap.status_code != 200:
        fail(f"public seatmap status {seatmap.status_code}: {seatmap.text}")
    seatmap_body = seatmap.json()
    if not seatmap_body.get("floors"):
        fail("public seatmap missing floors")
    total_rooms = seatmap_body.get("summary", {}).get("total_rooms", 0)
    min_rooms = min_seatmap_rooms()
    if total_rooms < 1:
        fail("public seatmap has no rooms")
    if min_rooms and total_rooms < min_rooms:
        fail(
            f"public seatmap has {total_rooms} rooms (need {min_rooms}); "
            "run seed_pg --demo or Deploy Staging with Re-seed pg-demo"
        )
    selectable = any(
        r.get("selectable")
        for floor in seatmap_body.get("floors", [])
        for r in floor.get("rooms", [])
    )
    if not selectable:
        fail("public seatmap has no selectable room")
    ok("public seatmap")

    resident_user = smoke_credential("SMOKE_RESIDENT_USER", "resident")
    resident_pass = smoke_credential("SMOKE_RESIDENT_PASSWORD", "admin")
    resident_token = login(client, "resident", resident_user, resident_pass)
    ok("resident login")

    resident_headers = {
        "Authorization": f"Bearer {resident_token}",
        "X-Tenant": SMOKE_TENANT,
    }
    resident_me = client.get("/api/accounts/me/", headers=resident_headers)
    if resident_me.status_code != 200:
        fail(f"resident accounts/me status {resident_me.status_code}: {resident_me.text}")
    if resident_me.json().get("role") != "resident":
        fail(f"resident accounts/me expected role resident, got {resident_me.json().get('role')}")
    ok("resident accounts/me")

    portal = client.get("/api/pg/resident/me/", headers=resident_headers)
    if portal.status_code != 200:
        fail(f"resident portal status {portal.status_code}: {portal.text}")
    portal_body = portal.json()
    if "profile" not in portal_body:
        fail("resident portal missing profile")
    ok("resident portal")

    print("All smoke tests passed.")


if __name__ == "__main__":
    main()
