#!/usr/bin/env bash
# Configuration / security equivalence between preproduction and production.
#
# A preproduction gate is only worth something if the two environments agree on the
# properties the gate exercises. This compares them and fails on any divergence that
# is not deliberate.
#
# Reads production configuration; never writes to it. Secret VALUES are never read,
# compared, printed or logged — only presence is checked.
#
#   ./scripts/preprod/drift-check.sh [--project <id>] [--preprod-env preproduction]
#                                    [--prod-env production] [--service nu-aura-backend]
#                                    [--preprod-service nu-aura-backend-preprod]
#
# The backend may carry a different service name per environment; --preprod-service
# overrides --service for the preproduction side.
#
# Optional, enabling the database half:
#   PREPROD_DB_URL, PROD_DB_URL     PROD_DB_URL is used for read-only SELECTs only
set -uo pipefail

PROJECT=""; PREPROD_ENV="preproduction"; PROD_ENV="production"; SERVICE="nu-aura-backend"; PREPROD_SERVICE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) PROJECT="${2:-}"; shift 2 ;;
    --preprod-env) PREPROD_ENV="${2:-}"; shift 2 ;;
    --prod-env) PROD_ENV="${2:-}"; shift 2 ;;
    --service) SERVICE="${2:-}"; shift 2 ;;
    --preprod-service) PREPROD_SERVICE="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
PROJ_ARG=(); [[ -n "$PROJECT" ]] && PROJ_ARG=(--project "$PROJECT")

OK=0; BAD=0; SKIPPED=0
pass() { printf '  PASS     %s\n' "$1"; OK=$((OK+1)); }
fail() { printf '  FAIL     %s — %s\n' "$1" "$2"; BAD=$((BAD+1)); }
skip() { printf '  SKIPPED  %s — %s\n' "$1" "$2"; SKIPPED=$((SKIPPED+1)); }

command -v railway >/dev/null 2>&1 || { echo "FATAL: railway CLI not found" >&2; exit 2; }

[[ -n "$PREPROD_SERVICE" ]] || PREPROD_SERVICE="$SERVICE"
vars() { railway variables --service "$2" --environment "$1" "${PROJ_ARG[@]}" --json 2>/dev/null; }
PRE_JSON="$(vars "$PREPROD_ENV" "$PREPROD_SERVICE")"; PROD_JSON="$(vars "$PROD_ENV" "$SERVICE")"
[[ -n "$PRE_JSON"  ]] || { echo "FATAL: cannot read ${PREPROD_ENV} variables" >&2; exit 2; }
[[ -n "$PROD_JSON" ]] || { echo "FATAL: cannot read ${PROD_ENV} variables" >&2; exit 2; }

get() { printf '%s' "$2" | python3 -c 'import json,sys;print(json.load(sys.stdin).get(sys.argv[1],"<unset>"))' "$1"; }
has() { printf '%s' "$2" | python3 -c 'import json,sys;v=json.load(sys.stdin).get(sys.argv[1]);print("set" if v else "unset")' "$1"; }

echo "Drift check: ${PREPROD_ENV}/${PREPROD_SERVICE} vs ${PROD_ENV}/${SERVICE}"
echo
echo "must-match configuration"
for KEY in SPRING_PROFILES_ACTIVE SPRING_DATASOURCE_USERNAME RLS_PROBE_FAIL_ON_BYPASS \
           SPRING_CACHE_TYPE RATE_LIMIT_USE_REDIS ACCOUNT_LOCKOUT_USE_REDIS \
           APP_STORAGE_PROVIDER APP_ELASTICSEARCH_ENABLED SPRING_AUTOCONFIGURE_EXCLUDE \
           APP_PAYMENTS_ENABLED RATE_LIMIT_AUTH_CAPACITY RATE_LIMIT_AUTH_REFILL \
           RATE_LIMIT_AUTH_REFILL_MIN; do
  P="$(get "$KEY" "$PRE_JSON")"; Q="$(get "$KEY" "$PROD_JSON")"
  if [[ "$P" == "$Q" ]]; then pass "${KEY} = ${P}"
  else fail "${KEY}" "preprod='${P}' production='${Q}'"; fi
done

echo
echo "deliberate divergences"
PRE_DEMO="$(get DEMO_CREDENTIALS_ENABLED "$PRE_JSON")"; PROD_DEMO="$(get DEMO_CREDENTIALS_ENABLED "$PROD_JSON")"
[[ "$PROD_DEMO" == "false" ]] && pass "production DEMO_CREDENTIALS_ENABLED = false" \
    || fail "production DEMO_CREDENTIALS_ENABLED" "is '${PROD_DEMO}', must be false"
[[ "$PRE_DEMO" == "true" ]] && pass "preproduction DEMO_CREDENTIALS_ENABLED = true (seeded fixtures)" \
    || fail "preproduction DEMO_CREDENTIALS_ENABLED" "is '${PRE_DEMO}', must be true"
