#!/bin/zsh
# Usage: run-batch.sh <batchName> <spec1> <spec2> ...
# Runs chromium project, workers=2, against live local stack. Writes a clean
# tally + failed-test list to qa-reports/logs/<batchName>.log and a one-line
# result to qa-reports/logs/results.tsv
set -o pipefail
BATCH="$1"; shift
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend
LOG="/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/qa-reports/logs/${BATCH}.log"
SPECS=()
for s in "$@"; do SPECS+=("e2e/${s}.spec.ts"); done

PLAYWRIGHT_BASE_URL=http://localhost:3000 \
NEXT_PUBLIC_API_URL=http://localhost:8090/api/v1 \
BACKEND_HEALTH_URL=http://localhost:8090/actuator/health/readiness \
E2E_SKIP_ROUTE_WARMUP=true \
npx playwright test "${SPECS[@]}" --project=chromium --workers=2 --reporter=line \
  > "$LOG" 2>&1
EXIT=$?

# Parse tally (strip ANSI, C locale to avoid byte-seq errors)
TALLY=$(LC_ALL=C grep -aE '[0-9]+ passed|[0-9]+ failed|[0-9]+ flaky|did not run' "$LOG" | LC_ALL=C sed 's/\x1b\[[0-9;]*[A-Za-z]//g' | tail -4 | tr '\n' ' ')
echo "${BATCH}\tEXIT=${EXIT}\t${TALLY}" >> /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/qa-reports/logs/results.tsv
echo "BATCH ${BATCH} done: EXIT=${EXIT} | ${TALLY}"
