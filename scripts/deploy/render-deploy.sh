#!/usr/bin/env bash
# NU-AURA — Render deploy hook trigger.
#
# Fires a Render Deploy Hook to (re)deploy the current origin/main.
# The hook URL is a SECRET — never commit it. Provide it one of two ways:
#   1) env:   RENDER_DEPLOY_HOOK_URL="https://api.render.com/deploy/srv-xxx?key=yyy" ./scripts/deploy/render-deploy.sh
#   2) file:  scripts/deploy/.env  (gitignored) containing: RENDER_DEPLOY_HOOK_URL=...
#
# Get the URL from: Render Dashboard -> your service -> Settings -> Deploy Hook.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "${HERE}/.env" ] && set -a && . "${HERE}/.env" && set +a

URL="${RENDER_DEPLOY_HOOK_URL:-}"
if [ -z "${URL}" ]; then
  echo "ERROR: RENDER_DEPLOY_HOOK_URL is not set." >&2
  echo "  Render Dashboard -> service -> Settings -> Deploy Hook, then:" >&2
  echo "  RENDER_DEPLOY_HOOK_URL='<url>' $0   (or put it in ${HERE}/.env)" >&2
  exit 1
fi
case "${URL}" in
  https://api.render.com/deploy/srv-*) : ;;
  *) echo "ERROR: that does not look like a Render deploy hook URL (expected https://api.render.com/deploy/srv-...)." >&2; exit 1 ;;
esac

echo "[render-deploy] triggering deploy of origin/main ($(git rev-parse --short origin/main 2>/dev/null || echo '?'))..."
RESP="$(curl -fsS -X POST "${URL}")" || { echo "[render-deploy] curl failed" >&2; exit 1; }
echo "[render-deploy] response: ${RESP}"
echo "[render-deploy] watch progress in the Render dashboard (Events/Logs)."
