import json,os,nuapi
D=os.environ["NUAURA_JAR_DIR"]; v=json.load(open(D+'/vfy.json'))
L=nuapi.get('nuaura_test_vfy_l@nulogic.io'); sm=nuapi.get('sumit@nulogic.io')
code,lt=L.call('GET','/api/v1/leave-types'); types=lt if isinstance(lt,list) else lt.get('content',[])
pass
cas=[t for t in types if (t.get('leaveCode') or t.get('code') or t.get('name'))=='CL'][0]
for n,(s,e) in enumerate((('2026-08-03','2026-08-03'),('2026-08-04','2026-08-04')),1):
    code,r=L.call('POST','/api/v1/leave-requests',{'employeeId':v['L'],'leaveTypeId':cas['id'],'startDate':s,'endDate':e,'reason':'NUAURA_TEST reject'})
    print(f'rep{n} create',code,(r.get('status') if code<300 else str(r)[:200])); lid=r.get('id')
    code,r=sm.call('POST',f'/api/v1/leave-requests/{lid}/reject',{'reason':'NUAURA_TEST reject','comments':'NUAURA_TEST'})
    print(f'rep{n} manager reject',code,(r.get('status') if isinstance(r,dict) and code<300 else str(r)[:200]))
