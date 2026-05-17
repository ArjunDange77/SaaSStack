#!/usr/bin/env python3
"""Post-deploy smoke tests for staging and production."""

from __future__ import annotations

import os
import sys

import httpx

from smoke_env import env_nonempty

API_BASE_URL = env_nonempty("API_BASE_URL", "http://localhost:8000").rstrip("/")
SMOKE_SWA_URL = env_nonempty("SMOKE_SWA_URL", "").rstrip("/")
SMOKE_USERNAME = env_nonempty("SMOKE_USERNAME", "admin")
SMOKE_PASSWORD = env_nonempty("SMOKE_PASSWORD", "admin")
SMOKE_TENANT = env_nonempty("SMOKE_TENANT", "pg-demo")
SMOKE_RESIDENT_USER = env_nonempty("SMOKE_RESIDENT_USER", "resident")
SMOKE_RESIDENT_PASSWORD = env_nonempty("SMOKE_RESIDENT_PASSWORD", "admin")
EXPECTED_ENV = env_nonempty("EXPECTED_ENV", "")
EXPECTED_VERSION = env_nonempty("EXPECTED_VERSION", "")
PUBLIC_TENANT = env_nonempty("SMOKE_PUBLIC_TENANT", "pg-demo")
SMOKE_MIN_SEATMAP_ROOMS = int(env_nonempty("SMOKE_MIN_SEATMAP_ROOMS", "0") or "0")


def fail(msg: str) -> None:
    print(f"SMOKE FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def ok(msg: str) -> None:
    print(f"SMOKE OK: {msg}")


def login(client: httpx.Client, username: str, password: str) -> str:
    response = client.post(
        "/api/auth/login/",
        json={"username": username, "password": password},
    )
    if response.status_code != 200:
        fail(f"login ({username}) status {response.status_code}: {response.text}")
    token = response.json().get("access")
    if not token:
        fail(f"login ({username}) missing access token")
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

    operator_token = login(client, SMOKE_USERNAME, SMOKE_PASSWORD)
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

    if not SMOKE_RESIDENT_USER or not SMOKE_RESIDENT_PASSWORD:
        fail(
            "resident credentials empty; set SMOKE_RESIDENT_USER/SMOKE_RESIDENT_PASSWORD "
            "or remove empty GitHub secrets so defaults apply"
        )

    resident_token = login(client, SMOKE_RESIDENT_USER, SMOKE_RESIDENT_PASSWORD)
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
