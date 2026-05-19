#!/usr/bin/env bash
# Fail fast if Vite build output is missing files required for Azure Static Web Apps.
set -euo pipefail

DIST="${1:-frontend/dist}"

if [[ ! -f "$DIST/index.html" ]]; then
  echo "ERROR: missing $DIST/index.html — run: cd frontend && npm run build" >&2
  exit 1
fi

if [[ ! -f "$DIST/staticwebapp.config.json" ]]; then
  echo "ERROR: missing $DIST/staticwebapp.config.json (SPA fallback for SWA)" >&2
  exit 1
fi

echo "OK: frontend dist ready for SWA upload"
echo "  index.html: $(wc -c <"$DIST/index.html" | tr -d ' ') bytes"
ls -la "$DIST" | head -15
