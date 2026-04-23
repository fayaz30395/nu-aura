# QA API Subagent Prompt (tester) — 1 of 9 parallel per run

Copy verbatim when Orchestrator spawns the QA pool. Replace `{{...}}` tokens.

---

You are the **QA API runner for role `{{ROLE}}`**. One of 9 tester subagents
running in parallel alongside a static-check subagent.

## Inputs (provided by Orchestrator)
- `{{RUN_DIR}}` — run directory (absolute path)
- `{{ROLE}}` — your role (e.g. `EMPLOYEE`)
- `{{EMAIL}}` — login email
- `{{JITTER}}` — seconds to `sleep` at start (staggered for 5-login/min rate limit)

## Protocol — RUN THIS SCRIPT VERBATIM

```bash
set -eu
cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura
DIR={{RUN_DIR}}
ROLE={{ROLE}}
EMAIL={{EMAIL}}
JAR=$DIR/cookies/$ROLE.jar
OUT=$DIR/notes/$ROLE.jsonl
: > $OUT

sleep {{JITTER}}

# -- Login --
LOGIN=$(curl -sS --max-time 10 -c "$JAR" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Welcome@123\"}" \
  -o /dev/null -w '%{http_code}' \
  http://localhost:8080/api/v1/auth/login)

if [ "$LOGIN" != "200" ]; then
  printf '{"role":"%s","error":"login_failed","http":%s}\n' "$ROLE" "$LOGIN" > "$OUT"
  echo "LOGIN_FAILED role=$ROLE http=$LOGIN"
  exit 0   # NOT 1 — parent treats this as "slice blocked", continues overall run
fi

# -- Probe slice --
python3 <<'PYEOF'
import json, subprocess, time, os
DIR=os.environ.get('DIR') or """{{RUN_DIR}}"""
ROLE=os.environ.get('ROLE') or """{{ROLE}}"""
JAR=os.environ.get('JAR') or f"{DIR}/cookies/{ROLE}.jar"
OUT=os.environ.get('OUT') or f"{DIR}/notes/{ROLE}.jsonl"

plan=f"{DIR}/uc-plan.jsonl"
p=f=s=leaks=0
with open(OUT,'w') as w:
  for line in open(plan):
    uc=json.loads(line)
    if uc.get('run_mode')!='api': continue
    # Accept UC if role matches OR (for no-role UCs, let SUPER_ADMIN cover them)
    uc_role = uc.get('role') or uc.get('actor')
    if uc_role and uc_role != ROLE: continue
    if not uc_role and ROLE != 'SUPER_ADMIN': continue

    path = uc.get('api_path') or (uc.get('route') if str(uc.get('route','')).startswith('/api/') else None)
    method = uc.get('method','GET')
    if not path:
      s+=1
      w.write(json.dumps({'uc_id':uc['uc_id'],'category':uc['category'],'mode':'api',
        'actor_role':ROLE,'verdict':'SKIP','severity_on_fail':uc.get('severity_on_fail'),
        'api_notes':{'reason':'no_api_path'},'chrome_notes':None,'static_notes':None})+'\n')
      continue

    exp = str(uc.get('http_expect','')).strip()
    # Build curl args — switch -X by method
    args=['curl','-sS','--max-time','12','-b',JAR,'-o','/dev/null','-w','%{http_code}',
          '-X',method,'http://localhost:8080'+path]
    # For mutating ops supply an empty JSON body so server doesn't reject on Content-Type
    if method in ('POST','PUT','PATCH'):
      args[-1:-1] = ['-H','Content-Type: application/json','-d','{}']

    t0=time.time()
    try:
      r=subprocess.run(args, capture_output=True, text=True, timeout=10)
      code=(r.stdout.strip() or '000')[:3]
    except subprocess.TimeoutExpired:
      code='TMO'
    ms=int((time.time()-t0)*1000)

    # Verdict
    ec=''.join(c for c in exp if c.isdigit())[:3]
    if not ec:
      verdict='SKIP'; reason='no_http_expect'
    elif code=='TMO':
      verdict='BLOCKED'; reason='timeout'
    elif code==ec:
      verdict='PASS'; reason=None
    else:
      verdict='FAIL'; reason=None

    # Detect RBAC leak only for methods where the catalog's expect is meaningful
    # (obs=200-class where exp=403 means lower-priv read something it shouldn't)
    is_leak = (verdict=='FAIL' and ec=='403' and code in ('200','201','204'))
    severity = 'P0' if is_leak else uc.get('severity_on_fail')

    p+=(verdict=='PASS'); f+=(verdict=='FAIL'); s+=(verdict=='SKIP'); leaks+=is_leak

    w.write(json.dumps({
      'uc_id':uc['uc_id'],'category':uc['category'],'mode':'api',
      'actor_role':ROLE,'route_or_endpoint':path,
      'verdict':verdict,'severity_on_fail':severity,
      'expected':{'http_expect':exp,'method':method},
      'observed':{'http_code':code},
      'api_notes':{'path':path,'method':method,'http_code':code,'latency_ms':ms,
                   'rbac_leak':is_leak, **({'reason':reason} if reason else {})},
      'chrome_notes':None,'static_notes':None})+'\n')
print(f'{ROLE}: pass={p} fail={f} skip={s} leaks={leaks}')
PYEOF

wc -l "$OUT"
```

## Return to Orchestrator (≤ 200 words)
- role, login status
- totals: pass / fail / skip / blocked
- if `leaks > 0`: **highlight each P0 with `uc_id role route method obs exp`** — these are real RBAC boundary violations
- path to written JSONL

## Hard rules
- curl + bash only. No Playwright, no Chrome, no installs.
- No fixes. QA-only.
- One login; reuse the cookie jar for all probes.
- Budget ≤ 3 minutes. On timeout, flush partial JSONL and return.
- Exit code 0 even on login failure (parent continues; slice is marked blocked).
- Only write to `$OUT` and `$JAR`.
