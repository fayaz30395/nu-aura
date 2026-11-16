import json,os,nuapi,time,datetime
D=os.environ["NUAURA_JAR_DIR"]; v=json.load(open(D+'/vfy.json'))
DEPT=open('/tmp/dept.txt').read().strip()
rec=nuapi.get('suresh@nulogic.io'); sm=nuapi.get('sumit@nulogic.io')
R='/api/v1/recruitment'
j=lambda d:(d+datetime.timedelta(0)).isoformat()
today=datetime.date.today()
print('## OFFER creation (POST), repro on 2 candidates')
offers={}
for n,cid in (('1','fbe4cf32-d8cb-4a56-9ff6-90488dd519fc'),('2','cfc0dc7b-ef6f-494b-86f6-56a24681af1c')):
    code,r=rec.call('POST',f'{R}/candidates/{cid}/offer',{'offeredSalary':750000,'positionTitle':'NUAURA_TEST Engineer','joiningDate':j(today+datetime.timedelta(30)),'offerExpiryDate':j(today+datetime.timedelta(10))})
    print(f' offer#{n} candidate={cid[:8]} ->',code,(r.get('status'),r.get('currentStage')) if code<300 else str(r)[:250]); offers[n]=cid
json.dump(offers,open(D+'/offers.json','w'))
print('## interviewer vs unassigned candidate')
# job with a different hiring manager, candidate with no recruiter/interview
ts=int(time.time())%1000000
code,job=rec.call('POST',f'{R}/job-openings',{'jobTitle':f'NUAURA_TEST_VFY_Job_{ts}','departmentId':DEPT,'location':'Chennai','employmentType':'FULL_TIME','numberOfOpenings':1,'minSalary':600000,'maxSalary':900000,'status':'OPEN','priority':'MEDIUM','jobDescription':'NUAURA_TEST','hiringManagerId':'48000000-e001-0000-0000-000000000008','isActive':True})
print(' create job',code,(job.get('id') if code<300 else str(job)[:200]))
code,c=rec.call('POST',f'{R}/candidates',{'jobOpeningId':job['id'],'candidateCode':f'NUAURA_TEST_VFY_U_{ts}','firstName':'NUAURA_TEST_VFYUnassigned','lastName':'L','email':f'nuaura_test_vfyu_{ts}@example.test','phone':'9000000000','currentLocation':'Chennai'})
print(' create candidate',code,(c.get('id') if code<300 else str(c)[:200])); cid=c['id']
for n in (1,2):
    print(f' sumit (not hiring mgr / not interviewer) GET unassigned #{n}:',sm.call('GET',f'{R}/candidates/{cid}')[0],'(expect 403)')
print(' sumit GET Alpha where he is assigned interviewer (control, expect 200):',sm.call('GET',f'{R}/candidates/1761f59f-9b04-4af4-adbc-a9a33d0a5ad3')[0])
print(' sumit GET Bravo where he is hiring manager (control, expect 200):',sm.call('GET',f'{R}/candidates/3afaeb99-bf45-4071-b73a-6f345eb8383e')[0])
print(' recruiter GET unassigned (control, expect 200):',rec.call('GET',f'{R}/candidates/{cid}')[0])
