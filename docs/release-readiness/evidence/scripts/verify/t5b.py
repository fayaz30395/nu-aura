import json,os,nuapi,urllib.parse
D=os.environ["NUAURA_JAR_DIR"]; v=json.load(open(D+'/vfy.json'))
L=nuapi.get('nuaura_test_vfy_l@nulogic.io'); sm=nuapi.get('sumit@nulogic.io')
code,lt=L.call('GET','/api/v1/leave-types'); types=lt if isinstance(lt,list) else lt.get('content',[])
cl=[t for t in types if t.get('leaveCode')=='CL'][0]
for n,(s) in enumerate(('2026-08-05','2026-08-06'),1):
    code,r=L.call('POST','/api/v1/leave-requests',{'employeeId':v['L'],'leaveTypeId':cl['id'],'startDate':s,'endDate':s,'reason':'NUAURA_TEST reject'}); lid=r.get('id')
    code,r=sm.call('POST',f'/api/v1/leave-requests/{lid}/reject?reason='+urllib.parse.quote('NUAURA_TEST reject'))
    print(f'rep{n} manager reject',code,(r.get('status') if isinstance(r,dict) and code<300 else str(r)[:200]))
