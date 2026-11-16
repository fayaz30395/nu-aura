import json,os,nuapi
D=os.environ["NUAURA_JAR_DIR"]; v=json.load(open(D+'/vfy.json')); inv={v[k]:k for k in 'JKL'}
fin=nuapi.get('finance@nulogic.io'); P='/api/v1/payroll'
code,r=fin.call('POST',P+'/runs',{'payPeriodYear':2026,'payPeriodMonth':7,'payrollDate':'2026-07-31','remarks':'NUAURA_TEST verify run'})
print('create run',code,(r.get('id'),r.get('status')) if code<300 else str(r)[:300])
if code>=300: raise SystemExit
v['run']=r['id']; json.dump(v,open(D+'/vfy.json','w'))
code,r=fin.call('POST',P+'/runs/bulk/process',{'employeeIds':[v['J'],v['K'],v['L']],'payrollPeriodStart':'2026-07-01','payrollPeriodEnd':'2026-07-31','paymentDate':'2026-07-31'})
print('bulk',code,{k:x for k,x in r.items() if k!='results'} if isinstance(r,dict) else r)
for i in r.get('results',[]): print(' ',inv.get(i['employeeId']),i['status'],i.get('message'))
