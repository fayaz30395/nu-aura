#!/usr/bin/env python3
"""F12b: refresh rotation/reuse + logout reuse using NUAURA_TEST_ user #2 (own account)."""
import sys, time, requests
sys.path.insert(0, ".")
from plib import *
email, pw = "nuaura_test_secgate2@nulogic.io", test_pw()
L = Log("NU-SEC-GATE-F12-session-lifecycle")
T = "/api/v1/departments"
def ck(d): return "; ".join(f"{k}={v}" for k, v in d.items() if k in ("access_token", "refresh_token", "XSRF-TOKEN"))
def parse(r):
    d = {}
    for c in r.raw.headers.getlist("Set-Cookie"):
        n, v = c.split(";", 1)[0].split("=", 1); d[n] = v
    return d
def call(m, path, d, xff, hdr=None):
    h = {"Cookie": ck(d), "X-XSRF-TOKEN": d.get("XSRF-TOKEN", ""), "X-Forwarded-For": xff, "Content-Type": "application/json"}
    if hdr: h.update(hdr)
    return requests.request(m, BE + path, headers=h, timeout=20)
r = requests.post(BE + "/api/v1/auth/login", json={"email": email, "password": pw}, headers={"X-Forwarded-For": "198.51.100.150"}, timeout=20)
L.w("login test user ->", r.status_code)
assert r.status_code == 200
s0 = parse(r)
r = call("GET", T, s0, "198.51.100.151"); L.w("access (s0) ->", r.status_code)
r1 = call("POST", "/api/v1/auth/refresh", s0, "198.51.100.152"); L.w("refresh #1 ->", r1.status_code)
s1 = {**s0, **parse(r1)}
L.w("tokens rotated: access", s1["access_token"] != s0["access_token"], "refresh", s1["refresh_token"] != s0["refresh_token"])
time.sleep(1)
r = call("POST", "/api/v1/auth/refresh", s0, "198.51.100.153"); L.w("REPLAY old refresh (s0) ->", r.status_code, r.text[:90])
time.sleep(1)
r = call("POST", "/api/v1/auth/refresh", s1, "198.51.100.154"); L.w("refresh with NEW token after old-token replay ->", r.status_code, "(401 => token family revoked on reuse; 200 => family NOT revoked)")
if r.status_code == 200:
    s1 = {**s1, **parse(r)}
r = call("GET", T, s0, "198.51.100.155"); L.w("OLD access token (pre-refresh) still accepted ->", r.status_code, "(stateless JWT, valid until exp 90 min)")
acc = s1["access_token"]
lo = call("POST", "/api/v1/auth/logout", s1, "198.51.100.156"); L.w("logout ->", lo.status_code)
time.sleep(1)
r = requests.get(BE + T, headers={"Cookie": f"access_token={acc}", "X-Forwarded-For": "198.51.100.157"}, timeout=20); L.w("REUSE access token after logout ->", r.status_code, "(401 expected)")
r = call("POST", "/api/v1/auth/refresh", {"refresh_token": s1["refresh_token"], "XSRF-TOKEN": s1["XSRF-TOKEN"]}, "198.51.100.158"); L.w("REUSE refresh token after logout ->", r.status_code, "(401 expected)")
r = requests.get(BE + T, headers={"Cookie": f"access_token={s0['access_token']}", "X-Forwarded-For": "198.51.100.159"}, timeout=20); L.w("pre-refresh access token after logout ->", r.status_code)
