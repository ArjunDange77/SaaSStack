# shellcheck shell=bash
# Source to set SLOT_ARGS array for az webapp commands (empty = production slot).
DEPLOY_SLOT="${DEPLOY_SLOT:-}"
SLOT_ARGS=()
if [[ -n "$DEPLOY_SLOT" ]]; then
  SLOT_ARGS=(--slot "$DEPLOY_SLOT")
fi
