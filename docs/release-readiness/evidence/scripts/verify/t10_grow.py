import json,os,nuapi,time
sm=nuapi.get('sumit@nulogic.io'); hr=nuapi.get('jagadeesh@nulogic.io')
O='/api/v1/okr'
print('## OKR key result create, 2 repros (as HR_MANAGER jagadeesh, as in original repro)')
for n in (1,2):
    code,o=hr.call('POST',f'{O}/objectives',{'title':f'NUAURA_TEST_VFY_OKR_{n}_{int(time.time())}','startDate':'2026-11-01','endDate':'2026-12-31','objectiveLevel':'INDIVIDUAL'})
    print(f' objective#{n}',code,(o.get('id') if code<300 else str(o)[:200]))
    if code>=300: continue
    code,k=hr.call('POST',f'{O}/objectives/{o["id"]}/key-results',{'title':f'NUAURA_TEST_VFY_KR_{n}','measurementType':'NUMBER','startValue':0,'targetValue':100,'weight':100})
    print(f' key result#{n}',code,(k.get('id') if code<300 else str(k)[:300]))
    if code<300:
        c2,g=hr.call('GET',f'{O}/objectives/{o["id"]}/key-results'); print(f'  GET key-results',c2,len(g) if isinstance(g,list) else str(g)[:100])
print('## manager vs non-report review (sumit = EMP-0002; report EMP-0010)')
RV='/api/v1/reviews'
for n in (1,2):
    print(f' sumit GET review of non-report (employee EMP-0009) #{n}:',sm.call('GET',f'{RV}/2858d72c-5274-4b00-96a5-0ce16354ec97')[0],'(expect 403/404)')
print(' sumit GET competencies of non-report review:',sm.call('GET',f'{RV}/2858d72c-5274-4b00-96a5-0ce16354ec97/competencies')[0],'(expect 403/404)')
print(' sumit GET non-report review EMP-0011 (reports to EMP-0009):',sm.call('GET',f'{RV}/5e330741-c95d-430c-b128-400fff0b9f51')[0],'(expect 403/404)')
print(' sumit GET report review as assigned reviewer (control):',sm.call('GET',f'{RV}/a3c6d768-98fe-40b3-ba36-3b0495d04f6e')[0],'(expect 200)')
