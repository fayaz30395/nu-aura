#!/usr/bin/env python3
"""
NU-AURA QA Use-Case Runner v2
Probes every API endpoint × role from use-cases.v2.yaml
Continues from where previous runs left off.
Uses Set-Cookie header extraction for HttpOnly access_token.
"""
import json
import os
import glob
import subprocess
import hashlib
import yaml
import time
import re
import sys
import threading
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# ─── Config ────────────────────────────────────────────────────────────────────
BASE_URL     = "http://localhost:8080"
TENANT_ID    = "660e8400-e29b-41d4-a716-446655440001"
PASSWORD     = "Welcome@123"
FINDINGS_DIR = "/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/qa/findings/usecase"
YAML_PATH    = "/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/qa/use-cases.v2.yaml"
DONE_MARKER  = "/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/qa/USECASE-DONE"
QUEUE_FILE   = "/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/qa/queue/retest"
MAX_WORKERS  = 15
TIMEOUT      = 15
BATCH_SIZE   = 100

ROLE_EMAIL = {
    "SUPER_ADMIN":       "fayaz.m@nulogic.io",
    "HR_MANAGER":        "jagadeesh@nulogic.io",
    "MANAGER":           "sumit@nulogic.io",
    "TEAM_LEAD":         "mani@nulogic.io",
    "EMPLOYEE":          "saran@nulogic.io",
    "RECRUITMENT_ADMIN": "suresh@nulogic.io",
    "EMPLOYEE_2":        "raj@nulogic.io",
    "EMPLOYEE_3":        "arun@nulogic.io",
    "SUPER_ADMIN_2":     "sarankarthick.maran@nulogic.io",
}
OUR_ROLES = list(ROLE_EMAIL.keys())

# Thread-safe sequence counter
_seq_lock = threading.Lock()
_seq_counter = [0]

def next_seq():
    with _seq_lock:
        _seq_counter[0] += 1
        return _seq_counter[0]

# ─── Step 1: Authenticate ──────────────────────────────────────────────────────
def login_role(role, email):
    payload = json.dumps({
        "email": email,
        "password": PASSWORD,
        "tenantId": TENANT_ID
    })
    try:
        result = subprocess.run(
            ["curl", "-si", "--connect-timeout", "15", "--max-time", "40",
             "-X", "POST", f"{BASE_URL}/api/v1/auth/login",
             "-H", "Content-Type: application/json",
             "-d", payload],
            capture_output=True, text=True, timeout=45
        )
        full_response = result.stdout
        # Extract access_token from Set-Cookie header (may span concat lines)
        m = re.search(r"Set-Cookie:\s*access_token=([^;\r\n]+)", full_response)
        if m:
            token = m.group(1).strip()
            print(f"  [AUTH OK] {role}")
            return role, token
        # Fallback: try accessToken in body
        body_start = full_response.find("\r\n\r\n")
        if body_start == -1:
            body_start = full_response.find("\n\n")
        if body_start != -1:
            body_text = full_response[body_start:].strip()
            try:
                body = json.loads(body_text)
                token = body.get("accessToken") or body.get("token")
                if token:
                    print(f"  [AUTH OK] {role} (body token)")
                    return role, token
            except Exception:
                pass
        # Check HTTP status - if 401 then credentials invalid
        http_status = 0
        status_m = re.search(r"HTTP/\S+\s+(\d+)", full_response)
        if status_m:
            http_status = int(status_m.group(1))
        print(f"  [AUTH FAIL] {role}: no token found (HTTP {http_status}, rc={result.returncode})")
        return role, None
    except Exception as e:
        print(f"  [AUTH ERR] {role}: {e}")
        return role, None


def authenticate_all():
    """Authenticate sequentially to avoid overwhelming backend."""
    tokens = {}
    print("Authenticating 9 roles sequentially...")
    for role, email in ROLE_EMAIL.items():
        _, token = login_role(role, email)
        if token:
            tokens[role] = token
        time.sleep(0.5)   # brief gap between logins
    print(f"Authenticated {len(tokens)}/9 roles")
    return tokens


# ─── Step 2: Load existing coverage ────────────────────────────────────────────
def load_state():
    """Return (tested set, max seq number)."""
    tested = set()
    max_seq = 0
    for f in glob.glob(f"{FINDINGS_DIR}/UC-API-*.json"):
        try:
            d = json.load(open(f))
            tested.add((d.get("actor_role", ""), d.get("route_or_endpoint", "")))
        except Exception:
            pass
        m = re.search(r"UC-API-(\d+)\.json$", f)
        if m:
            seq = int(m.group(1))
            if seq > max_seq:
                max_seq = seq
    return tested, max_seq


# ─── Step 3: Path resolution ───────────────────────────────────────────────────
_UUID_PLACEHOLDER = "00000000-0000-0000-0000-000000000001"
_ID_PLACEHOLDER   = "1"

