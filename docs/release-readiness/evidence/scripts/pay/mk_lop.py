import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
D=os.environ["NUAURA_JAR_DIR"]; ids=json.load(open(D+"/emps.json"))
c=nuapi.get('nuaura_test_pay_b@nulogic.io')
LOP='787423ec-748b-4816-a990-401987e22b61'
code,r=c.call('POST','/api/v1/leave-requests',{'employeeId':ids['B'],'leaveTypeId':LOP,'startDate':'2026-04-20','endDate':'2026-04-20','reason':'NUAURA_TEST LOP leave'})
print('create',code,str(r)[:300])
if code<300:
    lid=r['id']; json.dump({'lop':lid},open(D+'/lop.json','w'))
    m=nuapi.Client('sumit@nulogic.io')
    code,r=m.call('POST',f'/api/v1/leave-requests/{lid}/approve',{'comments':'NUAURA_TEST'})
    print('approve',code,str(r)[:300])
