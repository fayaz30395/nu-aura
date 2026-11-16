#!/usr/bin/env python3
"""F7-F10 authenticated probes (demo users, ONE login each): cookie flags, CSRF, JWT tamper, bearer fallback, token-type confusion,
authz sampling as EMPLOYEE, IDOR on single employee, directory search exposure, mass-assignment on /employees/me."""
import sys, time, json, base64, hmac, hashlib, uuid
sys.path.insert(0, "/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/scripts/secgate")
from plib import *
import requests

pw = demo_pw()
L = Log("NU-SEC-GATE-F07-login-cookies")
A, r = login("arun@nulogic.io", pw, L)
L.w("login arun status", r.status_code, "body keys:", sorted(r.json().keys()) if r.headers.get("content-type", "").startswith("application/json") and r.status_code == 200 else r.text[:120])
for c in r.raw.headers.getlist("Set-Cookie") if hasattr(r.raw.headers, "getlist") else []:
    L.w("Set-Cookie:", c)
if r.status_code != 200:
    sys.exit("login failed")
time.sleep(12)
H, r2 = login("jagadeesh@nulogic.io", pw, L)
L.w("login hr-manager status", r2.status_code)
if r2.status_code != 200:
    sys.exit("hr login failed")

me = A.get(BE + "/api/v1/auth/me", timeout=15).json()
L.w("arun /auth/me keys:", sorted(me.keys()), "roles:", me.get("roles"), "perm_count:", len(me.get("permissions", []) or []))
acc = A.ck.get("access_token")
ref = A.ck.get("refresh_token")
L.w("cookies held by session:", sorted(A.ck.keys()))

# ---------------- F8 CSRF ----------------
L = Log("NU-SEC-GATE-F08-csrf")
rid = str(uuid.uuid4())
r = A.request("DELETE", BE + f"/api/v1/employees/{rid}", timeout=15)
L.req("DELETE no X-XSRF-TOKEN", r)
r = A.request("DELETE", BE + f"/api/v1/employees/{rid}", headers={"X-XSRF-TOKEN": "A" * 36}, timeout=15)
L.req("DELETE wrong X-XSRF-TOKEN", r)
r = mut(A, "DELETE", f"/api/v1/employees/{rid}")
L.req("DELETE correct X-XSRF-TOKEN (random uuid; expect authz/404, not CSRF)", r)
# Cross-origin style: valid cookies, Origin evil, token header correct but Origin/Referer foreign
r = mut(A, "DELETE", f"/api/v1/employees/{rid}", headers={"Origin": "https://evil.example"})
L.req("DELETE correct token + Origin evil", r)

# ---------------- F9 JWT tamper ----------------
L = Log("NU-SEC-GATE-F09-jwt-tamper")
def b64(d): return base64.urlsafe_b64encode(d).rstrip(b"=").decode()
def unb64(s): s += "=" * (-len(s) % 4); return base64.urlsafe_b64decode(s)
h, p, sig = acc.split(".")
hdr, pay = json.loads(unb64(h)), json.loads(unb64(p))
L.w("access token header alg:", hdr.get("alg"), "claims:", sorted(pay.keys()), "exp-iat(s):", pay["exp"] - pay["iat"])
ref_h, ref_p, _ = ref.split(".")
L.w("refresh token exp-iat(days): %.2f" % ((json.loads(unb64(ref_p))["exp"] - json.loads(unb64(ref_p))["iat"]) / 86400))
def try_cookie(label, tok, extra_cookies=None):
    r = requests.get(BE + "/api/v1/auth/me", headers={"Cookie": f"access_token={tok}"}, timeout=15)
    L.w(f"{label}: -> {r.status_code} {r.text[:90]!r}")
    return r.status_code
try_cookie("baseline valid token", acc)
none_h = b64(json.dumps({"alg": "none", "typ": "JWT"}).encode())
try_cookie("alg=none, empty sig", f"{none_h}.{p}.")
try_cookie("alg=none, original sig", f"{none_h}.{p}.{sig}")
try_cookie("alg=None (case)", f"{b64(json.dumps({'alg':'None','typ':'JWT'}).encode())}.{p}.")
pay2 = dict(pay); pay2["sub"] = pay2.get("sub", "x")[:-1] + ("0" if pay2.get("sub", "x")[-1] != "0" else "1")
try_cookie("payload sub modified, original sig", f"{h}.{b64(json.dumps(pay2).encode())}.{sig}")
pay3 = dict(pay); pay3["roles"] = ["SUPER_ADMIN"]
try_cookie("payload roles=SUPER_ADMIN, original sig", f"{h}.{b64(json.dumps(pay3).encode())}.{sig}")
try_cookie("signature stripped (2 parts)", f"{h}.{p}")
try_cookie("signature truncated", f"{h}.{p}.{sig[:-6]}")
alg = hdr.get("alg", "HS384")
digest = {"HS256": hashlib.sha256, "HS384": hashlib.sha384, "HS512": hashlib.sha512}[alg]
forged = hmac.new(b"x" * 48, f"{h}.{p}".encode(), digest).digest()
try_cookie("re-signed with guessed key", f"{h}.{p}.{b64(forged)}")
for guess in (b"secret", b"changeme", b"jwt-secret", b"your-256-bit-secret", b"nulogic", b"hrms-secret-key-change-in-production-min-32-chars"):
    sg = b64(hmac.new(guess, f"{h}.{p}".encode(), digest).digest())
    c = try_cookie(f"re-signed with weak guess '{guess.decode()[:12]}...'", f"{h}.{p}.{sg}")
