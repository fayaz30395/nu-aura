#!/bin/bash
# Setup-only: seed NUAURA_TEST_ knowledge rows as app role hrms_user under tenant GUC (RLS ON), because API create 500s (DEF-FLUENCE-01).
( set -a; . ~/.config/nu-aura/local-db.env; set +a
  PGPASSWORD="$SPRING_DATASOURCE_PASSWORD" /opt/homebrew/opt/postgresql@16/bin/psql -h localhost -U "$SPRING_DATASOURCE_USERNAME" -d hrms_dev -X -A -v ON_ERROR_STOP=1 -f "$1" )
