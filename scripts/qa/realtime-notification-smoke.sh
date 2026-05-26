#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

if [ -z "${DOCKER_HOST:-}" ] && command -v docker >/dev/null 2>&1; then
  DOCKER_CONTEXT_HOST="$(
    docker context inspect "$(docker context show)" --format '{{ (index .Endpoints "docker").Host }}' 2>/dev/null || true
  )"
  if [[ "$DOCKER_CONTEXT_HOST" == unix://* ]]; then
    export DOCKER_HOST="$DOCKER_CONTEXT_HOST"
  fi
fi

if [[ "${DOCKER_HOST:-}" == unix://"$HOME"/.colima/* ]]; then
  export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE="${TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE:-/var/run/docker.sock}"
fi

if [ -x "$REPO_ROOT/mvnw" ]; then
  MAVEN_CMD=("$REPO_ROOT/mvnw")
else
  MAVEN_CMD=(mvn)
fi

"${MAVEN_CMD[@]}" -pl backend -Dtest=WebSocketNotificationE2ETest test "$@"
