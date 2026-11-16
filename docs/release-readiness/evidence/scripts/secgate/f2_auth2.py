#!/usr/bin/env python3
"""F9b JWT tamper (using /api/v1/departments, API bucket, not AUTH bucket) + F12 session lifecycle (logout reuse, refresh rotation/reuse).
Logins: arun x2 (A for tamper, B for lifecycle), jagadeesh x1 (saved for later groups)."""
import sys, time, json, base64, hmac, hashlib
sys.path.insert(0, "/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/scripts/secgate")
from plib import *
import requests
pw = demo_pw()
L = Log("NU-SEC-GATE-F09-jwt-tamper")
A, r = login("arun@nulogic.io", pw, L); assert r.status_code == 200, r.status_code; save_session("arun", A)
time.sleep(5)
B, r = login("arun@nulogic.io", pw, L); assert r.status_code == 200, r.status_code; save_session("arun_b", B)
time.sleep(5)
H, r = login("jagadeesh@nulogic.io", pw, L); assert r.status_code == 200, r.status_code; save_session("hr", H)
def b64(d): return base64.urlsafe_b64encode(d).rstrip(b"=").decode()
def unb64(s): s += "=" * (-len(s) % 4); return base64.urlsafe_b64decode(s)
acc, ref = A.ck["access_token"], A.ck["refresh_token"]
h, p, sig = acc.split("."); hdr, pay = json.loads(unb64(h)), json.loads(unb64(p))
L.w("access token alg:", hdr.get("alg"), "claims:", sorted(pay.keys()), "ttl_s:", pay["exp"] - pay["iat"], "| refresh ttl_days: %.2f" % ((lambda c: (c['exp'] - c['iat']) / 86400)(json.loads(unb64(ref.split('.')[1])))))
TARGET = "/api/v1/departments"
def probe(label, cookie=None, headers=None):
    hh = dict(headers or {})
    if cookie is not None:
        hh["Cookie"] = cookie
    r = requests.get(BE + TARGET, headers=hh, timeout=15)
    L.w(f"{label}: -> {r.status_code} {r.text[:70]!r}")
    time.sleep(0.3)
    return r.status_code
probe("baseline valid access cookie", f"access_token={acc}")
nh = b64(json.dumps({"alg": "none", "typ": "JWT"}).encode())
probe("alg=none empty sig", f"access_token={nh}.{p}.")
probe("alg=none original sig", f"access_token={nh}.{p}.{sig}")
probe("alg=None (case) empty sig", f"access_token={b64(json.dumps({'alg':'None'}).encode())}.{p}.")
sub = pay["sub"]; pay2 = dict(pay); pay2["sub"] = sub[:-1] + ("0" if sub[-1] != "0" else "1")
probe("payload sub modified, original sig", f"access_token={h}.{b64(json.dumps(pay2).encode())}.{sig}")
pay3 = dict(pay); pay3["roles"] = ["SUPER_ADMIN"]
probe("payload roles=SUPER_ADMIN, original sig", f"access_token={h}.{b64(json.dumps(pay3).encode())}.{sig}")
probe("signature stripped (2 parts)", f"access_token={h}.{p}")
probe("signature truncated", f"access_token={h}.{p}.{sig[:-8]}")
dg = {"HS256": hashlib.sha256, "HS384": hashlib.sha384, "HS512": hashlib.sha512}[hdr["alg"]]
probe("re-signed with random key", f"access_token={h}.{p}.{b64(hmac.new(b'x'*64, f'{h}.{p}'.encode(), dg).digest())}")
for g in (b"secret", b"changeme", b"jwt-secret", b"your-256-bit-secret", b"nulogic", b"hrms-secret-key-change-in-production-min-32-chars", demo_pw().encode()):
    probe(f"re-signed with weak guess [{g[:6].decode()}...]", f"access_token={h}.{p}.{b64(hmac.new(g, f'{h}.{p}'.encode(), dg).digest())}")
