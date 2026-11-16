#!/bin/bash
# Read-only SQL as app role hrms_user under tenant GUC (RLS stays ON). Usage: TENANT=<uuid> db.sh "<sql>"
# Default tenant = NuLogic. Credentials sourced in a subshell, never printed.
( set -a; . ~/.config/nu-aura/local-db.env; set +a
  PGPASSWORD="$SPRING_DATASOURCE_PASSWORD" /opt/homebrew/opt/postgresql@16/bin/psql -h localhost -p 5432 -U "$SPRING_DATASOURCE_USERNAME" -d hrms_dev -X -A -F '|' -P footer=off -q \
    -c "begin read only" -c "set local app.current_tenant_id='${TENANT:-660e8400-e29b-41d4-a716-446655440001}'" -c "$1" -c "rollback" )
