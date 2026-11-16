"""NU-SEC-RBAC-101: does MANAGER (sumit) see all employees (EMPLOYEE:VIEW_ALL) or only team? GET only."""
import sys
sys.path.insert(0, "/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/scripts/secgate")
from plib import *
log = Log("NU-SEC-RBAC-101-manager-employee-scope")
s, r = login("sumit@nulogic.io", demo_pw(), log)
log.w("login", r.status_code)
for p in ["/api/v1/employees?size=1", "/api/v1/leave-requests?size=1", "/api/v1/attendance/all?size=1"]:
    x = s.request("GET", BE + p, timeout=20)
    import re
    m = re.search(r'"totalElements":(\d+)', x.text)
    log.w(p, "->", x.status_code, "totalElements=", m.group(1) if m else None)
