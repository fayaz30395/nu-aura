#!/bin/bash
# Logs each account in ONCE (cookie jar per label). Retries on 429 (auth bucket is shared per IP, 5/min) with jittered waits;
# a 429 does not count as a failed password attempt. Never retries on 401 (avoids lockout).
# env: JARS (dir for cookie jars), CREDS_ENV (file defining DEMO_PW / TEST_PW). Secrets are never echoed.
. "$CREDS_ENV"
login_one() { # label email pwvar [tenantId]
  local label=$1 email=$2 pwvar=$3 tid=$4 pw=${!3} n=0
  [ -s "$JARS/$label.jar" ] && grep -q access "$JARS/$label.jar" && { echo "$label: already logged in"; return 0; }
  local body; body=$(python3 -c "import json,sys;d={'email':sys.argv[1],'password':sys.argv[2]}
if sys.argv[3]: d['tenantId']=sys.argv[3]
print(json.dumps(d))" "$email" "$pw" "$tid")
  while [ $n -lt 60 ]; do
    code=$(curl -s -m 30 -c "$JARS/$label.jar" -o "$JARS/$label.body" -w '%{http_code}' -H 'Content-Type: application/json' -d "$body" http://localhost:8080/api/v1/auth/login)
    echo "$(date +%T) $label $email HTTP $code (attempt $((n+1)))"
    [ "$code" != "429" ] && return 0
    n=$((n+1)); python3 -c "import time,random;time.sleep(random.uniform(10,25))"
  done
  return 1
}
while read -r label email pwvar tid; do [ -z "$label" ] && continue; login_one "$label" "$email" "$pwvar" "$tid"; python3 -c "import time;time.sleep(12)"; done
