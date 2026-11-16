import sys,json,os,subprocess; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
D=os.environ["NUAURA_JAR_DIR"]; ids=json.load(open(D+"/emps.json")); inv={v:k for k,v in ids.items()}
fin=nuapi.get('finance@nulogic.io'); ad=nuapi.get('admin@nulogic.io'); A=nuapi.get('nuaura_test_pay_a@nulogic.io'); sm=nuapi.get('sumit@nulogic.io')
def s(r): return str(r)[:160] if not isinstance(r,dict) else {k:r.get(k) for k in('id','status','message','emiAmount','outstandingAmount','totalAmount','loanNumber')}
print('## NU-KEKA-004 loan EMI via payroll')
code,l=A.call('POST','/api/v1/loans',{'loanType':'PERSONAL_LOAN','principalAmount':120000,'interestRate':12,'tenureMonths':12,'purpose':'NUAURA_TEST','isSalaryDeduction':True}); print(' create',code,s(l))
lid=l.get('id')
if lid:
    print(' approve',*[ (lambda c,r:(c,s(r)))(*sm.call('POST',f'/api/v1/loans/{lid}/approve',{'approvedAmount':120000})) ])
    print(' disburse',*(lambda c,r:(c,s(r)))(*ad.call('POST',f'/api/v1/loans/{lid}/disburse')))
    print(' activate',*(lambda c,r:(c,s(r)))(*ad.call('POST',f'/api/v1/loans/{lid}/activate')))
    json.dump({'loan':lid},open(D+'/loan.json','w'))
print('## leaver: E -> RESIGNED, exit 2026-05-15')
print(' ',ad.call('PUT',f"/api/v1/employees/{ids['E']}/admin",{'status':'RESIGNED'})[0])
print('## May run')
code,r=fin.call('POST','/api/v1/payroll/runs',{'payPeriodYear':2026,'payPeriodMonth':5,'payrollDate':'2026-05-31','remarks':'NUAURA_TEST May'}); print(' create',code); rid=r.get('id')
runs=json.load(open(D+'/runs.json')); runs['2026-05']=rid; json.dump(runs,open(D+'/runs.json','w'))
code,r=fin.call('POST','/api/v1/payroll/runs/bulk/process',{'employeeIds':[ids[k] for k in 'ACEF'],'payrollPeriodStart':'2026-05-01','payrollPeriodEnd':'2026-05-31','paymentDate':'2026-05-31'})
print(' bulk',code,{k:v for k,v in r.items() if k!='results'}); [print('  ',inv.get(i['employeeId']),i['status'],i.get('message')) for i in r.get('results',[])]
if lid: print(' loan after run',*(lambda c,r:(c,s(r)))(*ad.call('GET',f'/api/v1/loans/{lid}')))
