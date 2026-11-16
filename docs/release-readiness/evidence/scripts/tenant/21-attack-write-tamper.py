#!/usr/bin/env python3
"""NU-SEC-TENANT-102..106: cross-tenant writes, tenant-id tampering, JWT claim tampering, public surface, platform-admin surface.
Victim = NUAURA_TEST_Alpha. Attackers beta_sa / tenant_admin / hr_admin. DB state is verified afterwards by the caller (22-verify.sql). JARS env required."""
import sys, os, json, base64, re
sys.path.insert(0, os.path.dirname(__file__)); import h
A = 'a1fa0000-0000-4000-8000-00000000a1fa'; B = 'be7a0000-0000-4000-8000-0000000be7a0'
E1 = 'a1fa0000-0000-4000-8000-000000000a01'
PS, LR = 'a1fa0000-0000-4000-8000-000000000a21', 'a1fa0000-0000-4000-8000-000000000a11'
CAND, REV, JOB, CYC, LT = ['a1fa0000-0000-4000-8000-000000000a%02x' % i for i in (0x31, 0x41, 0x30, 0x40, 0x10)]
WPG = 'a1fa0000-0000-4000-8000-000000000a51'
BETA_SA_EMP = '123b15b2-e979-4f03-a53e-12cb9c8e691d'
OBJ = f'{A}/documents/{E1}/NUAURA_TEST_alpha-secret.txt'
AL = ['NUAURA_TEST_AlphaEmpOne', 'NUAURA_TEST_AlphaAdminEmp', 'nuaura_test_alpha', 'NUAURA_TEST_A00', 'NUAURA_TEST_LR-001', 'confidential', 'NUAURA_TEST_Secret Role', 'NUAURA_TEST_Private', 'alpha secret', '223456', '777777', A]
def leak(st, t): return 200 <= st < 300 and any(m in t for m in AL)
out = []
def rec(tid, who, m, p, st, t, expect, note=''):
    ok = (st in expect) and not leak(st, t)
    out.append((tid, who, m, p[:80], st, 'PASS' if ok else 'FAIL', note))
    return ok
ATT = ['beta_sa', 'tenant_admin', 'hr_admin']
# ---- 102 writes by ID
T = 'NU-SEC-TENANT-102-cross-tenant-writes'
W = [('PUT', f'/api/v1/employees/{E1}', {'firstName': 'NUAURA_TEST_HACKED'}),
     ('DELETE', f'/api/v1/employees/{E1}', None),
     ('PUT', f'/api/v1/payroll/payslips/{PS}', {'netSalary': 1}),
     ('DELETE', f'/api/v1/payroll/payslips/{PS}', None),
     ('POST', f'/api/v1/leave-requests/{LR}/approve', {'comments': 'x'}),
     ('POST', f'/api/v1/leave-requests/{LR}/reject', {'comments': 'x'}),
     ('PUT', f'/api/v1/recruitment/candidates/{CAND}', {'firstName': 'NUAURA_TEST_HACKED'}),
     ('PUT', f'/api/v1/recruitment/candidates/{CAND}/stage', {'stage': 'PANEL_REVIEW'}),
     ('PUT', f'/api/v1/reviews/{REV}', {'managerComments': 'NUAURA_TEST_HACKED'}),
     ('DELETE', f'/api/v1/reviews/{REV}', None),
     ('DELETE', f'/api/v1/files?objectName={OBJ}', None)]
for who in ATT:
    for m, p, b in W:
        st, t = h.call(who, m, p, b, test=T, max_body=140)
        rec(T, who, m, p, st, t, {400, 403, 404, 405, 409, 422}, 'write must be rejected (4xx)')
# ---- 102b writes referencing Alpha FKs from Beta (cross-tenant reference creation)
T2 = 'NU-SEC-TENANT-102b-cross-tenant-reference-create'
X = [('POST', '/api/v1/reviews', {'employeeId': E1, 'reviewerId': BETA_SA_EMP, 'reviewCycleId': CYC, 'reviewType': 'ANNUAL', 'status': 'DRAFT'}),
     ('POST', '/api/v1/recruitment/candidates', {'firstName': 'NUAURA_TEST_XREF', 'lastName': 'Beta', 'email': 'nuaura_test_xref@nuaura-test.example', 'jobOpeningId': JOB}),
     ('POST', '/api/v1/leave-requests', {'employeeId': E1, 'leaveTypeId': LT, 'startDate': '2026-12-10', 'endDate': '2026-12-11', 'reason': 'NUAURA_TEST_XREF'}),
     ('POST', '/api/v1/payroll/payslips', {'employeeId': E1, 'payrollRunId': 'a1fa0000-0000-4000-8000-000000000a20', 'payPeriodMonth': 11, 'payPeriodYear': 2026, 'netSalary': 1})]