probe("refresh token as access token", f"access_token={ref}")
probe("Authorization: Bearer <valid> (no cookie)", None, {"Authorization": "Bearer " + acc})
probe("both cookie+bearer, cookie invalid, bearer valid", f"access_token=garbage", {"Authorization": "Bearer " + acc})
# refresh_token cookie sent to a non-auth path must not be sent by browser (Path=/api/v1/auth) - informational
L.w("refresh cookie Path=/api/v1/auth (from Set-Cookie); access cookie Path=/")

# ---------------- F12 lifecycle on session B ----------------
L = Log("NU-SEC-GATE-F12-session-lifecycle")
acc0, ref0 = B.ck["access_token"], B.ck["refresh_token"]
r = B.get(BE + TARGET); L.w("B baseline access ->", r.status_code)
r = mut(B, "POST", "/api/v1/auth/refresh"); L.w("B refresh #1 (cookie refresh_token) ->", r.status_code, "Set-Cookie names:", [c.split('=')[0] for c in r.raw.headers.getlist('Set-Cookie')])
if r.status_code == 200:
    new_ck = dict(B.ck)
    for c in r.raw.headers.getlist("Set-Cookie"):
        n, v = c.split(";", 1)[0].split("=", 1); new_ck[n] = v
    acc1, ref1 = new_ck.get("access_token"), new_ck.get("refresh_token")
    L.w("new tokens issued differ from old: access", acc1 != acc0, "refresh", ref1 != ref0)
    time.sleep(2)
    # replay OLD refresh token (rotation / reuse detection)
    s = requests.Session()
    rr = s.post(BE + "/api/v1/auth/refresh", headers={"Cookie": f"refresh_token={ref0}; XSRF-TOKEN={B.ck['XSRF-TOKEN']}"}, timeout=15)
    L.w("replay OLD refresh token ->", rr.status_code, rr.text[:100])
    time.sleep(2)
    # does reuse of old refresh revoke the new family? try new refresh
    rr2 = requests.post(BE + "/api/v1/auth/refresh", headers={"Cookie": f"refresh_token={ref1}; XSRF-TOKEN={B.ck['XSRF-TOKEN']}"}, timeout=15)
    L.w("NEW refresh token after old-token reuse (family revoked? 401 = yes) ->", rr2.status_code, rr2.text[:80])
    # old access token still accepted after refresh? (JWT stateless; blacklist?)
    r = requests.get(BE + TARGET, headers={"Cookie": f"access_token={acc0}"}, timeout=15); L.w("OLD access token after refresh ->", r.status_code)
    cur_acc, cur_ref = (new_ck.get("access_token"), new_ck.get("refresh_token"))
else:
    L.w("refresh failed body:", r.text[:150]); cur_acc, cur_ref = acc0, ref0
time.sleep(2)
# logout then reuse
tok = cur_acc
lo = requests.post(BE + "/api/v1/auth/logout", headers={"Cookie": f"access_token={tok}; refresh_token={cur_ref}; XSRF-TOKEN={B.ck['XSRF-TOKEN']}", "X-XSRF-TOKEN": B.ck["XSRF-TOKEN"]}, timeout=15)
L.w("logout ->", lo.status_code, "clears cookies:", [c.split(';')[0].split('=')[0] + "=" + ("" if c.split(';')[0].endswith('=') else "<value>") for c in lo.raw.headers.getlist('Set-Cookie')])
time.sleep(1)
r = requests.get(BE + TARGET, headers={"Cookie": f"access_token={tok}"}, timeout=15); L.w("access token REUSE after logout ->", r.status_code, "(401 expected)")
rr = requests.post(BE + "/api/v1/auth/refresh", headers={"Cookie": f"refresh_token={cur_ref}; XSRF-TOKEN={B.ck['XSRF-TOKEN']}"}, timeout=15)
L.w("refresh token REUSE after logout ->", rr.status_code, "(401 expected)")
r = requests.get(BE + TARGET, headers={"Cookie": f"access_token={acc0}"}, timeout=15); L.w("original (pre-refresh) access token after logout ->", r.status_code)
