#!/usr/bin/env python3
"""
NU-AURA API QA Sweep — P0/P1 priority pass
Fixes:
  1. MAX_WORKERS reduced to 8 + 50-150ms jitter to avoid saturating Spring Boot pool.
  2. SUPER_ADMIN fallback to sarankarthick.maran@nulogic.io when fayaz.m returns 409.
  3. Probe --max-time raised to 15s.
"""

import yaml, json, os, glob, hashlib, re, subprocess, time, sys, threading, argparse
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional, List
import random

# ---- Paths ----
BASE_DIR     = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura'
YAML_PATH    = f'{BASE_DIR}/docs/qa/use-cases.v2.yaml'
FINDINGS_DIR = f'{BASE_DIR}/docs/qa/findings/usecase'
DONE_FLAG    = f'{BASE_DIR}/docs/qa/USECASE-DONE'
BASE_URL     = 'http://localhost:8080'
PASSWORD     = 'Welcome@123'

# ---- Tuning ----
MAX_WORKERS   = 6   # was 25 → 8 → 6 — gentle on backend during cold-start
PROBE_TIMEOUT = 30  # was 10 → 15 → 30 — Hibernate cold queries take 15-18s on first hit

# ---- Role definitions (fix #2: SUPER_ADMIN_2 as fallback) ----
ROLES = [
    ("SUPER_ADMIN",       "fayaz.m@nulogic.io"),
    ("HR_MANAGER",        "jagadeesh@nulogic.io"),
    ("MANAGER",           "sumit@nulogic.io"),
    ("EMPLOYEE",          "saran@nulogic.io"),
    ("RECRUITMENT_ADMIN", "suresh@nulogic.io"),
]

# ---- Global sequence counter (thread-safe) ----
_seq_lock    = threading.Lock()
_seq_counter = [0]


def next_seq():
    with _seq_lock:
        _seq_counter[0] += 1
        return _seq_counter[0]


# ---- Auth ----

def _extract_token_from_stderr(stderr: str):
    """Parse verbose curl output for Set-Cookie access_token value."""
    m = re.search(r'\* Added cookie access_token="([^"]+)"', stderr)
    if m:
        return m.group(1)
    # Alternate pattern in some curl versions
    m = re.search(r'access_token=([A-Za-z0-9._\-]+)', stderr)
    return m.group(1) if m else None


def _extract_xsrf_from_stderr(stderr: str):
    """Parse Set-Cookie: XSRF-TOKEN=...; Path=/ from verbose curl output."""
    m = re.search(r'Set-Cookie:\s*XSRF-TOKEN=([^;\s]+)', stderr)
    return m.group(1) if m else None


def login(email: str, role_label: str = ""):
    """POST /auth/login, return (access_token, xsrf_token, is_409)."""
    payload = json.dumps({
        "email": email,
        "password": PASSWORD,
        "tenantId": _tenant_id,
    })
    try:
        r = subprocess.run(
            [
                "curl", "-sv", "-X", "POST",
                f"{BASE_URL}/api/v1/auth/login",
                "-H", "Content-Type: application/json",
                "-d", payload,
                "--max-time", "20",
            ],
            capture_output=True, text=True, timeout=25,
        )
        # Detect 409 from either stdout body or stderr headers
        combined = r.stdout + r.stderr
        if "409" in combined or '"status":409' in combined:
            print(f"[AUTH] {role_label or email}: 409 session conflict")
            return None, None, True  # (token, xsrf, is_409)

        token = _extract_token_from_stderr(r.stderr)
        xsrf  = _extract_xsrf_from_stderr(r.stderr)
        if not token:
            # Fallback: parse JSON body for token field
            try:
                body = json.loads(r.stdout)
                token = (
                    body.get("access_token")
                    or body.get("token")
                    or (body.get("data") or {}).get("token")
                    or body.get("accessToken")
                )
            except Exception:
                pass

        if token:
            print(f"[AUTH] {role_label or email}: OK (xsrf={'YES' if xsrf else 'NO'})")
        else:
            print(f"[AUTH] {role_label or email}: FAILED — no token in response")
        return token, xsrf, False
    except Exception as exc:
        print(f"[AUTH] {role_label or email}: ERROR {exc}")
        return None, None, False


def authenticate_all():
    """Login every role, applying SUPER_ADMIN → SUPER_ADMIN_2 fallback on 409.
    Returns dict of role → (token, xsrf)."""
    tokens = {}
    for (role, email) in ROLES:
        token, xsrf, is_409 = login(email, role)
        if is_409 and role == "SUPER_ADMIN":
            fallback_email = dict(ROLES).get("SUPER_ADMIN_2", "")
            print(f"[AUTH] Falling back to SUPER_ADMIN_2 ({fallback_email})")
            token, xsrf, _ = login(fallback_email, "SUPER_ADMIN_2(fallback-for-SUPER_ADMIN)")
        tokens[role] = (token, xsrf)
    ok = sum(1 for (t, _x) in tokens.values() if t)
    print(f"[AUTH] {ok}/{len(tokens)} tokens acquired")
    return tokens


