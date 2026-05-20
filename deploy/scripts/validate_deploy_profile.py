#!/usr/bin/env python3
"""Validate deploy profiles and guard against script/workflow drift (no Azure required)."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROFILES_DIR = ROOT / "deploy" / "azure" / "profiles"

# Regression: Goa seed must not default to staging slot on unified stack.
FORBIDDEN_PATTERNS: list[tuple[Path, str, str]] = [
    (
        ROOT / "deploy/scripts/seed_staging_goa_pilot.sh",
        r'DEPLOY_SLOT="\$\{DEPLOY_SLOT:-staging\}"',
        "seed_staging_goa_pilot.sh must not default DEPLOY_SLOT to staging",
    ),
]

WORKFLOW_CHECKS: dict[str, list[tuple[str, str]]] = {
    "unified-staging": [
        (ROOT / ".github/workflows/deploy-staging.yml", "azure_resource_group: rg-saasstack-staging"),
        (ROOT / ".github/workflows/deploy-staging.yml", "deploy_profile: unified-staging"),
        (ROOT / ".github/workflows/deploy-staging.yml", "run_sb_demo_seed: false"),
        (ROOT / ".github/workflows/deploy-staging.yml", "run_goa_pilot_seed: true"),
        (ROOT / ".github/workflows/deploy-staging.yml", "early_gate_script: smoke_public_api.sh"),
        (ROOT / ".github/workflows/deploy-staging.yml", "smoke_script: smoke_unified_staging.sh"),
        (
            ROOT / ".github/workflows/deploy-product-staging.yml",
            "Ensure Goa pilot seed (database)",
        ),
        (
            ROOT / ".github/workflows/deploy-product-staging.yml",
            "bash deploy/scripts/ensure_staging_goa_pilot_seed.sh",
        ),
    ],
}


def load_simple_yaml(path: Path) -> dict[str, object]:
    data: dict[str, object] = {}
    stack: list[tuple[int, dict[str, object]]] = [(0, data)]
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].rstrip()
        if not line.strip():
            continue
        indent = len(line) - len(line.lstrip())
        key, _, val = line.strip().partition(":")
        key = key.strip()
        val = val.strip()
        while stack and indent < stack[-1][0]:
            stack.pop()
        parent = stack[-1][1]
        if not val:
            child: dict[str, object] = {}
            parent[key] = child
            stack.append((indent + 2, child))
            continue
        if val in ("true", "false"):
            parent[key] = val == "true"
        else:
            parent[key] = val.strip('"').strip("'")
    return data


def check_forbidden_patterns() -> list[str]:
    errors: list[str] = []
    for path, pattern, message in FORBIDDEN_PATTERNS:
        text = path.read_text(encoding="utf-8")
        if re.search(pattern, text):
            errors.append(f"{path.relative_to(ROOT)}: {message}")
    return errors


def check_workflow_snippets(profile: str) -> list[str]:
    errors: list[str] = []
    for path, needle in WORKFLOW_CHECKS.get(profile, []):
        if not path.exists():
            errors.append(f"missing workflow file: {path.relative_to(ROOT)}")
            continue
        if needle not in path.read_text(encoding="utf-8"):
            errors.append(
                f"{path.relative_to(ROOT)}: expected snippet not found: {needle!r}"
            )
    return errors


def validate_profile(profile: str, preflight_env: bool = False) -> list[str]:
    errors: list[str] = []
    path = PROFILES_DIR / f"{profile}.yaml"
    if not path.exists():
        return [f"profile not found: {path.relative_to(ROOT)}"]

    data = load_simple_yaml(path)
    errors.extend(check_forbidden_patterns())
    errors.extend(check_workflow_snippets(profile))

    if preflight_env:
        import os

        rg = os.environ.get("AZURE_RESOURCE_GROUP", "")
        app = os.environ.get("AZURE_WEBAPP_NAME", "")
        slot = os.environ.get("DEPLOY_SLOT", "")
        expected_rg = str(data.get("resource_group", ""))
        expected_app = str(data.get("api_app", ""))
        expected_slot = str(data.get("deploy_slot", ""))
        if rg and expected_rg and rg != expected_rg:
            errors.append(f"AZURE_RESOURCE_GROUP={rg!r} != profile {expected_rg!r}")
        if app and expected_app and app != expected_app:
            errors.append(f"AZURE_WEBAPP_NAME={app!r} != profile {expected_app!r}")
        if slot != expected_slot:
            errors.append(f"DEPLOY_SLOT={slot!r} != profile deploy_slot {expected_slot!r}")

    products = data.get("products")
    if profile == "unified-staging" and not isinstance(products, dict):
        errors.append(f"{path.relative_to(ROOT)}: missing products: block")

    workflow = data.get("workflow")
    if isinstance(workflow, dict):
        deploy_staging = ROOT / ".github/workflows/deploy-staging.yml"
        if deploy_staging.exists():
            text = deploy_staging.read_text(encoding="utf-8")
            for key, expected in workflow.items():
                if isinstance(expected, bool):
                    needle = f"{key}: {str(expected).lower()}"
                else:
                    needle = f"{key}: {expected}"
                if needle not in text and str(expected) not in text:
                    errors.append(
                        f"deploy-staging.yml: expected {needle!r} for profile {profile}"
                    )

    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--profile",
        default="unified-staging",
        help="Profile name (deploy/azure/profiles/<name>.yaml)",
    )
    parser.add_argument(
        "--preflight-env",
        action="store_true",
        help="Compare AZURE_* env vars to profile (used by preflight_deploy_target.sh)",
    )
    parser.add_argument(
        "--all-profiles",
        action="store_true",
        help="Validate every profile YAML in deploy/azure/profiles/",
    )
    args = parser.parse_args()

    profiles = (
        [p.stem for p in PROFILES_DIR.glob("*.yaml")]
        if args.all_profiles
        else [args.profile]
    )
    errors: list[str] = []
    for name in profiles:
        errors.extend(validate_profile(name, preflight_env=args.preflight_env))

    if errors:
        for err in errors:
            print(err, file=sys.stderr)
        sys.exit(1)
    print(f"Deploy profile validation passed ({', '.join(profiles)}).")


if __name__ == "__main__":
    main()
