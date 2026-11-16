import json,os,nuapi,sys
D=os.environ["NUAURA_JAR_DIR"]; PW=os.environ["NUAURA_TEST_PW"]
SUMIT='48000000-e001-0000-0000-000000000001'
ad=nuapi.get('admin@nulogic.io'); fin=nuapi.get('finance@nulogic.io')
out=json.load(open(D+'/vfy.json')) if os.path.exists(D+'/vfy.json') else {}
def mk(key,join,ifsc=None):
    b={'employeeCode':f'NUAURA_TEST_VFY_{key}','firstName':f'NUAURA_TEST_Vfy{key}','lastName':'Tester','workEmail':f'nuaura_test_vfy_{key.lower()}@nulogic.io','joiningDate':join,'designation':'NUAURA_TEST Analyst','employmentType':'FULL_TIME','password':PW,'state':'Karnataka','country':'India','gender':'MALE','bankAccountNumber':'0000000009'+key,'bankName':'NUAURA_TEST Bank','managerId':SUMIT}
    if ifsc: b['bankIfscCode']=ifsc
    code,r=ad.call('POST','/api/v1/employees',b); print(key,'create',code,(r.get('id') if code<300 else str(r)[:300])); return r.get('id') if code<300 else None
for k,j,i in (('J','2026-07-16','HDFC0001234'),('K','2026-01-01',None),('L','2026-01-01',None)):
    if k not in out:
        e=mk(k,j,i)
        if e: out[k]=e
json.dump(out,open(D+'/vfy.json','w'))
ss=out.get('ss',{})
for k,eff in (('J','2026-07-16'),('K','2026-01-01'),('L','2026-01-01')):
    if k in out and k not in ss:
        code,r=fin.call('POST','/api/v1/payroll/salary-structures',dict(employeeId=out[k],effectiveDate=eff,isActive=True,basicSalary=30000,hra=12000,conveyanceAllowance=1600,medicalAllowance=1250,specialAllowance=5150,providentFund=1800,professionalTax=200,incomeTax=0,otherDeductions=0))
        print(k,'ss',code,(r.get('id') if code<300 else str(r)[:200]))
        if code<300: ss[k]=r['id']
out['ss']=ss; json.dump(out,open(D+'/vfy.json','w')); print(json.dumps({k:v for k,v in out.items()}))
