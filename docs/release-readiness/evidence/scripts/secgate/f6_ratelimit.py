import sys, time, requests
sys.path.insert(0, ".")
from plib import *
L = Log("NU-SEC-GATE-F14b-ratelimit-xff")
email = "nuaura_test_secgate2@nulogic.io"
def att(xff, i, extra=None):
    body = {"email": email, "password": "Wrong!pw" + str(i)}
    if extra: body.update(extra)
    r = requests.post(BE + "/api/v1/auth/login", json=body, headers={"X-Forwarded-For": xff}, timeout=20)
    return r
seq = []
for i in range(8):
    r = att("198.51.100.201", i); seq.append(r.status_code); L.w(f"same XFF attempt {i+1} ->", r.status_code, r.text[:95])
    time.sleep(0.2)
L.w("SAME spoofed XFF, 8 attempts:", seq, "=> limiter enforced per XFF-derived key" if 429 in seq else "=> NO 429 seen")
seq2 = []
for i in range(8):
    r = att(f"198.51.100.{210+i}", i); seq2.append(r.status_code); time.sleep(0.2)
L.w("ROTATING XFF, 8 attempts:", seq2, "=> if no 429 here but 429 above, per-IP limiter is bypassable via X-Forwarded-For rotation when the app is directly exposed / hop count wrong")
# captcha presence-only bypass with NoOp: any non-blank token accepted past the gate
r = att("198.51.100.230", 99, {"captchaToken": "not-a-real-token"})
L.w("after >=3 failures, wrong pw + arbitrary captchaToken ->", r.status_code, r.text[:110], "(gate passed => message is credentials/lockout, not 'captcha-required')")
# lockout (per-account)
r = requests.post(BE + "/api/v1/auth/login", json={"email": email, "password": test_pw(), "captchaToken": "x"}, headers={"X-Forwarded-For": "198.51.100.231"}, timeout=20)
L.w("CORRECT password + arbitrary captchaToken after >=5 failures ->", r.status_code, r.text[:130], "(expect locked)")