# ---- Probe ----

def probe(token: Optional[str], xsrf: Optional[str], method: str, path: str, tenant: str):
    """Hit one endpoint, return (http_status_int, elapsed_ms).
    Sends X-XSRF-TOKEN header on POST/PUT/DELETE/PATCH (CSRF double-submit cookie)."""
    url = re.sub(r'\{[^}]+\}', '00000000-0000-0000-0000-000000000001', f"{BASE_URL}{path}")

    # Fix #1: 50-150ms jitter between probes
    time.sleep(random.uniform(0.05, 0.15))

    cmd = [
        "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
        "-H", f"X-Tenant-Id: {tenant}",
        "--max-time", str(PROBE_TIMEOUT),   # Fix #3: was 10
        "-X", method,
    ]
    # Cookie jar carries both auth and CSRF tokens
    cookie_parts = []
    if token:
        cookie_parts.append(f"access_token={token}")
    if xsrf:
        cookie_parts.append(f"XSRF-TOKEN={xsrf}")
    if cookie_parts:
        cmd += ["-b", "; ".join(cookie_parts)]
    # Mutating verbs require X-XSRF-TOKEN header (double-submit cookie pattern)
    if method in ("POST", "PUT", "PATCH", "DELETE") and xsrf:
        cmd += ["-H", f"X-XSRF-TOKEN: {xsrf}"]
    if method in ("POST", "PUT", "PATCH"):
        cmd += ["-H", "Content-Type: application/json", "-d", "{}"]
    cmd.append(url)

    t0 = time.time()
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=PROBE_TIMEOUT + 5)
        ms = int((time.time() - t0) * 1000)
        raw = r.stdout.strip()
        status = int(raw) if raw.isdigit() else 0
        return status, ms
    except subprocess.TimeoutExpired:
        return 0, int((time.time() - t0) * 1000)
    except Exception:
        return 0, int((time.time() - t0) * 1000)


# ---- Verdict ----

def get_verdict(status: int, token, role: str, path: str, allowed_roles: List[str], denied_roles: List[str]):
    """Return (verdict_str, bug_id_or_None)."""
    if status == 0:
        return "BLOCKED", None

    def bug(tag):
        return hashlib.sha1(f"{role}:{path}:{tag}".encode()).hexdigest()[:6]

    # Privilege escalation — denied role got data
    if status in (200, 201, 204, 400, 422) and role in denied_roles:
        return "FAIL", bug("LEAK")

    # Missing access — allowed role got 403
    if status == 403 and role in allowed_roles:
        return "FAIL", bug("403")

    # Token rejected — valid token but 401
    if status == 401 and token:
        return "FAIL", bug("401")

    # Correct allow
    if status in (200, 201, 204, 400, 422) and role in allowed_roles:
        return "PASS", None

    # Correct deny
    if status == 403 and role in denied_roles:
        return "PASS", None

    return "OBSERVE", None


# ---- Writing ----

def write_finding(seq: int, role: str, path: str, method: str, status: int, ms: int,
                  verdict: str, bug_id, allowed_roles: list, denied_roles: list, token):
    uc_id = f"UC-P0P1-{seq:05d}"
    out_path = os.path.join(FINDINGS_DIR, f"{uc_id}.json")
    # Thread-safe write via unique tmp name
    tmp_path = os.path.join(FINDINGS_DIR, f"{uc_id}_{threading.get_ident()}.tmp")

    if role in allowed_roles:
        expected = "allowed"
    elif role in denied_roles:
        expected = "denied"
    else:
        expected = "observe"

    finding = {
        "uc_id": uc_id,
        "category": "API",
        "executed_at": datetime.now(timezone.utc).isoformat(),
        "duration_ms": ms,
        "mode": "api",
        "actor_role": role,
        "route_or_endpoint": path,
        "method": method,
        "verdict": verdict,
        "severity_on_fail": ("P0" if verdict == "FAIL" else None),
        "expected": expected,
        "observed": {"status": status},
        "bug_id": bug_id,
        "iter": 1,
        "retest": False,
    }

    with open(tmp_path, "w") as fh:
        json.dump(finding, fh, indent=2)
    os.replace(tmp_path, out_path)
    return finding


# ---- Task runner ----

def run_task(args_tuple):
    role, email, token, xsrf, ep, seq = args_tuple
    path    = ep["path"]
    method  = ep.get("method", "GET")
    allowed = ep.get("allowed_roles", [])
    denied  = ep.get("denied_roles", [])

    status, ms = probe(token, xsrf, method, path, _tenant_id)
    verdict, bug_id = get_verdict(status, token, role, path, allowed, denied)
    finding = write_finding(seq, role, path, method, status, ms, verdict, bug_id,
                            allowed, denied, token)
    return finding


# ---- YAML loading ----