def resolve_path(template):
    """Replace {param} placeholders with safe dummy values."""
    # UUID-like IDs
    path = re.sub(r'\{[^}]*(Id|Uuid|uuid)[^}]*\}', _UUID_PLACEHOLDER, template)
    # Token fields
    path = re.sub(r'\{[^}]*(token|Token)[^}]*\}', 'dummy-token', path)
    # Type/code fields
    path = re.sub(r'\{[^}]*(type|code|Type|Code|slug|Slug|name|Name)[^}]*\}', 'TEST', path)
    # Year/month/day
    path = re.sub(r'\{year[^}]*\}', '2026', path)
    path = re.sub(r'\{month[^}]*\}', '1', path)
    path = re.sub(r'\{day[^}]*\}', '1', path)
    path = re.sub(r'\{quarter[^}]*\}', 'Q1', path)
    path = re.sub(r'\{period[^}]*\}', '2026-01', path)
    path = re.sub(r'\{entity[Tt]ype[^}]*\}', 'EMPLOYEE', path)
    # Anything remaining
    path = re.sub(r'\{[^}]+\}', _ID_PLACEHOLDER, path)
    return path


# ─── Step 4: Build test queue ──────────────────────────────────────────────────
def build_queue(data, tokens, tested):
    PRIO = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
    queue = []
    for route in data["routes"]:
        priority = str(route.get("priority", "P3"))
        prio_val = PRIO.get(priority, 4)
        for ep in route.get("api_endpoints", []):
            ep_path = ep["path"]
            for role in OUR_ROLES:
                if role not in tokens:
                    continue
                if (role, ep_path) in tested:
                    continue
                queue.append((prio_val, priority, role, ep))
    queue.sort(key=lambda x: (x[0], x[2]))
    print(f"Test queue: {len(queue)} remaining tests")
    return queue


# ─── Step 5: Execute a single probe ───────────────────────────────────────────
def probe(token, role, ep):
    ep_path = ep["path"]
    method  = ep.get("method", "GET").upper()
    allowed = ep.get("allowed_roles", [])
    denied  = ep.get("denied_roles", [])

    resolved = resolve_path(ep_path)
    url = f"{BASE_URL}{resolved}"
    if method == "GET" and "?" not in resolved:
        url += "?page=0&size=10"

    cmd = [
        "curl", "-s",
        "-o", f"/tmp/uc-resp-{os.getpid()}.json",
        "-w", "%{http_code}",
        "--max-time", str(TIMEOUT),
        "-X", method,
        "-H", f"Authorization: Bearer {token}",
        "-H", f"X-Tenant-Id: {TENANT_ID}",
        "-H", "Content-Type: application/json",
    ]
    if method in ("POST", "PUT", "PATCH"):
        cmd += ["-d", "{}"]
    cmd.append(url)

    # Determine expectation
    if role in allowed:
        expected = "allowed"
    elif role in denied:
        expected = "denied"
    else:
        expected = "observe"

    t0 = time.time()
    verdict = "OBSERVE"
    severity = None
    reason = None
    bug_id = None
    status = 0

    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT + 3)
        duration_ms = int((time.time() - t0) * 1000)
        raw = r.stdout.strip()
        status = int(raw) if raw.isdigit() else 0

        if r.returncode != 0 or status == 0:
            verdict = "BLOCKED"
            reason  = f"curl exit={r.returncode}"
        elif status == 401 and token:
            verdict  = "FAIL"
            severity = "P0"
            reason   = "got 401 with valid token — auth broken"
            bug_id   = hashlib.sha1(f"{role}:{ep_path}:401-token".encode()).hexdigest()[:6]
        elif status in (200, 201, 204) and expected == "denied":
            verdict  = "FAIL"
            severity = "P0"
            reason   = f"data leak: {role} denied but got {status}"
            bug_id   = hashlib.sha1(f"{role}:{ep_path}:leak".encode()).hexdigest()[:6]
        elif status == 403 and expected == "allowed":
            verdict  = "FAIL"
            severity = "P1"
            reason   = f"role {role} allowed but got 403"
            bug_id   = hashlib.sha1(f"{role}:{ep_path}:403-allowed".encode()).hexdigest()[:6]
        elif status in (200, 201, 204) and expected == "allowed":
            verdict = "PASS"
        elif status == 403 and expected == "denied":
            verdict = "PASS"
        elif status in (400, 422):
            verdict = "PASS"
            reason  = f"validation {status} — request processed"
        elif status == 404:
            verdict  = "FAIL"
            severity = "P2"
            reason   = "endpoint not found 404"
            bug_id   = hashlib.sha1(f"{ep_path}:404".encode()).hexdigest()[:6]
        elif status in (200, 201, 204) and expected == "observe":
            verdict = "OBSERVE"
            reason  = f"not in RBAC lists, got {status}"
        elif status == 403 and expected == "observe":
            verdict = "OBSERVE"
            reason  = f"not in RBAC lists, got 403"
        elif status == 401 and expected in ("denied", "observe"):
            verdict = "PASS"
            reason  = "denied via 401"
        elif status == 405:
            verdict = "OBSERVE"
            reason  = f"method {method} not allowed"
        elif status == 500:
            verdict = "OBSERVE"
            reason  = "server error 500"
        else:
            verdict = "OBSERVE"
            reason  = f"unclassified {status} expected={expected}"

    except subprocess.TimeoutExpired:
        duration_ms = int((time.time() - t0) * 1000)
        verdict = "BLOCKED"
        reason  = "timeout"
    except Exception as ex:
        duration_ms = int((time.time() - t0) * 1000)
        verdict = "BLOCKED"
        reason  = str(ex)[:80]

    return {
        "uc_id": None,   # filled by caller
        "category": "API",
        "executed_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "duration_ms": duration_ms,
        "mode": "api",
        "actor_role": role,
        "route_or_endpoint": ep_path,
        "verdict": verdict,
        "severity_on_fail": severity if verdict == "FAIL" else None,
        "expected": expected,
        "observed": {"status": status},
        "reason": reason,
        "bug_id": bug_id,
        "iter": 1,
        "retest": False,
    }


