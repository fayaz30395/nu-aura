#!/usr/bin/env bash
# Deployment verification suite — runs against any environment, hardcodes none.
#
# Every check reports PASS, FAIL or SKIPPED-<reason>. A check that does not execute
# is never PASS. An unreachable service is FAIL, not SKIPPED: a gate that goes green
# because nothing answered is worse than no gate.
#
# Read-only by construction. The only non-GET requests are the two CSRF probes, which
# are designed to be rejected by the filter before reaching a controller, and the
# receipt probes, which are rejected at the write boundary. Nothing creates, updates
# or deletes.
#
#   ./scripts/verify-deployment.sh --base-url https://host [--skip-authenticated]
#
# Credentials come from the environment only — never flags, never defaults:
#   VERIFY_EMAIL, VERIFY_PASSWORD      an EXISTING account; none is ever created
#   VERIFY_SELF_EMPLOYEE_ID            that account's employee id
#   VERIFY_OTHER_EMPLOYEE_ID           another employee, same tenant (check 3)
#   VERIFY_OTHER_TENANT_EMPLOYEE_ID    an employee in a DIFFERENT tenant (check 6)
#   VERIFY_ADMIN_EMAIL/_PASSWORD       optional; a list-capable account for check 5.
#                                      Check 5 needs EMPLOYEE list permission, which a
#                                      SELF-scoped employee does not have.
#   VERIFY_DB_URL                      optional; enables check 8
#   VERIFY_EXPECTED_FLYWAY_HEAD        optional; asserted by check 8
set -uo pipefail

BASE_URL=""; SKIP_AUTH=0; PASS=0; FAIL=0; SKIP=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url) BASE_URL="${2:-}"; shift 2 ;;
    --skip-authenticated) SKIP_AUTH=1; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$BASE_URL" ]] || { echo "FATAL: --base-url is required (no default)" >&2; exit 2; }
BASE_URL="${BASE_URL%/}"

CJ="$(mktemp -t verifyjar.XXXXXX)"; trap 'rm -f "$CJ"' EXIT
pass() { printf '  PASS     %s\n' "$1"; PASS=$((PASS+1)); }
fail() { printf '  FAIL     %s — %s\n' "$1" "$2"; FAIL=$((FAIL+1)); }
skip() { printf '  SKIPPED  %s — %s\n' "$1" "$2"; SKIP=$((SKIP+1)); }
code() { curl -s -m 20 -o /dev/null -w '%{http_code}' "$@"; }

echo "Verifying ${BASE_URL}"
echo

# --- reachability -----------------------------------------------------------
# FAIL, never SKIPPED: an unreachable target must break the gate.
LIVE="$(code "${BASE_URL}/actuator/health/liveness")"
if [[ "$LIVE" == "000" ]]; then
  fail "0. service reachable" "no response from ${BASE_URL} (connection failed/timeout)"
  echo; echo "RESULT: FAIL=1 PASS=0 SKIPPED=0 — target unreachable"; exit 1
fi
[[ "$LIVE" == "200" ]] && pass "0. service reachable (liveness 200)" \
                       || fail "0. service reachable" "liveness returned ${LIVE}, expected 200"

# --- 1. unauthenticated access is refused ------------------------------------
C="$(code "${BASE_URL}/api/v1/employees")"
[[ "$C" == "401" ]] && pass "1. unauthenticated /api/v1/employees -> 401" \
                    || fail "1. unauthenticated /api/v1/employees" "got ${C}, expected 401"

# --- authentication ----------------------------------------------------------
AUTHED=0
if [[ "$SKIP_AUTH" == "1" ]]; then
  skip "auth" "--skip-authenticated was passed"
elif [[ -z "${VERIFY_EMAIL:-}" || -z "${VERIFY_PASSWORD:-}" ]]; then
  skip "auth" "VERIFY_EMAIL/VERIFY_PASSWORD not set"
else
  LOGIN="$(curl -s -m 20 -c "$CJ" -o /dev/null -w '%{http_code}' \
      -X POST "${BASE_URL}/api/v1/auth/login" -H 'Content-Type: application/json' \
      -d "{\"email\":\"${VERIFY_EMAIL}\",\"password\":\"${VERIFY_PASSWORD}\"}")"
  if [[ "$LOGIN" == "200" ]]; then AUTHED=1; pass "auth. login -> 200"
  else fail "auth. login" "got ${LOGIN}, expected 200 (credentials or account state)"; fi
fi
authskip() { skip "$1" "not authenticated"; }

# --- 2. self-access ----------------------------------------------------------
if [[ "$AUTHED" == "1" && -n "${VERIFY_SELF_EMPLOYEE_ID:-}" ]]; then
  ok=1
  for p in "leave-requests/employee" "expenses/employees"; do
    C="$(code -b "$CJ" "${BASE_URL}/api/v1/${p}/${VERIFY_SELF_EMPLOYEE_ID}")"
    [[ "$C" == "200" ]] || { fail "2. self-access ${p}" "got ${C}, expected 200"; ok=0; }
  done
  [[ "$ok" == "1" ]] && pass "2. authenticated self-access -> 200 (leave + expenses)"
