import nuapi
ad=nuapi.get('admin@nulogic.io')
U={'J':'df3e5255-d10e-47f1-940c-0843ac25d40c','K':'d84b1e4d-d9b1-46ac-ab6c-390916c05d7c','L':'864261c8-cfb7-4368-9aec-cf10d253c333'}
for k,u in U.items():
    code,r=ad.call('PUT',f'/api/v1/users/{u}/roles',{'roleCodes':['EMPLOYEE']}); print(k,'assign EMPLOYEE',code,(str(r)[:200] if code>=300 else 'ok roles='+str([x if isinstance(x,str) else x.get('code') for x in (r.get('roles') or [])])))
code,r=ad.call('PUT',f'/api/v1/users/{U["K"]}/roles',{'roleCodes':['EMPLOYEE']}); print('K repeat (repro 2)',code)