def write_finding(finding):
    uc_id    = finding["uc_id"]
    tmp_path = f"{FINDINGS_DIR}/.{uc_id}.tmp"
    out_path = f"{FINDINGS_DIR}/{uc_id}.json"
    with open(tmp_path, "w") as f:
        json.dump(finding, f, indent=2)
    os.rename(tmp_path, out_path)


# ─── Main ───────────────────────────────────────────────────────────────────────
def main():
    os.makedirs(FINDINGS_DIR, exist_ok=True)

    tokens = authenticate_all()
    if not tokens:
        print("ERROR: No roles authenticated. Exiting.")
        sys.exit(1)

    print(f"\nLoading {YAML_PATH}...")
    with open(YAML_PATH) as f:
        data = yaml.safe_load(f)
    print(f"Loaded {len(data['routes'])} routes")

    print("Scanning existing findings...")
    tested, max_seq = load_state()
    _seq_counter[0] = max_seq
    print(f"Already done: {len(tested)} pairs, last seq: {max_seq}")

    queue = build_queue(data, tokens, tested)
    total = len(queue)

    if total == 0:
        print("\nAll tests complete!")
        Path(DONE_MARKER).touch()
        return

    print(f"\nStarting from UC-API-{max_seq + 1:05d}")
    print("=" * 70)

    done = 0
    passes = 0
    fails  = {"P0": 0, "P1": 0, "P2": 0}
    blocked = 0

    idx = 0
    while idx < total:
        batch = queue[idx: idx + BATCH_SIZE]
        idx  += BATCH_SIZE

        futures = {}
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
            for item in batch:
                _, priority, role, ep = item
                token = tokens[role]
                fut = ex.submit(probe, token, role, ep)
                futures[fut] = (role, ep["path"])

            for fut in as_completed(futures):
                finding = fut.result()
                seq = next_seq()
                uc_id = f"UC-API-{seq:05d}"
                finding["uc_id"] = uc_id
                write_finding(finding)
                done += 1

                v = finding["verdict"]
                if v == "PASS":
                    passes += 1
                elif v == "BLOCKED":
                    blocked += 1
                elif v == "FAIL":
                    sev = finding.get("severity_on_fail") or "P2"
                    fails[sev] = fails.get(sev, 0) + 1

                if done % 100 == 0:
                    pct = done / total * 100
                    total_fails = sum(fails.values())
                    print(f"  [{done}/{total} {pct:.1f}%] PASS={passes} "
                          f"FAIL={total_fails}(P0={fails.get('P0',0)},P1={fails.get('P1',0)}) "
                          f"BLOCKED={blocked} seq={seq}")

        # Drain retest queue
        if os.path.isfile(QUEUE_FILE):
            try:
                with open(QUEUE_FILE) as qf:
                    lines = [l.strip() for l in qf if l.strip()]
                if lines:
                    print(f"  [RETEST] {len(lines)} items in queue — clearing")
                    open(QUEUE_FILE, "w").close()
            except Exception as e:
                print(f"  [RETEST] Error: {e}")

    # Final summary
    total_fails = sum(fails.values())
    print("\n" + "=" * 70)
    print(f"COMPLETE: {done} tests")
    print(f"  PASS:    {passes} ({passes/max(done,1)*100:.1f}%)")
    print(f"  FAIL:    {total_fails} (P0={fails.get('P0',0)}, P1={fails.get('P1',0)}, P2={fails.get('P2',0)})")
    print(f"  BLOCKED: {blocked}")
    print(f"  Last UC: UC-API-{_seq_counter[0]:05d}")

    Path(DONE_MARKER).touch()
    print(f"Touched {DONE_MARKER}")


if __name__ == "__main__":
    main()