elif [[ "$AUTHED" == "1" ]]; then skip "2. self-access" "VERIFY_SELF_EMPLOYEE_ID not set"
else authskip "2. self-access"; fi

# --- 3. cross-employee authorization ----------------------------------------
# Contract per endpoint. Both of these DENY with 403; they do not hide with 404.
# A 404 here would be accepted only for an endpoint documented as hiding, and none
# of the two below is. Anything else — especially 200 — is a finding.
if [[ "$AUTHED" == "1" && -n "${VERIFY_OTHER_EMPLOYEE_ID:-}" ]]; then
  ok=1
  for p in "leave-requests/employee" "expenses/employees"; do
    C="$(code -b "$CJ" "${BASE_URL}/api/v1/${p}/${VERIFY_OTHER_EMPLOYEE_ID}")"
    [[ "$C" == "403" ]] || { fail "3. cross-employee ${p}" "got ${C}, contract is 403"; ok=0; }
  done
  [[ "$ok" == "1" ]] && pass "3. cross-employee access -> 403 (leave + expenses)"
elif [[ "$AUTHED" == "1" ]]; then skip "3. cross-employee" "VERIFY_OTHER_EMPLOYEE_ID not set"
else authskip "3. cross-employee"; fi

# --- 4. foreign receipt / file boundary --------------------------------------
# F-1: a client-supplied receiptStoragePath outside <tenant>/receipts/ must be
# rejected at the write boundary. Rejected input => no state change.
if [[ "$AUTHED" == "1" ]]; then
  XT="$(awk '/XSRF-TOKEN/ {print $7}' "$CJ" | tail -1)"
  ok=1; any=0
  for bad in "../../etc/passwd" "00000000-0000-0000-0000-000000000000/payslips/other.pdf"; do
    C="$(curl -s -m 20 -b "$CJ" -o /dev/null -w '%{http_code}' \
         -X POST "${BASE_URL}/api/v1/expenses/claims/00000000-0000-0000-0000-000000000000/items" \
         -H 'Content-Type: application/json' ${XT:+-H "X-XSRF-TOKEN: ${XT}"} \
         -d "{\"receiptStoragePath\":\"${bad}\",\"amount\":1,\"description\":\"verify probe\"}")"
    any=1
    case "$C" in
      400|403|404) : ;;
      *) fail "4. foreign receipt path '${bad}'" "got ${C}; must be rejected"; ok=0 ;;
    esac
  done
  [[ "$any" == "1" && "$ok" == "1" ]] && pass "4. foreign receipt/file paths rejected"
else authskip "4. receipt boundary"; fi

# --- 5. page-size cap (IV-2) -------------------------------------------------
# Needs an account that may LIST employees. A SELF-scoped employee gets 403, which
# would prove nothing about the cap, so that case is SKIPPED with the reason rather
# than passed or failed.
if [[ "$AUTHED" == "1" ]]; then
  CJ5="$CJ"
  if [[ -n "${VERIFY_ADMIN_EMAIL:-}" && -n "${VERIFY_ADMIN_PASSWORD:-}" ]]; then
    CJ5="$(mktemp -t verifyadmin.XXXXXX)"
    ALOGIN="$(curl -s -m 20 -c "$CJ5" -o /dev/null -w '%{http_code}' \
        -X POST "${BASE_URL}/api/v1/auth/login" -H 'Content-Type: application/json' \
        -d "{\"email\":\"${VERIFY_ADMIN_EMAIL}\",\"password\":\"${VERIFY_ADMIN_PASSWORD}\"}")"
    [[ "$ALOGIN" == "200" ]] || { fail "5. page-size cap" "admin login returned ${ALOGIN}"; CJ5=""; }
  fi
  LIST_CODE="$(code -b "$CJ5" "${BASE_URL}/api/v1/employees?page=0&size=100000")"
  BODY="$(curl -s -m 25 -b "$CJ5" "${BASE_URL}/api/v1/employees?page=0&size=100000")"
  SIZE="$(printf '%s' "$BODY" | python3 -c '
import json,sys
def find(o):
    if isinstance(o,dict):
        if isinstance(o.get("size"),int): return o["size"]
        for v in o.values():
            r=find(v)
            if r is not None: return r
    return None
try: print(find(json.load(sys.stdin)))
except Exception: print("none")' 2>/dev/null)"
  if [[ "$SIZE" == "100" ]]; then pass "5. ?size=100000 capped at 100"
  elif [[ "$LIST_CODE" == "403" ]]; then
    skip "5. page-size cap" "caller may not list employees (HTTP 403); set VERIFY_ADMIN_EMAIL/VERIFY_ADMIN_PASSWORD"
  elif [[ "$SIZE" == "none" ]]; then fail "5. page-size cap" "HTTP ${LIST_CODE} with no size field in response"
  else fail "5. page-size cap" "returned page size ${SIZE}, expected 100"; fi
  [[ "$CJ5" != "$CJ" && -n "$CJ5" ]] && rm -f "$CJ5"
else authskip "5. page-size cap"; fi

