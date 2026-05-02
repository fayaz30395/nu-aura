#!/usr/bin/env python3
"""
NU-AURA API QA Sweep Runner
Resumes from existing findings, probes remaining (role, endpoint) combos.
"""

import yaml, json, os, glob, hashlib, subprocess, time, sys, threading
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# ---- Config ----
YAML_PATH    = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/qa/use-cases.v2.yaml'
FINDINGS_DIR = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/qa/findings/usecase'
QUEUE_FILE   = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/qa/queue/retest'
DONE_FLAG    = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/qa/USECASE-DONE'
BASE_URL     = 'http://localhost:8080'
TENANT_ID    = '00000000-0000-0000-0000-000000000001'
PASSWORD     = 'Welcome@123'
BATCH_SIZE   = 50
MAX_WORKERS  = 10
TIMEOUT      = 15

os.makedirs(FINDINGS_DIR, exist_ok=True)

# ---- Global sequence counter ----
_seq_lock = threading.Lock()
_seq_counter = [0]  # will be set after loading existing

def next_seq():
    with _seq_lock:
        _seq_counter[0] += 1
        return _seq_counter[0]

# ---- Load YAML ----
with open(YAML_PATH) as f:
    data = yaml.safe_load(f)

roles_meta = {r['code']: r['email'] for r in data['meta']['roles']}
ROLES = list(roles_meta.keys())

