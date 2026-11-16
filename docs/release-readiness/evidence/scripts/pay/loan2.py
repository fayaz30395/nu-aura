import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
D=os.environ["NUAURA_JAR_DIR"]; ids=json.load(open(D+"/emps.json")); lid=json.load(open(D+'/loan.json'))['loan']
def s(r): return {k:r.get(k) for k in('status','message','emiAmount','outstandingAmount')} if isinstance(r,dict) else str(r)[:100]
for who in ('finance@nulogic.io','admin@nulogic.io','jagadeesh@nulogic.io'):
    c=nuapi.get(who); code,r=c.call('POST',f'/api/v1/loans/{lid}/approve',{'approvedAmount':120000}); print(who,'approve',code,s(r))
    if code<300:
        for st in ('disburse','activate'):
            code,r=c.call('POST',f'/api/v1/loans/{lid}/{st}'); print(' ',st,code,s(r))
        break
fin=nuapi.get('finance@nulogic.io')
code,r=fin.call('POST','/api/v1/payroll/runs',{'payPeriodYear':2026,'payPeriodMonth':6,'payrollDate':'2026-06-30','remarks':'NUAURA_TEST June'}); rid=r['id']
runs=json.load(open(D+'/runs.json')); runs['2026-06']=rid; json.dump(runs,open(D+'/runs.json','w'))
code,r=fin.call('POST','/api/v1/payroll/runs/bulk/process',{'employeeIds':[ids['A']],'payrollPeriodStart':'2026-06-01','payrollPeriodEnd':'2026-06-30','paymentDate':'2026-06-30'}); print('june bulk',code,{k:v for k,v in r.items() if k!='results'})
code,r=fin.call('GET',f'/api/v1/loans/{lid}'); print('loan after June run',s(r))
