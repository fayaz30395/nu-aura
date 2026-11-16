"""NU-SEC-RBAC live GET probe. Demo accounts only, one login each, GET-only (no mutations). Output redacted by plib."""
import sys
sys.path.insert(0, "/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/scripts/secgate")
from plib import *
pw = demo_pw()
log = Log("NU-SEC-RBAC-100-live-get-probe")
ACCTS = ["arun@nulogic.io", "sumit@nulogic.io", "jagadeesh@nulogic.io", "suresh@nulogic.io", "finance@nulogic.io", "tenant.admin@nulogic.io"]
PROBES = [
    ("wiki-list", "/api/v1/knowledge/wiki/pages"),
    ("file-exists", "/api/v1/files/exists?objectName=x"),
    ("tax-decl-self-list", "/api/v1/tax-declarations"),
    ("org-chart", "/api/v1/organization/chart"),
    ("shifts", "/api/v1/shifts"),
    ("mobile-leave-balance", "/api/v1/mobile/leave/balance"),
    ("employees-list", "/api/v1/employees?size=1"),
    ("payroll-runs", "/api/v1/payroll/runs?size=1"),
    ("roles-list", "/api/v1/roles"),
    ("users-list", "/api/v1/users?size=1"),
    ("platform-app-users", "/api/v1/platform/applications/HRMS/users"),
    ("admin-system-overview", "/api/v1/admin/system/overview"),
    ("custom-fields", "/api/v1/custom-fields"),
    ("esign-list", "/api/v1/esignature/requests"),
]
for a in ACCTS:
    s, r = login(a, pw, log)
    log.w(f"== login {a} -> {r.status_code}")
    if r.status_code != 200:
        continue
    for label, p in PROBES:
        x = s.request("GET", BE + p, timeout=20)
        log.w(f"{a} {label} {p} -> {x.status_code} {x.text[:90]!r}")
