import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
D=os.environ["NUAURA_JAR_DIR"]; ids=json.load(open(D+"/emps.json"))
ad=nuapi.get('admin@nulogic.io'); A=nuapi.get('nuaura_test_pay_a@nulogic.io'); sm=nuapi.get('sumit@nulogic.io')
PR='48000000-0e03-0000-0000-000000000001'; P='/api/v1/project-timesheets'
def s(c,r): return (c, (r.get('message') or r.get('status') or r.get('id')) if isinstance(r,dict) else str(r)[:100])

code,e=A.call('POST',P+'/entries',{'projectId':PR,'employeeId':ids['A'],'workDate':'2026-10-08','hoursWorked':6,'description':'NUAURA_TEST','isBillable':True}); print('A create entry',s(code,e)); eid=e.get('id')
if eid:
    print('A submit',s(*A.call('PATCH',f'{P}/entries/{eid}/submit')))
    print('A edit while SUBMITTED',s(*A.call('PUT',f'{P}/entries/{eid}',{'projectId':PR,'employeeId':ids['A'],'workDate':'2026-10-08','hoursWorked':9,'description':'x'})))
    print('A delete while SUBMITTED',s(*A.call('DELETE',f'{P}/entries/{eid}')))
    print('A self-approve',s(*A.call('PATCH',f'{P}/entries/{eid}/approve')))
    print('manager approve',s(*sm.call('PATCH',f'{P}/entries/{eid}/approve')))
    print('A edit after APPROVED',s(*A.call('PUT',f'{P}/entries/{eid}',{'projectId':PR,'employeeId':ids['A'],'workDate':'2026-10-08','hoursWorked':9,'description':'x'})))
    print('A delete after APPROVED',s(*A.call('DELETE',f'{P}/entries/{eid}')))
    print('A NEW entry in same (approved) period 2026-10-09',s(*A.call('POST',P+'/entries',{'projectId':PR,'employeeId':ids['A'],'workDate':'2026-10-09','hoursWorked':4,'description':'NUAURA_TEST late','isBillable':True})))
    print('A NEW entry in period before join/old 2025-01-02',s(*A.call('POST',P+'/entries',{'projectId':PR,'employeeId':ids['A'],'workDate':'2025-01-02','hoursWorked':4,'description':'NUAURA_TEST','isBillable':True})))
