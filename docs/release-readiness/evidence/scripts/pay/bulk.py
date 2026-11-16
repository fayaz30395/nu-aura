import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
D=os.environ["NUAURA_JAR_DIR"]; ids=json.load(open(D+"/emps.json")); inv={v:k for k,v in ids.items()}
c=nuapi.Client('finance@nulogic.io')
ym=sys.argv[1]; keys=sys.argv[2]; y,m=map(int,ym.split('-'))
import calendar; last=calendar.monthrange(y,m)[1]
code,r=c.call('POST','/api/v1/payroll/runs/bulk/process',{'employeeIds':[ids[k] for k in keys],'payrollPeriodStart':f'{y}-{m:02d}-01','payrollPeriodEnd':f'{y}-{m:02d}-{last}','paymentDate':f'{y}-{m:02d}-{last}'})
print(code, {k:v for k,v in r.items() if k!='results'} if isinstance(r,dict) else r)
for i in (r.get('results') or []): print(inv.get(i['employeeId']), i['status'], i.get('message'))
