#!/usr/bin/env bash
# Pre-commit guard: block commits that add .env files or literal-looking
# secrets (API keys, JWT/encryption secrets, DB passwords, etc).
#
# NOT INSTALLED BY DEFAULT. To enable locally, chain it into the existing
# hook at .git/hooks/pre-commit (see docs/README in this directory), or add
# it as a `local` hook entry if the team later adopts the `pre-commit`
# framework (https://pre-commit.com) — no .pre-commit-config.yaml exists in
# this repo yet, so this script is framework-agnostic on purpose.
#
# If `gitleaks` is installed (https://github.com/gitleaks/gitleaks) it is
# preferred and run first — it covers far more secret shapes than the regex
# fallback below. The fallback exists so the guard still works with zero
# extra tooling installed.
#
# Exit 0 = OK, exit 1 = blocked.

set -euo pipefail

staged="$(git diff --cached --name-only --diff-filter=ACMRT 2>/dev/null || true)"
[[ -z "${staged}" ]] && exit 0

fail=0

# 1. Block committed .env files outright (belt-and-suspenders on top of
#    .gitignore — .gitignore only stops untracked files, this stops
#    `git add -f`).
while IFS= read -r path; do
  [[ -z "${path}" ]] && continue
  case "${path}" in
    .env|.env.*|*/.env|*/.env.*)
      # allow committed example/template files
      case "${path}" in
        *.env.example|*.env.sample|*.env.template) continue ;;
      esac
      echo "blocked: '${path}' looks like an env file. Do not commit .env files."
      fail=1
      ;;
  esac
done <<< "${staged}"

# 2. Prefer gitleaks for the real scan if available.
if command -v gitleaks >/dev/null 2>&1; then
  if ! gitleaks protect --staged --redact --no-banner; then
    fail=1
  fi
else
  # 3. Regex fallback — covers the credential shapes this repo has actually
  #    leaked before (Groq/OpenAI-style keys, JWT/encryption secrets in env
  #    assignments, DB connection strings with inline passwords).
  patterns=(
    'gsk_[A-Za-z0-9]{20,}'                                  # Groq API key
    'sk-[A-Za-z0-9]{20,}'                                   # OpenAI-style key
    'AKIA[0-9A-Z]{16}'                                      # AWS access key id
    '(JWT_SECRET|APP_SECURITY_ENCRYPTION_KEY|ENCRYPTION_KEY)[[:space:]]*=[[:space:]]*[^[:space:]$]{8,}'
    '(SPRING_DATASOURCE_PASSWORD|NEON_DB_PASSWORD|MINIO_ROOT_PASSWORD)[[:space:]]*=[[:space:]]*[^[:space:]$]{4,}'
    'postgres(ql)?://[^:]+:[^@[:space:]]+@'                 # DB URL with inline password
  )
  diff_content="$(git diff --cached -U0 --diff-filter=ACMRT -- . ':!*.lock' ':!package-lock.json' 2>/dev/null || true)"
  for p in "${patterns[@]}"; do
    if echo "${diff_content}" | grep -E -q "${p}"; then
      echo "blocked: staged diff matches secret-like pattern: ${p}"
      fail=1
    fi
  done
fi

if [[ "${fail}" -ne 0 ]]; then
  echo
  echo "Commit blocked by scripts/security/pre-commit-secret-scan.sh"
  echo "If this is a false positive, fix the pattern or (last resort) skip with --no-verify."
  exit 1
fi

exit 0
