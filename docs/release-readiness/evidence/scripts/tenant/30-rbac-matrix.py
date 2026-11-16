#!/usr/bin/env python3
"""NU-SEC-RBAC-1xx: live role x endpoint matrix. Expected verdict = does the role's DB role_permissions (NuLogic tenant) contain ANY of the
permissions the controller annotation requires (sweep.tsv from controller_sweep.py). Actual: 403/401 = denied, anything else = handler reached.
Mutating probes use random/invalid IDs and empty bodies so nothing is created/changed. Env: JARS, SWEEP (tsv), ROLEPERMS (json)."""
import sys, os, json, csv
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__)); import h
NF = '00000000-0000-4000-8000-0000000000ff'
OTHER_EMP = '48000000-e001-0000-0000-000000000013'          # deepak (EMPLOYEE) - someone else's record for arun/others
PAYSLIP, PAYEMP = '6a26aeb0-d1af-4760-aa14-2b0eb24caf5c', '6bb90b00-b046-43ac-bf75-0149be1839e2'   # NUAURA_TEST_PAY_A (payroll agent data)
ROLES = {'hr_admin': 'HR_ADMIN', 'tenant_admin': 'TENANT_ADMIN', 'hr_manager': 'HR_MANAGER', 'manager': 'MANAGER', 'team_lead': 'TEAM_LEAD', 'employee': 'EMPLOYEE',
         'recruit_admin': 'RECRUITMENT_ADMIN', 'payroll_admin': 'PAYROLL_ADMIN', 'finance_admin': 'FINANCE_ADMIN'}
SELF = [('GET', p) for p in ('/api/v1/auth/me', '/api/v1/employees/me', '/api/v1/users/me', '/api/v1/me/dsr/status', '/api/v1/admin/feature-flags/check/NUAURA_TEST',
        '/api/v1/dashboards/my', '/api/v1/attendance/my-attendance', '/api/v1/home/attendance/me', '/api/v1/notifications/my', '/api/v1/notifications/my/unread-count',
        '/api/v1/self-service/dashboard', '/api/v1/calendar/events/my', '/api/v1/loans/my', '/api/v1/lms/my-courses', '/api/v1/platform/my-context',
        '/api/v1/okr/objectives/my', '/api/v1/time-tracking/entries/my', '/api/v1/restricted-holidays/summary/me', '/api/v1/leave-requests')]