for m, p, b in X:
    st, t = h.call('beta_sa', m, p, b, test=T2, max_body=200)
    rec(T2, 'beta_sa', m, p, st, t, {400, 403, 404, 409, 422, 500}, 'record status; DB check decides (22-verify.sql)')
# ---- 103 tenant-id tampering with the BETA session
T3 = 'NU-SEC-TENANT-103-tenant-id-tampering'
for hdr in ({'X-Tenant-ID': A}, {'X-Tenant-Id': A}, {'X-Tenant': A}, {'Tenant-Id': A}, {'X-Forwarded-Tenant': A}):
    st, t = h.call('beta_sa', 'GET', f'/api/v1/employees/{E1}', headers=hdr, test=T3, max_body=120, note='hdr tamper by-id')
    rec(T3, 'beta_sa', 'GET', f'/employees/{E1} {list(hdr)[0]}', st, t, {400, 403, 404}, 'header must not switch tenant')
    st, t = h.call('beta_sa', 'GET', '/api/v1/employees?size=500', headers=hdr, test=T3, max_body=120, note='hdr tamper list')
    rec(T3, 'beta_sa', 'GET', f'/employees list {list(hdr)[0]}', st, t, {200}, 'list must stay Beta-only')
for q in (f'tenantId={A}', f'tenant_id={A}', f'tenantId={A}&tenant_id={A}&tenant={A}'):
    st, t = h.call('beta_sa', 'GET', f'/api/v1/employees?size=500&{q}', test=T3, max_body=120, note='query tamper')
    rec(T3, 'beta_sa', 'GET', f'/employees?{q[:30]}', st, t, {200}, 'query param must be ignored')
    st, t = h.call('beta_sa', 'GET', f'/api/v1/employees/{E1}?{q}', test=T3, max_body=120, note='query tamper by-id')
    rec(T3, 'beta_sa', 'GET', f'/employees/{E1}?{q[:20]}', st, t, {400, 403, 404}, 'query param must be ignored')
# body tenantId on create (departments): who owns the new row? verified in DB
st, t = h.call('beta_sa', 'POST', '/api/v1/departments', {'name': 'NUAURA_TEST_BodyTenantDept', 'code': 'NUAURA_TEST_BTD', 'tenantId': A, 'tenant_id': A}, test=T3, max_body=240, note='body tenantId=Alpha on create; DB decides')
out.append((T3, 'beta_sa', 'POST', '/departments body tenantId=Alpha', st, 'SEE-DB', 'row tenant checked in 22-verify.sql'))
# combined: cookie of Beta + X-Tenant-ID Alpha on write
st, t = h.call('beta_sa', 'PUT', f'/api/v1/employees/{E1}', {'firstName': 'NUAURA_TEST_HACKED'}, headers={'X-Tenant-ID': A}, test=T3, max_body=120, note='hdr tamper write')
rec(T3, 'beta_sa', 'PUT', f'/employees/{E1} +X-Tenant-ID', st, t, {400, 403, 404}, 'must not write Alpha')
# unauthenticated + header
for p in (f'/api/v1/employees/{E1}', '/api/v1/employees', '/api/v1/payroll/payslips'):
    st, t = h.call(None, 'GET', p, headers={'X-Tenant-ID': A}, cookies=None, test=T3, max_body=100, note='anon + X-Tenant-ID')
    rec(T3, 'anon', 'GET', p + ' +X-Tenant-ID', st, t, {401, 403}, 'anon must be rejected')
# ---- 104 JWT tampering
T4 = 'NU-SEC-TENANT-104-jwt-claim-tampering'
def b64d(s): return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))
def b64e(b): return base64.urlsafe_b64encode(b).rstrip(b'=').decode()
sb, sa = h.session('beta_sa'), h.session('alpha_sa')
tok = sb.get('__Host-hrms-access') or sb.get('access_token'); atok = sa.get('access_token') or sa.get('__Host-hrms-access')
hd, pl, sg = tok.split('.'); claims = json.loads(b64d(pl))
tkeys = [k for k, v in claims.items() if v == B]
out.append((T4, 'beta_sa', '-', f'claims with tenant value: {tkeys}; claim names: {sorted(claims)}', 0, 'INFO', ''))
forged = dict(claims)
for k in tkeys: forged[k] = A
hA, pA, sA = atok.split('.')
variants = {
 'payload tenant->Alpha, orig signature': '.'.join([hd, b64e(json.dumps(forged, separators=(',', ':')).encode()), sg]),
 'alg=none, tenant->Alpha, empty sig': '.'.join([b64e(b'{"alg":"none","typ":"JWT"}'), b64e(json.dumps(forged, separators=(',', ':')).encode()), '']),
 'alg=none, tenant->Alpha, no dot': b64e(b'{"alg":"none","typ":"JWT"}') + '.' + b64e(json.dumps(forged, separators=(',', ':')).encode()) + '.',
 'Beta header+payload, Alpha-SA signature': '.'.join([hd, pl, sA]),
 'Alpha payload, Beta signature': '.'.join([hd, pA, sg]),
 'HS256->garbage signature': '.'.join([hd, b64e(json.dumps(forged, separators=(',', ':')).encode()), b64e(b'x' * 32)]),
}
for name, tk in variants.items():
    for ck in ('access_token', '__Host-hrms-access'):
        st, t = h.call('beta_sa', 'GET', f'/api/v1/employees/{E1}', cookies={ck: tk}, test=T4, max_body=100, note=name + ' via cookie ' + ck)
        rec(T4, 'beta_sa', 'GET', f'{name} [{ck}]', st, t, {401, 403}, 'forged token must be rejected')
    st, t = h.call('beta_sa', 'GET', f'/api/v1/employees/{E1}', headers={'Authorization': 'Bearer ' + tk}, cookies=None, test=T4, max_body=100, note=name + ' via Bearer')
    rec(T4, 'beta_sa', 'GET', f'{name} [Bearer]', st, t, {401, 403}, 'forged token must be rejected')
