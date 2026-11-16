import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
ad=nuapi.get('admin@nulogic.io')
for p in ['/api/v1/statutory/pf','/api/v1/statutory/esi','/api/v1/statutory/pt','/api/v1/statutory/tds','/api/v1/statutory/contributions','/api/v1/payroll/lwf','/api/v1/exit','/api/v1/exit/settlements','/api/v1/offboarding','/api/v1/compensation/revisions','/api/v1/compensation/cycles','/api/v1/tax-declarations','/api/v1/shifts','/api/v1/shift-swaps','/api/v1/helpdesk/tickets','/api/v1/helpdesk/sla','/api/v1/biometric/devices','/api/v1/attendance/pending-regularizations','/api/v1/overtime','/api/v1/travel','/api/v1/expenses/advances','/api/v1/comp-off','/api/v1/benefits-enhanced','/api/v1/holidays','/api/v1/leave-requests/encashments','/api/v1/payroll/components','/api/v1/payroll/statutory-filings/types']:
    c,b,ct=ad.call('GET',p,raw=True); print(f'{c} {p}')