priority_order = {'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3}

# Build unique endpoint list (deduplicate by path, merge allowed/denied)
seen_eps = {}
for route in data['routes']:
    priority = route.get('priority', 'P3')
    for ep in route.get('api_endpoints', []):
        path = ep['path']
        if path not in seen_eps:
            seen_eps[path] = {
                'method': ep.get('method', 'GET'),
                'path': path,
                'allowed_roles': list(ep.get('allowed_roles', [])),
                'denied_roles': list(ep.get('denied_roles', [])),
                'priority': priority,
                'priority_order': priority_order.get(priority, 3)
            }
        else:
            ex = seen_eps[path]
            ex['allowed_roles'] = list(set(ex['allowed_roles'] + ep.get('allowed_roles', [])))
            ex['denied_roles'] = list(set(ex['denied_roles'] + ep.get('denied_roles', [])))
            if priority_order.get(priority, 3) < ex['priority_order']:
                ex['priority'] = priority
                ex['priority_order'] = priority_order.get(priority, 3)

ENDPOINTS = sorted(seen_eps.values(), key=lambda x: (x['priority_order'], x['path']))
print(f"[INIT] Loaded {len(ENDPOINTS)} unique endpoints")

# ---- Load already tested ----
existing_files = sorted(glob.glob(os.path.join(FINDINGS_DIR, 'UC-API-*.json')))
tested = set()
max_seq = 0
for fp in existing_files:
    try:
        with open(fp) as fh:
            d = json.load(fh)
        tested.add((d.get('actor_role',''), d.get('route_or_endpoint','')))
        # extract seq from filename
        base = os.path.basename(fp)
        try:
            seq = int(base.replace('UC-API-','').replace('.json',''))
            if seq > max_seq:
                max_seq = seq
        except:
            pass
    except:
        pass

_seq_counter[0] = max_seq
print(f"[INIT] Resuming from seq {max_seq}, {len(tested)} combos already tested")

# ---- Authenticate each role ----
tokens = {}

def authenticate(role_code, email):
    payload = json.dumps({
        "email": email,
        "password": PASSWORD,
        "tenantId": TENANT_ID
    })
    try:
        result = subprocess.run([
            'curl', '-s', '-c', f'/tmp/cookies_{role_code}.txt',
            '-w', '\n__STATUS__%{http_code}',
            '-X', 'POST',
            '-H', 'Content-Type: application/json',
            '-d', payload,
            '--max-time', '20',
            f'{BASE_URL}/api/v1/auth/login'
        ], capture_output=True, text=True, timeout=25)
        out = result.stdout
        # split body and status
        if '\n__STATUS__' in out:
            body_text, status_str = out.rsplit('\n__STATUS__', 1)
        else:
            body_text = out
            status_str = '0'
        status = int(status_str.strip()) if status_str.strip().isdigit() else 0

        # Try to parse token from body
        token = None
        try:
            body = json.loads(body_text)
            token = (body.get('token') or
                     (body.get('data') or {}).get('token') or
                     body.get('accessToken'))
        except:
            pass

        # Try cookie
        if not token:
            cookie_file = f'/tmp/cookies_{role_code}.txt'
            if os.path.exists(cookie_file):
                with open(cookie_file) as cf:
                    for line in cf:
                        if 'nu_aura_token' in line:
                            parts = line.strip().split('\t')
                            if len(parts) >= 7:
                                token = parts[-1]
                            break

        if token and status in (200, 201):
            print(f"[AUTH] {role_code}: OK")
            return token
        else:
            print(f"[AUTH] {role_code}: FAILED (status={status})")
            return None
    except Exception as e:
        print(f"[AUTH] {role_code}: ERROR {e}")
        return None

print("[AUTH] Authenticating all roles...")
for code, email in roles_meta.items():
    tokens[code] = authenticate(code, email)

print(f"[AUTH] Tokens obtained: {sum(1 for t in tokens.values() if t)}/{len(tokens)}")

# ---- Probe a single endpoint for a single role ----
def probe(role_code, ep, iter_num=1, retest=False):
    path = ep['path']
    # Replace path params with dummy values
    safe_path = path
    import re
    safe_path = re.sub(r'\{[^}]+\}', '00000000-0000-0000-0000-000000000001', safe_path)
    # For numeric-looking params use 1
    safe_path = re.sub(r'\{[^}]+Id\}', '1', safe_path) if '{' in safe_path else safe_path
    # Final fallback
    safe_path = re.sub(r'\{[^}]+\}', '1', safe_path)

    url = f"{BASE_URL}{safe_path}"
    method = ep.get('method', 'GET')
    allowed = ep.get('allowed_roles', [])
    denied  = ep.get('denied_roles', [])
    token   = tokens.get(role_code)

    seq = next_seq()
    uc_id = f"UC-API-{seq:05d}"
    out_path = os.path.join(FINDINGS_DIR, f"{uc_id}.json")
    tmp_path  = out_path + '.tmp'

    # Determine expected
    if role_code in allowed:
        expected = 'allowed'
    elif role_code in denied:
        expected = 'denied'
    else:
        expected = 'observe'

    # Build curl command
    curl_cmd = [
        'curl', '-s',
        '-o', '/tmp/uc-body.json',
        '-w', '%{http_code}',
        '--max-time', str(TIMEOUT),
        '-X', method,
        '-H', f'X-Tenant-Id: {TENANT_ID}',
        '-H', 'Content-Type: application/json',
    ]
    if token:
        curl_cmd += ['-H', f'Authorization: Bearer {token}']
    if method in ('POST', 'PUT', 'PATCH'):
        curl_cmd += ['-d', '{}']
    curl_cmd.append(url)

    t0 = time.time()
    verdict = 'OBSERVE'
    severity = None
    reason = None
    bug_id = None
    status = 0
    body_preview = {}

    try:
        result = subprocess.run(curl_cmd, capture_output=True, text=True, timeout=TIMEOUT + 5)
        raw_status = result.stdout.strip()
        status = int(raw_status) if raw_status.isdigit() else 0
        rc = result.returncode

        # Read body snippet
        try:
            if os.path.exists('/tmp/uc-body.json'):
                with open('/tmp/uc-body.json') as bf:
                    body_txt = bf.read(200)
                body_preview = {'snippet': body_txt[:100]}
        except:
            pass

        duration_ms = int((time.time() - t0) * 1000)

        # Verdict logic
        if rc != 0 or status == 0:
            verdict = 'BLOCKED'
            reason = f"curl exit={rc}"
            severity = 'P2'
        elif status in (502, 503):
            # Retry once
            time.sleep(5)
            result2 = subprocess.run(curl_cmd, capture_output=True, text=True, timeout=TIMEOUT + 5)
            raw2 = result2.stdout.strip()
            status2 = int(raw2) if raw2.isdigit() else 0
            if status2 in (502, 503) or result2.returncode != 0:
                verdict = 'BLOCKED'
                reason = f"backend {status} on retry"
                severity = 'P2'
                status = status2
            else:
                status = status2
                # re-evaluate below

        if verdict != 'BLOCKED':
            if status == 401 and token:
                verdict = 'FAIL'
                severity = 'P0'
                reason = "got 401 but role has valid token"
                bug_id = hashlib.sha1(f"{role_code}:{path}:401-with-token".encode()).hexdigest()[:6]
            elif status == 403 and expected == 'allowed':
                verdict = 'FAIL'
                severity = 'P1'
                reason = f"role {role_code} is allowed but got 403"
                bug_id = hashlib.sha1(f"{role_code}:{path}:403-allowed".encode()).hexdigest()[:6]
            elif status in (200, 201, 204) and expected == 'denied':
                verdict = 'FAIL'
                severity = 'P0'
                reason = f"role {role_code} is denied but got {status} (data leak!)"
                bug_id = hashlib.sha1(f"{role_code}:{path}:data-leak".encode()).hexdigest()[:6]
            elif status == 403 and expected == 'denied':
                verdict = 'PASS'
                reason = f"role {role_code} correctly denied"
            elif status in (200, 201, 204, 400, 422, 404, 409) and expected == 'allowed':
                verdict = 'PASS'
                reason = f"role {role_code} allowed, got {status}"
            elif status == 401 and not token:
                verdict = 'PASS'
                reason = "expected — role has no token"
            elif status == 401 and expected == 'denied':
                verdict = 'PASS'
                reason = "role denied (401 = no auth)"
            elif status in (200, 201, 204, 400, 422, 404, 409) and expected == 'observe':
                verdict = 'OBSERVE'
                reason = f"observed {status}"
            elif status == 401 and expected == 'observe':
                verdict = 'PASS'
                reason = f"observed {status}"
            elif status == 403 and expected == 'observe':
                verdict = 'OBSERVE'
                reason = f"observed {status} (no RBAC data)"
            else:
                verdict = 'OBSERVE'
                reason = f"status={status}, expected={expected}"

    except subprocess.TimeoutExpired:
        duration_ms = int((time.time() - t0) * 1000)
        verdict = 'BLOCKED'
        reason = "timed out"
        severity = 'P2'
        status = -1
    except Exception as e:
        duration_ms = int((time.time() - t0) * 1000)
        verdict = 'BLOCKED'
        reason = str(e)[:80]
        status = -1

    finding = {
        "uc_id": uc_id,
        "category": "API",
        "executed_at": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        "duration_ms": duration_ms,
        "mode": "api",
        "actor_role": role_code,
        "route_or_endpoint": path,
        "verdict": verdict,
        "severity_on_fail": severity if verdict == 'FAIL' else None,
        "expected": expected,
        "observed": {"status": status},
        "reason": reason,
        "bug_id": bug_id,
        "iter": iter_num,
        "retest": retest
    }

    with open(tmp_path, 'w') as f:
        json.dump(finding, f, indent=2)
    os.replace(tmp_path, out_path)

    return finding

# ---- Load retest queue ----
def load_retest():
    try:
        with open(QUEUE_FILE) as f:
            return [s.strip() for s in f if s.strip()]
    except:
        return []

def clear_retest(consumed):
    try:
        with open(QUEUE_FILE) as f:
            current = [s.strip() for s in f if s.strip()]
        remaining = [s for s in current if s not in consumed]
        with open(QUEUE_FILE, 'w') as f:
            f.write('\n'.join(remaining) + '\n' if remaining else '')
    except:
        pass

def drain_retest(retests, all_eps_by_path):
    if not retests:
        return
    print(f"[RETEST] Draining {len(retests)} slugs...")
    consumed = []
    tasks = []
    for slug in retests:
        for path, ep in all_eps_by_path.items():
            if slug in path:
                for role in ROLES:
                    tasks.append((role, ep))
        consumed.append(slug)

    if tasks:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
            futs = {ex.submit(probe, role, ep, 2, True): (role, ep) for role, ep in tasks}
            for fut in as_completed(futs):
                try:
                    f = fut.result()
                    print(f"  [RETEST] {f['uc_id']} {f['actor_role']} {f['route_or_endpoint'][:50]} -> {f['verdict']}")
                except Exception as e:
                    print(f"  [RETEST ERROR] {e}")

    clear_retest(consumed)

# ---- Build remaining work list ----
all_eps_by_path = {ep['path']: ep for ep in ENDPOINTS}

remaining = []
for ep in ENDPOINTS:
    for role in ROLES:
        if (role, ep['path']) not in tested:
            remaining.append((role, ep))

print(f"[WORK] {len(remaining)} combos to probe")

# ---- Main loop ----
batch_count = 0
done_count  = 0
fail_count  = 0
blocked_count = 0
start_time  = time.time()

for i in range(0, len(remaining), BATCH_SIZE):
    # Drain retest queue before each batch
    retests = load_retest()
    if retests:
        drain_retest(retests, all_eps_by_path)

    batch = remaining[i:i + BATCH_SIZE]
    batch_count += 1

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futs = {ex.submit(probe, role, ep): (role, ep) for role, ep in batch}
        for fut in as_completed(futs):
            try:
                f = fut.result()
                done_count += 1
                if f['verdict'] == 'FAIL':
                    fail_count += 1
                elif f['verdict'] == 'BLOCKED':
                    blocked_count += 1
                elapsed = time.time() - start_time
                rate = done_count / elapsed if elapsed > 0 else 0
                left = len(remaining) - (i + BATCH_SIZE)
                eta = left / rate if rate > 0 else 0
                print(f"  [{done_count}/{len(remaining)}] {f['uc_id']} {f['actor_role']:<20} {f['route_or_endpoint'][:45]:<45} -> {f['verdict']} (eta={eta/60:.1f}m)")
            except Exception as e:
                print(f"  [BATCH ERROR] {e}")

    print(f"[BATCH {batch_count}] Completed. Total: {done_count}/{len(remaining)}, FAIL={fail_count}, BLOCKED={blocked_count}")

# Final retest drain
retests = load_retest()
if retests:
    drain_retest(retests, all_eps_by_path)

# Mark done
Path(DONE_FLAG).touch()
print(f"\n[DONE] All {done_count} combos probed. FAIL={fail_count} BLOCKED={blocked_count}")
print(f"[DONE] Total time: {(time.time()-start_time)/60:.1f} minutes")
print(f"[DONE] Touched {DONE_FLAG}")
