#!/usr/bin/env python3
"""Validate /api/sb/parent/me/ JSON shape (portal contract)."""
from __future__ import annotations

import json
import sys


def validate(data: dict) -> list[str]:
    errors: list[str] = []
    children = data.get("children")
    if not isinstance(children, list):
        errors.append("children must be a list")
        return errors
    if not children:
        return errors
    child = children[0]
    if not isinstance(child.get("tracking"), dict):
        errors.append("children[0].tracking must be an object")
    if not isinstance(child.get("fees"), list):
        errors.append("children[0].fees must be a list")
    summary = child.get("today_trip_summary")
    if summary is not None:
        if not isinstance(summary, dict):
            errors.append("today_trip_summary must be an object when present")
        else:
            if not summary.get("trip_status"):
                errors.append("today_trip_summary.trip_status must be non-empty when summary exists")
            if "status" in summary:
                errors.append('today_trip_summary must use trip_status, not legacy key "status"')
    return errors


def main() -> int:
    raw = sys.stdin.read()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"FAIL: invalid JSON: {exc}", file=sys.stderr)
        return 1
    errors = validate(data)
    if errors:
        for err in errors:
            print(f"FAIL: {err}", file=sys.stderr)
        return 1
    print("OK: parent/me JSON shape")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