PRE_VAL="$(get SPRING_FLYWAY_VALIDATE_ON_MIGRATE "$PRE_JSON")"
[[ "$PRE_VAL" == "true" ]] && pass "preproduction validate-on-migrate = true (stricter than production)" \
    || fail "preproduction SPRING_FLYWAY_VALIDATE_ON_MIGRATE" "is '${PRE_VAL}', must be true"
PROD_VAL="$(get SPRING_FLYWAY_VALIDATE_ON_MIGRATE "$PROD_JSON")"
printf '  NOTE     production validate-on-migrate = %s (left as-is by design)\n' "$PROD_VAL"

# Dead config, called out rather than relied on: spring.flyway.repair-on-migrate is
# absent from Spring Boot 3.5.x configuration metadata, so it is silently ignored.
# It must never be treated as protection against checksum drift.
for ENV_NAME in "$PREPROD_ENV" "$PROD_ENV"; do
  J="$PRE_JSON"; [[ "$ENV_NAME" == "$PROD_ENV" ]] && J="$PROD_JSON"
  R="$(get SPRING_FLYWAY_REPAIR_ON_MIGRATE "$J")"
  [[ "$R" == "<unset>" ]] || printf '  NOTE     %s SPRING_FLYWAY_REPAIR_ON_MIGRATE=%s is DEAD CONFIG (not a Spring Boot property; ignored)\n' "$ENV_NAME" "$R"
done

echo
echo "secret presence (values never read or compared)"
for KEY in JWT_SECRET APP_SECURITY_ENCRYPTION_KEY SPRING_REDIS_PASSWORD \
           SPRING_DATASOURCE_PASSWORD FLYWAY_PASSWORD; do
  P="$(has "$KEY" "$PRE_JSON")"; Q="$(has "$KEY" "$PROD_JSON")"
  if [[ "$P" == "set" && "$Q" == "set" ]]; then pass "${KEY} present in both"
  else fail "${KEY} presence" "preprod=${P} production=${Q}"; fi
done

echo
echo "database shape"
dbq() { # $1 url, $2 sql
  if command -v psql >/dev/null 2>&1; then psql "$1" -At -c "$2"
  else docker run --rm -e U="$1" -e Q="$2" postgres:16-alpine sh -c 'psql "$U" -At -c "$Q"'; fi
}
NORLS_SQL="SELECT count(*) FROM (SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN information_schema.columns col ON col.table_name=c.relname AND col.table_schema='public' AND col.column_name='tenant_id' WHERE n.nspname='public' AND c.relkind='r' AND (c.relrowsecurity=false OR c.relforcerowsecurity=false)) x"
ROLE_SQL="SELECT rolsuper||'/'||rolbypassrls FROM pg_roles WHERE rolname='nu_app_rls'"
HEAD_SQL="SELECT max(version::int) FROM flyway_schema_history WHERE success"
REPAIR_SQL="SELECT count(*) FROM flyway_schema_history WHERE type='DELETE' OR success=false"

if [[ -n "${PREPROD_DB_URL:-}" ]]; then
  R="$(dbq "$PREPROD_DB_URL" "$ROLE_SQL")"
  [[ "$R" == "f/f" ]] && pass "preprod nu_app_rls is NOSUPERUSER NOBYPASSRLS" \
      || fail "preprod nu_app_rls" "super/bypassrls = ${R:-<absent>}, want f/f"
  N="$(dbq "$PREPROD_DB_URL" "$NORLS_SQL")"
  [[ "$N" == "0" ]] && pass "preprod tenant tables without RLS = 0" \
      || fail "preprod tenant tables without RLS" "${N}"
  RP="$(dbq "$PREPROD_DB_URL" "$REPAIR_SQL")"
  [[ "$RP" == "0" ]] && pass "preprod Flyway repair/failed rows = 0" \
      || fail "preprod Flyway repair rows" "${RP}"
  PRE_HEAD="$(dbq "$PREPROD_DB_URL" "$HEAD_SQL")"
  if [[ -n "${PROD_DB_URL:-}" ]]; then
    PROD_HEAD="$(dbq "$PROD_DB_URL" "$HEAD_SQL")"   # read-only
    [[ "$PRE_HEAD" == "$PROD_HEAD" ]] && pass "Flyway head matches (${PRE_HEAD})" \
        || fail "Flyway head" "preprod=${PRE_HEAD} production=${PROD_HEAD}"
  else
    skip "Flyway head comparison" "PROD_DB_URL not set (preprod head ${PRE_HEAD})"
  fi
else
  skip "database shape" "PREPROD_DB_URL not set"
fi

echo
echo "RESULT: PASS=${OK} FAIL=${BAD} SKIPPED=${SKIPPED}"
[[ "$BAD" -eq 0 ]] || exit 1
