#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export GITHUB_ENVIRONMENT=schoolbus-production
export SYNC_SECRETS_FILE="$ROOT/deploy/.secrets/github-schoolbus-production-secrets.env"
exec "$(dirname "$0")/sync-github-schoolbus-staging-secrets.sh"
