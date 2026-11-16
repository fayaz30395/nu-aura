import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
D=os.environ["NUAURA_JAR_DIR"]; ids=json.load(open(D+"/emps.json"))
c=nuapi.Client('admin@nulogic.io')
uid={}
for k,e in ids.items():
    code,r=c.call('GET',f'/api/v1/employees/{e}'); uid[k]=r['userId']
json.dump(uid,open(D+'/uids.json','w'))
for k,u in uid.items():
    code,r=c.call('PUT',f'/api/v1/users/{u}/roles',{'roleCodes':['EMPLOYEE']}); print(k,code,str(r)[:120])
    if code==403: break