# both cookies disagree: legit Beta in one name, Alpha SA in the other (hardened-wins ordering) -> must act as exactly one tenant, never mix
st, t = h.call('beta_sa', 'GET', '/api/v1/auth/me', cookies={'__Host-hrms-access': tok, 'access_token': atok}, test=T4, max_body=300, note='two different valid tokens in two cookie names')
who = (h.js(t) or {}).get('tenantId'); out.append((T4, 'beta_sa', 'GET', '/auth/me with Beta(__Host)+Alpha(legacy) cookies -> tenant used', st, 'INFO', f'tenant={who}'))
# ---- 105 file path guard variants
T5 = 'NU-SEC-TENANT-105-file-guard-variants'
vs = [OBJ, OBJ.upper(), f'{B}/../{OBJ}', f'{B}/..%2F{OBJ}', f'{B}/%2e%2e/{OBJ}', f'/{OBJ}', f'{A}%2fdocuments/x', f'{B}/documents/../../{A}/documents/{E1}/NUAURA_TEST_alpha-secret.txt', f'{A}', OBJ + '%00.png']
for v in vs:
    for ep in ('download', 'download/direct', 'exists'):
        st, t = h.call('beta_sa', 'GET', f'/api/v1/files/{ep}?objectName=' + v.replace(' ', '%20'), test=T5, max_body=100)
        rec(T5, 'beta_sa', 'GET', f'files/{ep}?objectName={v[:58]}', st, t, {400, 403, 404}, 'guard must reject')
# ---- 106 public / platform surfaces
T6 = 'NU-SEC-TENANT-106-public-and-platform-surface'
for lab, hd_ in (('Alpha hdr', {'X-Tenant-ID': A}), ('Beta hdr', {'X-Tenant-ID': B}), ('no hdr', {})):
    st, t = h.call(None, 'GET', '/api/v1/public/careers/jobs', headers=hd_, cookies=None, test=T6, max_body=300, note='public careers ' + lab)
    out.append((T6, 'anon', 'GET', f'/public/careers/jobs [{lab}]', st, 'INFO', f"alpha-job-visible={'NUAURA_TEST_Secret Role' in t}"))
for p in ('/api/v1/admin/system/tenants', f'/api/v1/admin/system/tenants/{A}/metrics', '/api/v1/admin/system/overview', '/api/v1/tenants/register'):
    for who in ('beta_sa', 'tenant_admin', 'hr_admin', 'employee'):
        m = 'POST' if p.endswith('register') else 'GET'
        st, t = h.call(who, m, p, {} if m == 'POST' else None, test=T6, max_body=200, note='platform surface')
        out.append((T6, who, m, p, st, 'INFO', f"names-other-tenants={'NUAURA_TEST_Alpha' in t or 'NUAURA_TEST_Beta' in t}"))
for p in ('/api/v1/external/employees', '/api/v1/biometric/punch'):
    st, t = h.call(None, 'POST' if 'biometric' in p else 'GET', p, {} if 'biometric' in p else None, headers={'X-Biometric-Api-Key': 'NUAURA_TEST_bogus'} if 'biometric' in p else {}, cookies=None, test=T6, max_body=120)
    rec(T6, 'anon', 'GET/POST', p + ' bogus key', st, t, {400, 401, 403, 404}, 'bogus key must be rejected')
json.dump(out, open(os.environ.get('OUT', '/tmp/wt.json'), 'w'), indent=1)
from collections import Counter
print(Counter((o[0], o[5]) for o in out))
for o in out:
    if o[5] in ('FAIL', 'SEE-DB', 'INFO'): print(o)
