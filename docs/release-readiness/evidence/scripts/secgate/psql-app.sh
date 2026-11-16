#!/bin/bash
# Runs read-only SQL as the app role (hrms_user). Creds sourced in a subshell, never printed.
set -a; . ~/.config/nu-aura/local-db.env; set +a
export PGPASSWORD="$SPRING_DATASOURCE_PASSWORD"
exec /opt/homebrew/opt/postgresql@16/bin/psql -h localhost -p 5432 -U "$SPRING_DATASOURCE_USERNAME" -d hrms_dev -X -A -F'|' "$@"
