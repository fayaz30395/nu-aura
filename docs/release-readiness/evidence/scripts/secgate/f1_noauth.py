#!/usr/bin/env python3
"""F1-F5 no-login probes: security headers, actuator exposure, CORS, error/stack-trace leakage, unauthenticated sweep (small, paced)."""
import sys, time, re, uuid
sys.path.insert(0, "/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/scripts/secgate")
from plib import *
import requests

# ---------- F1 security headers ----------
L = Log("NU-SEC-GATE-F01-headers")
for name, url in (("BE /api/v1/auth/me (401)", BE + "/api/v1/auth/me"), ("BE /actuator/health", BE + "/actuator/health"), ("FE /login", FE + "/login"), ("FE /", FE + "/")):
    r = requests.get(url, timeout=15, allow_redirects=False)
    L.w(f"== {name} status={r.status_code}")
    for h in ("Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy",
              "Permissions-Policy", "Cache-Control", "Cross-Origin-Opener-Policy", "Cross-Origin-Resource-Policy", "X-XSS-Protection", "Server", "X-Powered-By"):
        v = r.headers.get(h)
        L.w(f"   {h}: {v[:260] if v else 'MISSING'}")

# ---------- F2 actuator ----------
L = Log("NU-SEC-GATE-F02-actuator")
for p in ("/actuator", "/actuator/health", "/actuator/health/liveness", "/actuator/info", "/actuator/env", "/actuator/beans", "/actuator/heapdump",
          "/actuator/threaddump", "/actuator/mappings", "/actuator/metrics", "/actuator/prometheus", "/actuator/loggers", "/actuator/configprops",
          "/v3/api-docs", "/swagger-ui/index.html", "/swagger-ui.html", "/api-docs"):
    r = requests.get(BE + p, timeout=15)
    L.req(p, r, 160)
    time.sleep(0.15)
r = requests.get(BE + "/actuator/health", timeout=15)
keys = re.findall(r'"(activeProfiles|path|database|uptime|heapUsed|status)"', r.text)
L.w("health body discloses keys:", sorted(set(keys)))

# ---------- F3 CORS ----------
L = Log("NU-SEC-GATE-F03-cors")
for origin in ("https://evil.example", "null", "http://localhost:3000", "http://localhost:3000.evil.example"):
    r = requests.get(BE + "/api/v1/auth/me", headers={"Origin": origin}, timeout=15)
    L.w(f"GET Origin={origin} -> {r.status_code} ACAO={r.headers.get('Access-Control-Allow-Origin')} ACAC={r.headers.get('Access-Control-Allow-Credentials')}")
    r = requests.options(BE + "/api/v1/employees", headers={"Origin": origin, "Access-Control-Request-Method": "DELETE",
                         "Access-Control-Request-Headers": "x-xsrf-token,content-type"}, timeout=15)
    L.w(f"OPTIONS preflight Origin={origin} -> {r.status_code} ACAO={r.headers.get('Access-Control-Allow-Origin')} ACAM={r.headers.get('Access-Control-Allow-Methods')} ACAH={r.headers.get('Access-Control-Allow-Headers')}")

# ---------- F4 error handling / stack traces (unauthenticated paths first) ----------
L = Log("NU-SEC-GATE-F04-errors-nologin")
cases = [
    ("GET", "/api/v1/does-not-exist", {}, None),
    ("GET", "/api/v1/auth/me%00", {}, None),
    ("POST", "/api/v1/auth/login", {"Content-Type": "application/json"}, "{bad json"),
    ("POST", "/api/v1/auth/login", {"Content-Type": "application/json"}, '{"email":["x"],"password":{"a":1}}'),
    ("POST", "/api/v1/auth/login", {"Content-Type": "text/plain"}, "x"),
    ("POST", "/api/v1/auth/login", {"Content-Type": "application/xml"}, "<a/>"),
    ("PATCH", "/api/v1/auth/login", {}, None),
    ("GET", "/api/v1/public/careers/jobs?page=-1&size=999999999", {}, None),
    ("GET", "/api/v1/public/careers/jobs?sort=nonexistent_col,desc", {}, None),
    ("GET", "/error", {}, None),
    ("GET", "/api/v1/public/offers/%27%22%3Cscript%3Ealert(1)%3C/script%3E", {}, None),
]
for m, p, h, b in cases:
    try:
        r = requests.request(m, BE + p, headers=h, data=b, timeout=15)
        L.req(f"{m} {p[:60]}", r, 260)
        leak = re.findall(r"(at [a-z]+\.[a-zA-Z.]+\(|Exception|stackTrace|\.java:\d+|org\.springframework|hibernate|SQLState|trace\"|/Users/)", r.text)
        if leak:
            L.w("   LEAK-MARKERS:", sorted(set(leak)))
    except Exception as e:
        L.w(f"{m} {p}: EXC {e}")
    time.sleep(0.2)

# ---------- F5 unauthenticated surface sample (paced; 429-aware) ----------
L = Log("NU-SEC-GATE-F05-unauth-surface")
protected = ["/api/v1/employees", "/api/v1/employees/" + str(uuid.uuid4()), "/api/v1/payroll/runs", "/api/v1/payslips", "/api/v1/users", "/api/v1/roles",
             "/api/v1/admin/audit-logs", "/api/v1/audit-logs", "/api/v1/leave-requests", "/api/v1/attendance", "/api/v1/files/download?path=x",
             "/api/v1/admin/encryption-backfill/users/mfa-secrets", "/api/v1/auth/me", "/api/v1/dashboard/stats", "/api/v1/wiki/pages",
             "/api/v1/recruitment/candidates", "/api/v1/api-keys", "/api/v1/webhooks", "/api/v1/tenants", "/api/v1/admin/system/health"]
for p in protected:
    r = requests.get(BE + p, timeout=15)
    L.w(f"GET {p[:70]} -> {r.status_code} {r.text[:80]!r}")
    time.sleep(0.4)
for p in ("/api/v1/employees", "/api/v1/roles"):
    for m in ("POST", "PUT", "DELETE"):
        r = requests.request(m, BE + p, json={}, timeout=15)
        L.w(f"{m} {p} (no cookie, no csrf) -> {r.status_code} {r.text[:70]!r}")
        time.sleep(0.4)
L.w("--- explicit permitAll paths (SecurityConfig.java:189-251), unauthenticated, GET:")
for p in ("/api/v1/auth/forgot-password", "/api/v1/external/employees", "/api/v1/public/careers/jobs", "/api/v1/esignature/external/x", "/api/v1/public/offers/x",
          "/api/v1/exit/interview/public/x", "/api/v1/preboarding/portal/x", "/api/v1/biometric/punch", "/api/v1/payments/webhooks/x", "/ws/info",
          "/api/v1/integrations/docusign/webhook", "/api/v1/integrations/slack/commands", "/saml2/metadata", "/login/saml2/sso/x"):
    r = requests.get(BE + p, timeout=15)
    L.w(f"GET {p} -> {r.status_code} {r.text[:90]!r}")
    time.sleep(0.4)
