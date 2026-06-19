#!/usr/bin/env bash
set -euo pipefail

ISSUE_FILE="NU_AURA_SHARED_ISSUE_COORDINATION.md"
PROMPT_FILE="NU_AURA_CODEX_PARALLEL_FIXER_PROMPT.md"
LOCK_FILE=".codex_issue_runner.lock"

echo "Watching ${ISSUE_FILE} for updates..."

fswatch -o "${ISSUE_FILE}" | while read -r _event
do
  if [ -f "${LOCK_FILE}" ]; then
    echo "Codex already running. Skipping duplicate trigger."
    continue
  fi

  touch "${LOCK_FILE}"
  status=0

  echo "Issue file updated. Pulling latest and triggering Codex..."

  git pull --rebase --autostash || status=$?

  if [ "${status}" -eq 0 ]; then
    codex exec --full-auto "
Read ${PROMPT_FILE}.
Read ${ISSUE_FILE}.

Focus only on:
- Spring Boot
- PostgreSQL
- Redis
- Kafka
- Security
- RBAC
- APIs

Pick the highest-priority issue from ${ISSUE_FILE} that is relevant to that focus and is not already FIXED_PENDING_RETEST, RETEST_PASSED, or ACCEPTED_RISK.

Do only one issue.

Rules:
1. Pull latest was already attempted by the runner; re-check git status before editing.
2. Confirm the issue is still valid from code evidence.
3. If evidence is insufficient, update the issue to NEEDS_MORE_EVIDENCE and stop.
4. Add root cause, impacted files/APIs/tables/permissions, risk, proposed solution, tests, migration/config impact, rollback plan, security/RBAC impact, and tenant-isolation impact to ${ISSUE_FILE}.
5. Do not implement code unless the issue status is APPROVED_TO_FIX.
6. If status is APPROVED_TO_FIX, implement the smallest safe fix, add/update meaningful tests, run the narrowest relevant tests first, then update status to FIXED_PENDING_RETEST.
7. Never weaken RBAC, tenant isolation, authentication, validation, auditability, or server-side authorization.
8. Do not solve backend authorization defects by hiding frontend buttons only.
9. Do not broaden permissions unless the existing permission model proves it is correct.
10. Do not work on multiple issues.
11. Do not overwrite other agents' findings.
" || status=$?
  fi

  if [ "${status}" -eq 0 ]; then
    git pull --rebase --autostash || status=$?
  fi

  if [ "${status}" -eq 0 ]; then
    git add "${ISSUE_FILE}"
    git add -u

    if ! git diff --cached --quiet; then
      git commit -m "chore(coordination): auto-process shared issue update" || status=$?
    fi
  fi

  if [ "${status}" -eq 0 ]; then
    git push || status=$?
  fi

  rm -f "${LOCK_FILE}"

  if [ "${status}" -ne 0 ]; then
    echo "Codex issue runner failed with status ${status}."
  fi
done
