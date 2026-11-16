import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
D=os.environ["NUAURA_JAR_DIR"]; ids=json.load(open(D+"/emps.json"))
c=nuapi.Client('admin@nulogic.io')
code,e=c.call('GET',f"/api/v1/employees/{ids['B']}"); print(code, {k:e.get(k) for k in ('firstName','managerId','designation')})
code,r=c.call('PUT',f"/api/v1/employees/{ids['B']}",{'firstName':e['firstName'],'lastName':e.get('lastName'),'designation':e['designation'],'employmentType':e.get('employmentType','FULL_TIME'),'joiningDate':e['joiningDate'],'managerId':'48000000-e001-0000-0000-000000000001'})
print(code,str(r)[:300])