try_cookie("refresh token presented as access token", ref)
s = requests.Session()
r = s.get(BE + "/api/v1/auth/me", headers={"Authorization": "Bearer " + acc}, timeout=15)
L.w("Authorization: Bearer <valid access> without cookie ->", r.status_code, r.text[:70])
r = requests.get(BE + "/api/v1/auth/me", headers={"Cookie": f"access_token={acc}\r\nX-Injected: 1"}, timeout=15) if False else None

# ---------------- F10 authz sampling as EMPLOYEE (arun) ----------------
L = Log("NU-SEC-GATE-F10-employee-authz-sample")
L.w("== read-only GETs as EMPLOYEE (arun). 403 expected for privileged data; 200 flagged for review")
paths = ["/api/v1/employees?size=3", "/api/v1/users", "/api/v1/roles", "/api/v1/permissions", "/api/v1/admin/audit-logs", "/api/v1/audit-logs",
         "/api/v1/payroll/runs", "/api/v1/payroll/payslips", "/api/v1/payslips", "/api/v1/salary-structures", "/api/v1/statutory/pf/config",
         "/api/v1/api-keys", "/api/v1/webhooks", "/api/v1/admin/feature-flags", "/api/v1/tenants", "/api/v1/recruitment/candidates", "/api/v1/leave-requests",
         "/api/v1/expenses/claims", "/api/v1/reports", "/api/v1/analytics/dashboard", "/api/v1/admin/system/info", "/api/v1/benefits/claims",
         "/api/v1/compensation/cycles", "/api/v1/employees/directory", "/api/v1/org-chart", "/api/v1/departments", "/api/v1/auth/mfa/status"]
for pth in paths:
    r = A.get(BE + pth, timeout=20)
    n = ""
    try:
        j = r.json()
        n = f"keys={sorted(j.keys())[:6]}" if isinstance(j, dict) else f"list_len={len(j)}"
        if isinstance(j, dict) and "totalElements" in j:
            n += f" totalElements={j['totalElements']}"
    except Exception:
        pass
    L.w(f"A GET {pth} -> {r.status_code} {n if r.status_code==200 else r.text[:70]!r}")
    time.sleep(0.5)

L.w("== HR_MANAGER fetches employee ids; EMPLOYEE (arun) requests others by id (IDOR on single record)")
r = H.get(BE + "/api/v1/employees?size=6", timeout=20)
ids = []
try:
    ids = [e["id"] for e in r.json().get("content", [])]
except Exception:
    pass
L.w("H employees list status", r.status_code, "ids fetched:", len(ids))
myemp = (A.get(BE + "/api/v1/employees/me", timeout=15))
my_id = myemp.json().get("id") if myemp.status_code == 200 else None
L.w("arun /employees/me ->", myemp.status_code, "own id present:", bool(my_id), "keys:", sorted(myemp.json().keys())[:40] if myemp.status_code == 200 else "")
for i in ids:
    if i == my_id:
        continue
    for pth in (f"/api/v1/employees/{i}",):
        r = A.get(BE + pth, timeout=15)
        L.w(f"A GET {pth.replace(i,'<other-employee-id>')} -> {r.status_code} {r.text[:70] if r.status_code!=200 else '(200 BODY RETURNED)'}")
        time.sleep(0.4)
r = A.get(BE + f"/api/v1/employees/{my_id}", timeout=15)
L.w("A GET own /employees/<own-id> ->", r.status_code)

L.w("== directory search (no @RequiresPermission) as EMPLOYEE")
r = mut(A, "POST", "/api/v1/employees/directory/search", json={"query": "a", "page": 0, "size": 3})
L.w("POST directory/search ->", r.status_code, "len", len(r.text))
try:
    j = r.json()
    rows = j.get("content", j if isinstance(j, list) else [])
    if rows:
        L.w("directory row keys exposed to EMPLOYEE:", sorted(rows[0].keys()))
except Exception as e:
    L.w("parse err", e, r.text[:200])

# ---------------- F11 mass assignment on /employees/me (benign: same values re-sent) ----------------
L = Log("NU-SEC-GATE-F11-mass-assignment")
cur = myemp.json()
body = {k: cur.get(k) for k in ("phoneNumber", "city", "state", "country") if cur.get(k) is not None}
priv = {"salary": 99999999, "ctc": 99999999, "tenantId": str(uuid.uuid4()), "role": "SUPER_ADMIN", "roles": ["SUPER_ADMIN"], "status": "TERMINATED",
        "managerId": str(uuid.uuid4()), "departmentId": str(uuid.uuid4()), "designation": "NUAURA_TEST_CEO", "employeeNumber": "NUAURA_TEST_X", "userId": str(uuid.uuid4()), "id": str(uuid.uuid4()),
        "isAdmin": True, "permissions": ["SYSTEM_ADMIN"]}
before = {k: cur.get(k) for k in ("designation", "status", "managerId", "departmentId", "employeeNumber", "tenantId", "salary", "id", "userId")}
r = mut(A, "PUT", "/api/v1/employees/me", json={**body, **priv})
L.w("PUT /employees/me with privileged extras ->", r.status_code, r.text[:120])
after_r = A.get(BE + "/api/v1/employees/me", timeout=15)
aft = after_r.json() if after_r.status_code == 200 else {}
changed = {k: (before[k], aft.get(k)) for k in before if before[k] != aft.get(k)}
L.w("fields changed after privileged extras (expect none):", {k: "CHANGED" for k in changed} or "none")
me2 = A.get(BE + "/api/v1/auth/me", timeout=15).json()
L.w("auth/me roles after (expect unchanged):", me2.get("roles"))

