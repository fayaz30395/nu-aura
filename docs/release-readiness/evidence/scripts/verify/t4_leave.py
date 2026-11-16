import json,os,nuapi,time
D=os.environ["NUAURA_JAR_DIR"]; v=json.load(open(D+'/vfy.json'))
LOP='787423ec-748b-4816-a990-401987e22b61'
K=nuapi.get('nuaura_test_vfy_k@nulogic.io'); L=nuapi.get('nuaura_test_vfy_l@nulogic.io'); sm=nuapi.get('sumit@nulogic.io')
code,r=K.call('POST','/api/v1/leave-requests',{'employeeId':v['K'],'leaveTypeId':LOP,'startDate':'2026-07-06','endDate':'2026-07-08','reason':'NUAURA_TEST unpaid 3d'})
print('K create LOP 3d',code,(r.get('id'),r.get('totalDays'),r.get('status')) if code<300 else str(r)[:300]); lid=r.get('id')
code,r=sm.call('POST',f'/api/v1/leave-requests/{lid}/approve',{'comments':'NUAURA_TEST'}); print('manager approve',code,(r.get('status') if code<300 else str(r)[:300]))
v['lop']=lid
# rejection by manager: need another leave type
code,lt=L.call('GET','/api/v1/leave-types'); 
types=lt if isinstance(lt,list) else (lt.get('content') if isinstance(lt,dict) else [])
print('leave types',code,[ (t.get('code'),t.get('id')) for t in types][:8])
json.dump(v,open(D+'/vfy.json','w'))