# (verb, concrete path, template-for-sweep-lookup, body, override-need)  override-need: perms that make a role allowed when handler does scope checks
SENS = [
 ('GET', '/api/v1/payroll/payslips', None, None, None),
 ('GET', f'/api/v1/payroll/payslips/{PAYSLIP}', '/api/v1/payroll/payslips/{id}', None, ['PAYROLL:VIEW_ALL']),
 ('GET', f'/api/v1/payroll/payslips/employee/{PAYEMP}', '/api/v1/payroll/payslips/employee/{employeeId}', None, ['PAYROLL:VIEW_ALL']),
 ('GET', f'/api/v1/payroll/salary-structures/employee/{PAYEMP}', '/api/v1/payroll/salary-structures/employee/{employeeId}', None, ['PAYROLL:VIEW_ALL', 'SALARY:VIEW']),
 ('POST', '/api/v1/payroll/payslips', None, {}, None), ('DELETE', f'/api/v1/payroll/payslips/{NF}', '/api/v1/payroll/payslips/{id}', None, None),
 ('GET', '/api/v1/employees', None, None, None),
 ('GET', f'/api/v1/employees/{OTHER_EMP}', '/api/v1/employees/{id}', None, ['EMPLOYEE:VIEW_ALL']),
 ('POST', '/api/v1/employees', None, {}, None), ('PUT', f'/api/v1/employees/{NF}', '/api/v1/employees/{id}', {}, None), ('DELETE', f'/api/v1/employees/{NF}', '/api/v1/employees/{id}', None, None),
 ('GET', '/api/v1/leave-requests/status/PENDING', '/api/v1/leave-requests/status/{status}', None, None), ('POST', f'/api/v1/leave-requests/{NF}/approve', '/api/v1/leave-requests/{id}/approve', {}, None),
 ('GET', '/api/v1/recruitment/candidates', None, None, None), ('POST', '/api/v1/recruitment/candidates', None, {}, None),
 ('GET', '/api/v1/reviews', None, None, None), ('GET', f'/api/v1/reviews/{NF}', '/api/v1/reviews/{id}', None, None), ('POST', '/api/v1/reviews', None, {}, None),
 ('GET', '/api/v1/audit', None, None, None), ('GET', '/api/v1/admin/system/audit-logs', None, None, None),
 ('GET', '/api/v1/roles', None, None, None), ('POST', '/api/v1/roles', None, {}, None), ('PUT', f'/api/v1/roles/{NF}/permissions', '/api/v1/roles/{id}/permissions', {}, None),
 ('PUT', f'/api/v1/users/{NF}/roles', '/api/v1/users/{id}/roles', {}, None), ('GET', '/api/v1/users', None, None, None),
 ('GET', '/api/v1/admin/system/overview', None, None, None), ('GET', '/api/v1/admin/system/tenants', None, None, None), ('GET', '/api/v1/admin/users', None, None, None),
 ('GET', '/api/v1/admin/settings', None, None, None), ('GET', '/api/v1/admin/stats', None, None, None), ('GET', '/api/v1/admin/kafka/failed-events', None, None, None),
 ('GET', '/api/v1/analytics/payroll', None, None, None), ('GET', '/api/v1/analytics/employees', None, None, None), ('GET', '/api/v1/predictive-analytics/attrition/high-risk', None, None, None),
 ('GET', '/api/v1/scheduled-reports', None, None, None), ('GET', '/api/v1/departments', None, None, None), ('POST', '/api/v1/departments', None, {}, None),
]
sweep = {}
for r in csv.DictReader(open(os.environ['SWEEP']), delimiter='\t'):
    sweep[(r['verb'], r['path'])] = [p for p in r['perms'].split(',') if p]
rp = {k: set(v) for k, v in json.load(open(os.environ['ROLEPERMS'])).items()}
def need_for(v, path, tmpl, override):
    if override: return override
    return sweep.get((v, tmpl or path), None)
def run_role(label):
    code = ROLES[label]; have = rp.get(code, set()); res = []; tid = f'NU-SEC-RBAC-1{list(ROLES).index(label)}-{label}'
    open(os.path.join(h.LOGDIR, tid + '.txt'), 'w').close()
    for kind, items in (('SELF', [(v, p, None, None, None) for v, p in SELF]), ('SENS', SENS)):
        for v, path, tmpl, body, ov in items:
            need = need_for(v, path, tmpl, ov)
            st, t = h.call(label, v, path, body, test=tid, max_body=110)
            if kind == 'SELF': exp_allow = True
            elif need is None: exp_allow = None
            else: exp_allow = (len(need) == 0) or any(n in have for n in need)
            act_allow = st not in (401, 403)
            verdict = 'UNKNOWN-REQ' if exp_allow is None else ('OK' if exp_allow == act_allow else ('OVER-PERMISSION' if act_allow else 'UNDER-PERMISSION'))
            if st == 401: verdict = 'AUTH-401'
            if st >= 500 and verdict == 'OK': verdict = 'OK-but-5xx'
            res.append(dict(role=code, kind=kind, verb=v, path=path.replace(NF, '{nf}'), need=need, status=st, exp_allow=exp_allow, verdict=verdict))
    return res
with ThreadPoolExecutor(max_workers=9) as ex: allres = [r for rs in ex.map(run_role, ROLES) for r in rs]
json.dump(allres, open(os.environ.get('OUT', '/tmp/rbac.json'), 'w'), indent=1)
from collections import Counter
print(Counter(r['verdict'] for r in allres))
for r in allres:
    if r['verdict'] not in ('OK',): print(r['role'], r['kind'], r['verb'], r['path'], r['status'], 'need=', r['need'], r['verdict'])
