#!/bin/bash
# Applies ALL Flyway migrations (numeric order) to a throwaway DB with ${demoCredentialsEnabled}=false (prod/render value) to prove
# what a freshly provisioned prod DB contains. psql != Flyway (no per-file tx, no checksum); errors are counted, not hidden.
set -u
PSQL=/opt/homebrew/opt/postgresql@16/bin
DB=nuaura_test_secgate_scratch
MIG=/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend/src/main/resources/db/migration
FLAG=${1:-false}
$PSQL/dropdb -h localhost -U fayaz.m --if-exists $DB
$PSQL/createdb -h localhost -U fayaz.m $DB || exit 1
ERR=0; N=0
for f in $(ls $MIG | grep -E '^V[0-9]+__' | sort -t_ -k1.2 -n); do
  N=$((N+1))
  out=$(sed "s/\${demoCredentialsEnabled}/$FLAG/g" "$MIG/$f" | $PSQL/psql -h localhost -U fayaz.m -d $DB -X -q -v ON_ERROR_STOP=0 2>&1)
  e=$(echo "$out" | grep -c "ERROR:")
  if [ "$e" -gt 0 ]; then ERR=$((ERR+e)); echo "ERRORS($e) in $f: $(echo "$out" | grep -m1 'ERROR:' | cut -c1-140)"; fi
done
echo "applied files=$N total_error_lines=$ERR flag=$FLAG"
