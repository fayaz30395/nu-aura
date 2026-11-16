#!/usr/bin/env python3
"""NU-SEC-RBAC-2xx: escalation attempts, permission-cache invalidation timing, revocation, logout, deactivation.
Uses NUAURA_TEST_ users only as the subject (chg_user, payroll_admin). Setup that the app cannot do (user_roles insert: DEF-HRMS-02) is done as superuser and logged.
Env: JARS, SU (path to su.sh)."""
import sys, os, json, time, subprocess
sys.path.insert(0, os.path.dirname(__file__)); import h
SU = os.environ['SU']
def sql(q): return subprocess.run([SU, '-t', '-A', '-c', q], capture_output=True, text=True).stdout.strip()
N = '660e8400-e29b-41d4-a716-446655440001'
chg = sql("select id from users where email='nuaura_test_rbac_chg@nulogic.io'")
res = []
def note(tid, what, st, verdict, extra=''): res.append((tid, what, st, verdict, extra)); print(tid, what, st, verdict, extra, flush=True)
def poll(label, path, want, secs, step=3):
    t0 = time.time()
    while time.time() - t0 < secs:
        st, _ = h.call(label, 'GET', path, test=T, max_body=60, note='poll')
        if want(st): return round(time.time() - t0, 1), st
        time.sleep(step)
    return None, st
# ---- A. escalation attempts (must all be denied)
T = 'NU-SEC-RBAC-200-escalation-attempts'
A = [('tenant_admin', 'POST', '/api/v1/roles', {'code': 'SUPER_ADMIN', 'name': 'x', 'permissionCodes': []}),
     ('tenant_admin', 'POST', '/api/v1/roles', {'code': 'NUAURA_TEST_ESC1', 'name': 'x', 'permissionCodes': ['SYSTEM:ADMIN']}),
     ('tenant_admin', 'PUT', f'/api/v1/users/{chg}/roles', {'roleCodes': ['SUPER_ADMIN']}),
     ('hr_admin', 'PUT', f'/api/v1/users/{chg}/roles', {'roleCodes': ['SUPER_ADMIN']}),
     ('hr_admin', 'POST', '/api/v1/roles', {'code': 'NUAURA_TEST_ESC2', 'name': 'x', 'permissionCodes': ['SYSTEM:ADMIN']}),
     ('hr_manager', 'PUT', f'/api/v1/users/{chg}/roles', {'roleCodes': ['HR_ADMIN']}),
     ('manager', 'PUT', f'/api/v1/users/{chg}/roles', {'roleCodes': ['HR_ADMIN']}),
     ('employee', 'PUT', f'/api/v1/users/{chg}/roles', {'roleCodes': ['HR_ADMIN']}),
     ('chg_user', 'PUT', f'/api/v1/users/{chg}/roles', {'roleCodes': ['SUPER_ADMIN']}),
     ('chg_user', 'GET', '/api/v1/admin/system/overview', None), ('chg_user', 'GET', '/api/v1/roles', None)]
for variant in ('super_admin', 'SUPER_ADMIN ', 'Super_Admin', 'SUPER-ADMIN', 'SUPER_ADMIN​'):
    A.append(('tenant_admin', 'POST', '/api/v1/roles', {'code': variant, 'name': 'NUAURA_TEST_variant', 'permissionCodes': []}))
for who, m, p, b in A:
    st, t = h.call(who, m, p, b, test=T, max_body=160)
    ok = st in (400, 403, 404)
    note(T, f'{who} {m} {p} {json.dumps(b)[:70]}', st, 'PASS' if ok else 'FAIL(accepted)')
