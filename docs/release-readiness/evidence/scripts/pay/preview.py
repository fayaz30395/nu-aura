import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
D=os.environ["NUAURA_JAR_DIR"]; ids=json.load(open(D+"/emps.json"))
inv={v:k for k,v in ids.items()}
c=nuapi.Client('finance@nulogic.io')
code,r=c.call('POST','/api/v1/payroll/runs/bulk/preview',{'employeeIds':list(ids.values()),'payrollPeriodStart':'2026-04-01','payrollPeriodEnd':'2026-04-30','paymentDate':'2026-04-30'})
print(code)
for i in r if isinstance(r,list) else [r]:
    print(inv.get(i.get('employeeId')), {k:i[k] for k in i if k not in('employeeId',)})
