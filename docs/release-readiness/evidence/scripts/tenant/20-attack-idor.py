#!/usr/bin/env python3
"""NU-SEC-TENANT-100..: cross-tenant IDOR / list / write attacks. Victim = NUAURA_TEST_Alpha rows (fixed IDs from 03-seed-alpha-data.sql).
Attackers: beta_sa (SUPER_ADMIN of Beta, permission checks bypassed), tenant_admin + hr_admin (privileged NuLogic users).
Control: alpha_sa (owner tenant) must get 200 with the marker, proving path+payload are valid and the data is visible to its owner.
Leak = HTTP 2xx whose body contains a victim marker. Env: JARS=<dir with curl cookie jars>."""
import sys, json, os
sys.path.insert(0, os.path.dirname(__file__)); import h
A = 'a1fa0000-0000-4000-8000-00000000a1fa'
E1, E2 = 'a1fa0000-0000-4000-8000-000000000a01', 'a1fa0000-0000-4000-8000-000000000a02'
LR, PS, PR = 'a1fa0000-0000-4000-8000-000000000a11', 'a1fa0000-0000-4000-8000-000000000a21', 'a1fa0000-0000-4000-8000-000000000a20'
JOB, CAND, CYC, REV = ['a1fa0000-0000-4000-8000-000000000a%02x' % i for i in (0x30, 0x31, 0x40, 0x41)]
WSP, WPG = 'a1fa0000-0000-4000-8000-000000000a50', 'a1fa0000-0000-4000-8000-000000000a51'
OBJ = f'{A}/documents/{E1}/NUAURA_TEST_alpha-secret.txt'
MARK = ['NUAURA_TEST_AlphaEmpOne', 'NUAURA_TEST_AlphaAdminEmp', 'NUAURA_TEST_A001', 'NUAURA_TEST_A002', 'NUAURA_TEST_LR-001', 'confidential medical reason',
        'nuaura_test_cand@nuaura-test.example', 'NUAURA_TEST_Secret Role', 'confidential review comment', 'NUAURA_TEST_PrivateSpace', 'NUAURA_TEST_Private Page',
        'alpha secret wiki body', 'NUAURA_TEST_alpha-secret', '223456', '777777', '@nuaura-test.example', 'NUAURA_TEST_AlphaSA', A, 'a1fa0000-0000-4000-8000-000000000a']
ATTACKERS = ['beta_sa', 'tenant_admin', 'hr_admin']
def leak(st, txt): return 200 <= st < 300 and any(m in txt for m in MARK)
def has_mark(txt): return any(m in txt for m in MARK)
GET_ID = [
 ('employee', f'/api/v1/employees/{E1}'), ('employee-admin', f'/api/v1/employees/{E2}'),
 ('payslip', f'/api/v1/payroll/payslips/{PS}'), ('payslip-pdf', f'/api/v1/payroll/payslips/{PS}/pdf'),
 ('payslips-by-employee', f'/api/v1/payroll/payslips/employee/{E1}'), ('salary-structure', f'/api/v1/payroll/salary-structures/employee/{E1}'),
 ('leave-request', f'/api/v1/leave-requests/{LR}'), ('candidate', f'/api/v1/recruitment/candidates/{CAND}'),
 ('review', f'/api/v1/reviews/{REV}'), ('wiki-page', f'/api/v1/knowledge/wiki/pages/{WPG}'), ('wiki-page-export', f'/api/v1/knowledge/wiki/pages/{WPG}/export'),
 ('wiki-page-versions', f'/api/v1/knowledge/wiki/pages/{WPG}/versions'), ('wiki-space', f'/api/v1/knowledge/wiki/spaces/{WSP}'),
 ('wiki-space-pages', f'/api/v1/knowledge/wiki/pages/space/{WSP}'), ('wiki-space-members', f'/api/v1/knowledge/wiki/spaces/{WSP}/members'),
 ('file-download-url', f'/api/v1/files/download?objectName={OBJ}'), ('file-download-direct', f'/api/v1/files/download/direct?objectName={OBJ}'), ('file-exists', f'/api/v1/files/exists?objectName={OBJ}'),
]
LISTS = [
 ('employees-list', '/api/v1/employees?size=500'), ('employees-search', '/api/v1/employees/search?query=NUAURA_TEST_Alpha'),
 ('leave-requests-by-status', '/api/v1/leave-requests/status/PENDING?size=500'), ('leave-requests-by-employee', f'/api/v1/leave-requests/employee/{E1}'), ('candidates-list', '/api/v1/recruitment/candidates?size=500'),
 ('reviews-list', '/api/v1/reviews?size=500'), ('wiki-pages-list', '/api/v1/knowledge/wiki/pages?size=500'),
 ('wiki-search', '/api/v1/knowledge/wiki/pages/search?query=NUAURA_TEST_Private'), ('knowledge-search-all', '/api/v1/knowledge/search/all?query=NUAURA_TEST_Private'),
 ('payslips-list', '/api/v1/payroll/payslips?size=500'), ('users-list', '/api/v1/users?size=500'), ('roles-list', '/api/v1/roles'),
 ('audit-list', '/api/v1/audit?size=200'), ('departments-list', '/api/v1/departments'),
]
rows = []
def run(kind, tid, items, attackers, control=True):
    for name, path in items:
        for who in (['alpha_sa'] if control else []) + attackers:
            st, txt = h.call(who, 'GET', path, test=tid, note=('CONTROL(owner)' if who == 'alpha_sa' else 'ATTACK'), max_body=160)
            rows.append(dict(kind=kind, name=name, who=who, status=st, leak=leak(st, txt), control=(who == 'alpha_sa'), mark=has_mark(txt)))
run('IDOR-GET', 'NU-SEC-TENANT-100-idor-get-by-id', GET_ID, ATTACKERS)
run('LIST', 'NU-SEC-TENANT-101-list-endpoints', LISTS, ATTACKERS)
json.dump(rows, open(os.environ.get('OUT', '/tmp/idor.json'), 'w'), indent=1)
valid = {r['name'] for r in rows if r['control'] and 200 <= r['status'] < 300 and r['mark']}
for name in dict.fromkeys(r['name'] for r in rows):
    rs = {r['who']: r for r in rows if r['name'] == name}
    ctl = rs['alpha_sa']; v = name in valid
    att = ' '.join(f"{w}={rs[w]['status']}{'!LEAK' if rs[w]['leak'] else ''}" for w in ATTACKERS)
    print(f"{'VALID' if v else 'INCONCLUSIVE':12} {name:28} control={ctl['status']}/{'marker' if ctl['mark'] else 'no-marker'}  {att}")
print('LEAKS:', [(r['name'], r['who']) for r in rows if r['leak'] and not r['control']])
