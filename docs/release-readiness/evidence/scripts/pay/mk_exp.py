import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
a=nuapi.Client('nuaura_test_pay_a@nulogic.io')
code,r=a.call('POST','/api/v1/expenses',{'claimDate':'2026-05-05','category':sys.argv[1],'description':'NUAURA_TEST expense','amount':750,'currency':'INR'})
print('create',code,str(r)[:200]); cid=r.get('id') if code<300 else None
if cid:
    code,r=a.call('POST',f'/api/v1/expenses/{cid}/submit'); print('submit',code,str(r)[:160])
    ad=nuapi.Client('admin@nulogic.io')
    code,r=ad.call('POST',f'/api/v1/expenses/{cid}/approve',{'comments':'NUAURA_TEST'}); print('approve',code,str(r)[:200])
