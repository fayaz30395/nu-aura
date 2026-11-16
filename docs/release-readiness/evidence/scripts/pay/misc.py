import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
D=os.environ["NUAURA_JAR_DIR"]; ids=json.load(open(D+"/emps.json")); runs=json.load(open(D+'/runs.json')); rid=runs['2026-04']
fin=nuapi.get('finance@nulogic.io'); ad=nuapi.get('admin@nulogic.io'); P='/api/v1/payroll'
def m(r): return (r.get('message') or r.get('status') or r.get('error')) if isinstance(r,dict) else str(r)[:80]
print('## lock run 2026-04'); c,r=fin.call('POST',f'{P}/runs/{rid}/lock'); print(' lock',c,r.get('status') if c<300 else m(r)); c,r=fin.call('POST',f'{P}/runs/{rid}/lock'); print(' lock again',c,m(r))
c,r=fin.call('POST',f'{P}/payslips',{'payrollRunId':rid,'employeeId':ids['C'],'payPeriodMonth':4,'payPeriodYear':2026,'payDate':'2026-04-30','basicSalary':1}); print(' create payslip in locked run',c,m(r))
print('## probes for missing features (expect 404/405)')
for p in (f'{P}/runs/{rid}/bank-advice',f'{P}/runs/{rid}/bank-file',f'{P}/runs/{rid}/payment-file',f'{P}/runs/{rid}/export',f'{P}/arrears','/api/v1/payroll/adjustments','/api/v1/payroll/runs/'+rid+'/summary','/api/v1/payroll/runs/'+rid+'/register'):
    c,b,ct=fin.call('GET',p,raw=True); print(f' GET {p.replace(rid,"<run>")} -> {c} {b[:70].decode("utf8","replace") if c!=200 else "(200 body)"}')
print('## statutory filings 2026-04 as finance / admin')
for who,cl in (('finance',fin),('admin',ad)):
    for t in ('PF_ECR','ESI_RETURN','PT_CHALLAN','FORM_24Q','LWF_RETURN','FORM_16'):
        c,r=cl.call('POST','/api/v1/payroll/statutory-filings/generate',{'filingType':t,'month':4,'year':2026,'remarks':'NUAURA_TEST'})
        print(f' {who} {t} -> {c}',{k:r.get(k) for k in('id','status','recordCount','totalAmount','errorMessage')} if c<300 and isinstance(r,dict) else m(r))
        if c<300 and isinstance(r,dict) and t=='PF_ECR' and who=='finance':
            cc,b,ct=cl.call('GET',f'/api/v1/payroll/statutory-filings/{r["id"]}/download',raw=True); print('   PF_ECR download',cc,len(b),'bytes; lines:'); print('\n'.join('     '+x[:110] for x in b.decode('utf8','replace').splitlines()[:6]))
