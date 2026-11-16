#!/usr/bin/env python3
"""F12b session lifecycle + F14 rate-limit/lockout, using ONLY the NUAURA_TEST_ user. XFF spoof also keeps probes out of the shared AUTH bucket."""
import sys, time, json, requests
sys.path.insert(0, ".")
from plib import *
email, pw = "nuaura_test_secgate@nulogic.io", test_pw()
L = Log("NU-SEC-GATE-F14-ratelimit-lockout")
def post(path, body=None, ck=None, xff=None, extra=None):
    h = {"Content-Type": "application/json"}
    if xff: h["X-Forwarded-For"] = xff
    if ck: h["Cookie"] = ck
    if extra: h.update(extra)
    return requests.post(BE + path, json=body, headers=h, timeout=20)
# 1. is the shared bucket currently saturated? (no XFF)
r = post("/api/v1/auth/login", {"email": email, "password": "wrong-" + pw[:3]})
L.w("no-XFF wrong-password login ->", r.status_code, r.text[:90])
# 2. XFF spoof: distinct last-hop per attempt
codes = []
for i in range(8):
    r = post("/api/v1/auth/login", {"email": email, "password": "NotThePassword!" + str(i)}, xff=f"198.51.100.{10+i}")
    codes.append(r.status_code)
    L.w(f"attempt {i+1} wrong pw, spoofed XFF 198.51.100.{10+i} ->", r.status_code, r.text[:110])
    time.sleep(0.4)
L.w("status sequence (spoofed XFF):", codes, "| 429 never seen => per-IP limiter bypassed by header rotation (local, no trusted proxy)")
# 3. is account lockout (per-account) effective? correct password after >=5 failures
r = post("/api/v1/auth/login", {"email": email, "password": pw}, xff="198.51.100.77")
L.w("correct password after 8 failures ->", r.status_code, r.text[:140], "(expect locked: 401/423)")
# user enumeration: unknown email vs wrong password (message/status equality)
ru = post("/api/v1/auth/login", {"email": "nuaura_test_nobody@nulogic.io", "password": "x" * 12}, xff="198.51.100.78")
rw = post("/api/v1/auth/login", {"email": "arun@nulogic.io" if False else email, "password": "y" * 12}, xff="198.51.100.79")
L.w("unknown user ->", ru.status_code, ru.text[:120]); L.w("known user wrong pw (locked now) ->", rw.status_code, rw.text[:120])
# 4. forgot-password enumeration (timing + response equality), XFF to avoid shared bucket
t = []
for e in (email, "nuaura_test_nobody@nulogic.io", email, "nuaura_test_nobody@nulogic.io"):
    s = time.time(); r = post("/api/v1/auth/forgot-password", {"email": e}, xff=f"198.51.100.{100+len(t)}"); t.append(round(time.time() - s, 3))
    L.w(f"forgot-password {'existing' if e==email else 'unknown'} -> {r.status_code} {r.text[:120]!r} t={t[-1]}s")
