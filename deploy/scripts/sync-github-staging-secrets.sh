#!/usr/bin/env bash
# Push staging environment secrets to GitHub (requires: gh auth login).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FILE="$ROOT/deploy/.secrets/github-staging-secrets.env"

if [[ ! -f "$FILE" ]]; then
  echo "Missing $FILE — run provision-staging-india.sh and setup-github-oidc.sh first"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: brew install gh && gh auth login"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Run: gh auth login"
  exit 1
fi

REPO="${GITHUB_REPO_SLUG:-}"
if [[ -z "$REPO" ]]; then
  REMOTE="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
  if [[ "$REMOTE" =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
    REPO="${BASH_REMATCH[1]}/${BASH_REMATCH[2]}"
  fi
fi

if [[ -z "$REPO" ]]; then
  echo "Set GITHUB_REPO_SLUG=org/repo"
  exit 1
fi

echo "Syncing secrets to $REPO environment 'staging'..."
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// }" ]] && continue
  if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
    key="${BASH_REMATCH[1]}"
    val="${BASH_REMATCH[2]}"
    val="${val%\"}"
    val="${val#\"}"
    echo "  $key"
    echo -n "$val" | gh secret set "$key" --env staging --repo "$REPO"
  fi
done < <(grep -v '^#' "$FILE" | grep '=')

echo "Done. Enable Actions read/write: Settings → Actions → General → Workflow permissions"
