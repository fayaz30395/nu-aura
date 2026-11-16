import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
D=os.environ["NUAURA_JAR_DIR"]
c=nuapi.Client('finance@nulogic.io')
y,m,pd=int(sys.argv[1]),int(sys.argv[2]),sys.argv[3]
code,r=c.call('POST','/api/v1/payroll/runs',{'payPeriodYear':y,'payPeriodMonth':m,'payrollDate':pd,'remarks':'NUAURA_TEST run'})
print('create',code,{k:r.get(k) for k in('id','status','payPeriodYear','payPeriodMonth','payrollDate')} if code<300 else r)
if code<300:
    rid=r['id']; runs=json.load(open(D+'/runs.json')) if os.path.exists(D+'/runs.json') else {}
    runs[f'{y}-{m:02d}']=rid; json.dump(runs,open(D+'/runs.json','w'))
    if len(sys.argv)>4 and sys.argv[4]=='async':
        code,r=c.call('POST',f'/api/v1/payroll/runs/{rid}/process'); print('async process',code,str(r)[:400])