# --- 6. cross-tenant isolation ----------------------------------------------
# Must deny, and must never return the other tenant's data. 403 or 404 both acceptable:
# tenant hiding via 404 is a legitimate contract, leaking a 200 is not.
if [[ "$AUTHED" == "1" && -n "${VERIFY_OTHER_TENANT_EMPLOYEE_ID:-}" ]]; then
  C="$(code -b "$CJ" "${BASE_URL}/api/v1/employees/${VERIFY_OTHER_TENANT_EMPLOYEE_ID}")"
  case "$C" in
    403|404) pass "6. cross-tenant isolation -> ${C} (no data)" ;;
    *)       fail "6. cross-tenant isolation" "got ${C}; must be 403 or 404, never data" ;;
  esac
elif [[ "$AUTHED" == "1" ]]; then skip "6. cross-tenant isolation" "VERIFY_OTHER_TENANT_EMPLOYEE_ID not set"
else authskip "6. cross-tenant isolation"; fi

# --- 7. CSRF, both directions ------------------------------------------------
if [[ "$AUTHED" == "1" ]]; then
  XT="$(awk '/XSRF-TOKEN/ {print $7}' "$CJ" | tail -1)"
  NO="$(curl -s -m 20 -b "$CJ" -o /dev/null -w '%{http_code}' -X POST \
        "${BASE_URL}/api/v1/leave-requests" -H 'Content-Type: application/json' -d '{}')"
  if [[ -z "$XT" ]]; then
    skip "7. CSRF" "no XSRF-TOKEN cookie issued"
  else
    WITH="$(curl -s -m 20 -b "$CJ" -o /dev/null -w '%{http_code}' -X POST \
            "${BASE_URL}/api/v1/leave-requests" -H 'Content-Type: application/json' \
            -H "X-XSRF-TOKEN: ${XT}" -d '{}')"
    # Rejected without a token, and NOT rejected as CSRF with one. 400 with the token
    # is the expected validation failure of the deliberately empty body.
    if [[ "$NO" == "403" && "$WITH" != "403" ]]; then
      pass "7. CSRF enforced (no token -> 403, matching token -> ${WITH})"
    else
      fail "7. CSRF" "no-token=${NO} (want 403), with-token=${WITH} (want not 403)"
    fi
  fi
else authskip "7. CSRF"; fi

# --- 8. database runtime role / RLS / Flyway ---------------------------------
if [[ -z "${VERIFY_DB_URL:-}" ]]; then
  skip "8. DB runtime/RLS/Flyway" "VERIFY_DB_URL not set"
elif ! command -v psql >/dev/null 2>&1 && ! command -v docker >/dev/null 2>&1; then
  skip "8. DB runtime/RLS/Flyway" "neither psql nor docker available"
else
  if command -v psql >/dev/null 2>&1; then q() { psql "$VERIFY_DB_URL" -At -c "$1"; }
  else q() { docker run --rm -e U="$VERIFY_DB_URL" -e Q="$1" postgres:16-alpine \
             sh -c 'psql "$U" -At -c "$Q"'; }; fi
  BYPASS="$(q "SELECT rolsuper||'/'||rolbypassrls FROM pg_roles WHERE rolname = current_user")"
  [[ "$BYPASS" == "f/f" ]] && pass "8a. runtime role is NOSUPERUSER NOBYPASSRLS" \
      || fail "8a. runtime role" "current_user has super/bypassrls = ${BYPASS}, want f/f"
  HEAD="$(q "SELECT max(version::int) FROM flyway_schema_history WHERE success")"
  if [[ -n "${VERIFY_EXPECTED_FLYWAY_HEAD:-}" ]]; then
    [[ "$HEAD" == "$VERIFY_EXPECTED_FLYWAY_HEAD" ]] && pass "8b. Flyway head = ${HEAD}" \
        || fail "8b. Flyway head" "got ${HEAD}, expected ${VERIFY_EXPECTED_FLYWAY_HEAD}"
  else
    skip "8b. Flyway head" "VERIFY_EXPECTED_FLYWAY_HEAD not set (observed ${HEAD})"
  fi
  REPAIR="$(q "SELECT count(*) FROM flyway_schema_history WHERE type = 'DELETE' OR success = false")"
  [[ "$REPAIR" == "0" ]] && pass "8c. no Flyway repair/failed rows" \
      || fail "8c. Flyway repair rows" "found ${REPAIR}, expected 0"
  NORLS="$(q "SELECT count(*) FROM (SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace JOIN information_schema.columns col ON col.table_name = c.relname AND col.table_schema = 'public' AND col.column_name = 'tenant_id' WHERE n.nspname = 'public' AND c.relkind = 'r' AND (c.relrowsecurity = false OR c.relforcerowsecurity = false)) x")"
  [[ "$NORLS" == "0" ]] && pass "8d. every tenant table has RLS enabled + forced" \
      || fail "8d. tenant tables without RLS" "found ${NORLS}, expected 0"
fi

echo
echo "RESULT: PASS=${PASS} FAIL=${FAIL} SKIPPED=${SKIP}"
[[ "$FAIL" -eq 0 ]] || exit 1
