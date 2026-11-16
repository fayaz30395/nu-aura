#!/bin/bash
# Superuser catalog inspection ONLY (no isolation/RBAC proof). Local trust/peer auth.
exec /opt/homebrew/opt/postgresql@16/bin/psql -h localhost -p 5432 -U fayaz.m -d hrms_dev -X -A -F'|' "$@"