leftover = sql("select string_agg(code, ',') from roles where tenant_id='%s' and (upper(code) like '%%SUPER%%' or code like 'NUAURA_TEST_ESC%%' or name='NUAURA_TEST_variant') and code<>'SUPER_ADMIN'" % N)
note(T, 'roles created by escalation probes (should be empty)', 0, 'INFO', leftover or 'none')
# ---- B. cache invalidation / revocation timing with a NUAURA_TEST_ role
T = 'NU-SEC-RBAC-210-cache-invalidation-timing'
DISC = '/api/v1/recruitment/candidates'      # needs CANDIDATE:VIEW, EMPLOYEE role lacks it
st, t = h.call('tenant_admin', 'POST', '/api/v1/roles', {'code': 'NUAURA_TEST_ROLE_RBAC', 'name': 'NUAURA_TEST_ROLE_RBAC', 'description': 'NUAURA_TEST synthetic', 'permissionCodes': ['NOTIFICATION:VIEW']}, test=T, max_body=200)
rid = (h.js(t) or {}).get('id'); note(T, 'create NUAURA_TEST role via app', st, 'PASS' if rid else 'FAIL')
if rid:
    st, _ = h.call('chg_user', 'GET', DISC, test=T, max_body=60, note='baseline EMPLOYEE'); note(T, 'baseline chg_user (EMPLOYEE) on ' + DISC, st, 'PASS' if st == 403 else 'FAIL')
    sql(f"insert into user_roles (user_id, role_id, tenant_id, is_deleted) values ('{chg}','{rid}','{N}',false)")   # app path 500s (DEF-HRMS-02)
    s1, st = poll('chg_user', DISC, lambda s: s == 403, 3, 1)
    st, _ = h.call('chg_user', 'GET', DISC, test=T, max_body=60); note(T, 'after SQL role assignment (no CANDIDATE:VIEW yet)', st, 'INFO')
    st, t = h.call('tenant_admin', 'PUT', f'/api/v1/roles/{rid}/permissions', {'permissionCodes': ['NOTIFICATION:VIEW', 'CANDIDATE:VIEW']}, test=T, max_body=100)
    note(T, 'grant CANDIDATE:VIEW to role via app (PUT role permissions)', st, 'INFO')
    secs, st = poll('chg_user', DISC, lambda s: s not in (401, 403), 330)
    note(T, 'time until existing session sees GRANTED permission (app path)', st, 'PASS' if secs is not None and secs <= 10 else 'FINDING-STALE', f'{secs}s' if secs is not None else '>330s')
    st, t = h.call('tenant_admin', 'PUT', f'/api/v1/roles/{rid}/permissions', {'permissionCodes': ['NOTIFICATION:VIEW']}, test=T, max_body=100)
    note(T, 'revoke CANDIDATE:VIEW from role via app', st, 'INFO')
    secs, st = poll('chg_user', DISC, lambda s: s == 403, 330)
    note(T, 'time until existing session LOSES revoked permission (app path)', st, 'PASS' if secs is not None and secs <= 10 else 'FINDING-STALE', f'{secs}s' if secs is not None else '>330s')
    st, t = h.call('tenant_admin', 'PUT', f'/api/v1/roles/{rid}/permissions', {'permissionCodes': ['NOTIFICATION:VIEW', 'CANDIDATE:VIEW']}, test=T, max_body=100)
    secs, st = poll('chg_user', DISC, lambda s: s not in (401, 403), 330)
    sql(f"delete from user_roles where user_id='{chg}' and role_id='{rid}'")    # direct DB revoke: does the app notice?
    t0 = time.time(); secs2, st = poll('chg_user', DISC, lambda s: s == 403, 330)
    note(T, 'time until session loses access after membership removed directly in DB (non-app path, informational)', st, 'INFO', f'{secs2}s' if secs2 is not None else '>330s')
    sql(f"delete from role_permissions where role_id='{rid}'; delete from roles where id='{rid}'")
# ---- C. logout
T = 'NU-SEC-RBAC-220-logout-token-revocation'
ck = dict(h.session('chg_user'))
st, _ = h.call('chg_user', 'GET', '/api/v1/auth/me', test=T, max_body=60, note='before logout'); note(T, 'auth/me before logout', st, 'INFO')
st, _ = h.call('chg_user', 'POST', '/api/v1/auth/logout', {}, test=T, max_body=60); note(T, 'POST /auth/logout', st, 'INFO')
for ckname in [k for k in ck if 'access' in k]:
    st, _ = h.call(None, 'GET', '/api/v1/auth/me', cookies={ckname: ck[ckname]}, test=T, max_body=60, note='replay old ' + ckname)
    note(T, f'replay old access token ({ckname}) after logout: /auth/me', st, 'PASS' if st == 401 else 'FAIL')
    st, _ = h.call(None, 'GET', '/api/v1/employees/me', cookies={ckname: ck[ckname]}, test=T, max_body=60)
    note(T, f'replay old access token ({ckname}) after logout: /employees/me', st, 'PASS' if st == 401 else 'FAIL')
    st, _ = h.call(None, 'GET', '/api/v1/auth/me', headers={'Authorization': 'Bearer ' + ck[ckname]}, cookies=None, test=T, max_body=60)
    note(T, f'replay old access token ({ckname}) as Bearer after logout', st, 'PASS' if st == 401 else 'FAIL')
for ckname in [k for k in ck if 'refresh' in k]:
    st, _ = h.call(None, 'POST', '/api/v1/auth/refresh', {}, cookies={ckname: ck[ckname]}, test=T, max_body=80)
    note(T, f'replay old refresh token ({ckname}) after logout', st, 'PASS' if st in (400, 401, 403) else 'FAIL')
# ---- D. deactivated user
T = 'NU-SEC-RBAC-230-deactivated-user'
st, _ = h.call('payroll_admin', 'GET', '/api/v1/auth/me', test=T, max_body=60); note(T, 'payroll_admin test user before deactivation', st, 'INFO')
sql("update users set status='INACTIVE' where email='nuaura_test_rbac_payadmin@nulogic.io'")
secs, st = poll('payroll_admin', '/api/v1/payroll/payslips', lambda s: s in (401, 403) and True, 330)
st2, _ = h.call('payroll_admin', 'GET', '/api/v1/auth/me', test=T, max_body=60)
note(T, 'time until existing token rejected after status=INACTIVE (DB change; informational)', st2, 'PASS' if secs is not None and secs <= 60 else 'FINDING-STALE', f'{secs}s status={st}' if secs is not None else '>330s')
sql("update users set status='ACTIVE' where email='nuaura_test_rbac_payadmin@nulogic.io'")
json.dump(res, open(os.environ.get('OUT', '/tmp/rbac-dyn.json'), 'w'), indent=1)
