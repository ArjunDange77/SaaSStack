#!/usr/bin/env bash
# Print the live unified staging SWA URL (defaultHostname from Azure).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=lib/resolve_swa_url.sh
source "$ROOT/deploy/scripts/lib/resolve_swa_url.sh"
resolve_unified_swa_url