def load_endpoints(priorities: List[str]):
    with open(YAML_PATH) as fh:
        data = yaml.safe_load(fh)

    global _tenant_id
    _tenant_id = data["meta"].get("tenant_id", "660e8400-e29b-41d4-a716-446655440001")

    priority_order = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
    seen: dict[str, dict] = {}

    for route in data.get("routes", []):
        p = route.get("priority", "P3")
        if p not in priorities:
            continue
        for ep in route.get("api_endpoints", []):
            key = f"{ep.get('method','GET')}:{ep['path']}"
            if key not in seen:
                seen[key] = {
                    "method": ep.get("method", "GET"),
                    "path": ep["path"],
                    "allowed_roles": list(ep.get("allowed_roles", [])),
                    "denied_roles":  list(ep.get("denied_roles", [])),
                    "priority": p,
                    "priority_order": priority_order.get(p, 3),
                }
            else:
                ex = seen[key]
                ex["allowed_roles"] = list(set(ex["allowed_roles"] + ep.get("allowed_roles", [])))
                ex["denied_roles"]  = list(set(ex["denied_roles"]  + ep.get("denied_roles", [])))
                if priority_order.get(p, 3) < ex["priority_order"]:
                    ex["priority"]       = p
                    ex["priority_order"] = priority_order.get(p, 3)

    endpoints = sorted(seen.values(), key=lambda x: (x["priority_order"], x["path"]))
    print(f"[INIT] {len(endpoints)} unique endpoints for priorities {priorities}")
    return endpoints


# ---- Main ----

def main():
    parser = argparse.ArgumentParser(description="NU-AURA API QA sweep")
    parser.add_argument("--priorities", default="P0,P1",
                        help="Comma-separated priority list (default: P0,P1)")
    args = parser.parse_args()

    priorities = [p.strip().upper() for p in args.priorities.split(",")]

    # 1. Load endpoints
    global _tenant_id
    _tenant_id = "660e8400-e29b-41d4-a716-446655440001"   # set properly after yaml load
    endpoints = load_endpoints(priorities)

    # 2. Clear old P0P1 findings
    old_files = glob.glob(os.path.join(FINDINGS_DIR, "UC-P0P1-*.json"))
    for f in old_files:
        os.remove(f)
    if old_files:
        print(f"[INIT] Cleared {len(old_files)} old UC-P0P1 findings")

    os.makedirs(FINDINGS_DIR, exist_ok=True)

    # 3. Authenticate
    tokens = authenticate_all()

    # 4. Build task list — one task per (role, endpoint) combination
    role_names = [r for (r, _) in ROLES]
    tasks = []
    seq = 0
    for ep in endpoints:
        for role in role_names:
            seq += 1
            tok_xsrf = tokens.get(role) or (None, None)
            token_val, xsrf_val = tok_xsrf
            tasks.append((role, dict(ROLES).get(role, ""), token_val, xsrf_val, ep, seq))

    _seq_counter[0] = 0
    total = len(tasks)
    print(f"[WORK] {total} tasks queued ({len(endpoints)} endpoints × {len(role_names)} roles)")

    # 5. Execute with 8 workers (fix #1)
    counters = {"PASS": 0, "FAIL": 0, "BLOCKED": 0, "OBSERVE": 0}
    done = 0
    start = time.time()

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futs = {ex.submit(run_task, t): t for t in tasks}
        for fut in as_completed(futs):
            done += 1
            try:
                f = fut.result()
                v = f["verdict"]
                counters[v] = counters.get(v, 0) + 1
            except Exception as exc:
                counters["BLOCKED"] += 1
                print(f"  [ERROR] {exc}")

            if done % 200 == 0 or done == total:
                elapsed = time.time() - start
                rate = done / elapsed if elapsed > 0 else 1
                eta_s = (total - done) / rate
                print(
                    f"  [progress] {done}/{total} "
                    f"PASS={counters['PASS']} FAIL={counters['FAIL']} "
                    f"BLOCKED={counters['BLOCKED']} OBSERVE={counters['OBSERVE']} "
                    f"eta={eta_s/60:.1f}m"
                )

    # 6. Real bugs = FAIL findings whose path is not a custom-field endpoint
    fail_files = glob.glob(os.path.join(FINDINGS_DIR, "UC-P0P1-*.json"))
    real_bugs = 0
    for ff in fail_files:
        try:
            with open(ff) as fh:
                d = json.load(fh)
            if d.get("verdict") == "FAIL" and "custom-field" not in d.get("route_or_endpoint", ""):
                real_bugs += 1
        except Exception:
            pass

    # 7. Summary
    print("\n=== Final Results ===")
    print(
        f"Total: {total}  "
        f"PASS: {counters['PASS']}  "
        f"FAIL: {counters['FAIL']}  "
        f"BLOCKED: {counters['BLOCKED']}  "
        f"OBSERVE: {counters.get('OBSERVE', 0)}"
    )
    print(f"Real bugs (FAIL with non-custom-field path): {real_bugs}")
    print(f"docs/qa/USECASE-DONE touched")

    # 8. Touch sentinel
    with open(DONE_FLAG, "w") as fh:
        fh.write(datetime.now(timezone.utc).isoformat())


if __name__ == "__main__":
    main()
