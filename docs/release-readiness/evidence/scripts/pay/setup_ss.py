import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
D=os.environ["NUAURA_JAR_DIR"]; ids=json.load(open(D+"/emps.json"))
c=nuapi.Client('finance@nulogic.io')
def ss(k,eff,**kw):
    b=dict(employeeId=ids[k],effectiveDate=eff,isActive=True); b.update(kw)
    code,r=c.call('POST','/api/v1/payroll/salary-structures',b)
    print(k,code,(r.get('id'),r.get('basicSalary')) if code<300 else r)
    return r.get('id') if code<300 else None
out={}
out['A']=ss('A','2026-01-01',basicSalary=50000,hra=20000,conveyanceAllowance=1600,medicalAllowance=1250,specialAllowance=27150,providentFund=1800,professionalTax=200,incomeTax=5000,otherDeductions=100)
out['B']=ss('B','2026-01-01',basicSalary=30000,hra=12000,conveyanceAllowance=1600,medicalAllowance=1250,specialAllowance=5150,providentFund=1800,professionalTax=200,incomeTax=0,otherDeductions=0)
out['C']=ss('C','2026-04-16',basicSalary=20000,hra=8000,conveyanceAllowance=1600,medicalAllowance=1250,specialAllowance=4150,providentFund=1800,professionalTax=200,incomeTax=0,otherDeductions=0)
out['D']=ss('D','2026-01-01',basicSalary=125000,hra=50000,conveyanceAllowance=1600,medicalAllowance=1250,specialAllowance=172150,providentFund=1800,professionalTax=200,incomeTax=0,otherDeductions=0)
out['E']=ss('E','2026-01-01',basicSalary=10000,hra=4000,conveyanceAllowance=1600,medicalAllowance=1250,specialAllowance=3150,providentFund=1200,professionalTax=0,incomeTax=0,otherDeductions=0)
out['F']=ss('F','2026-01-01',basicSalary=12000,otherDeductions=15000)
json.dump(out,open(D+"/ss.json","w"))
# negative / zero validation probes (expect 400); use a throwaway employee id = F with isActive=false so they cannot be picked up by payroll
for name,kw in [('negative-basic',dict(basicSalary=-100)),('zero-basic',dict(basicSalary=0)),('negative-allowance',dict(basicSalary=1000,hra=-5)),('negative-PF',dict(basicSalary=1000,providentFund=-5))]:
    b=dict(employeeId=ids['F'],effectiveDate='2025-01-01',endDate='2025-01-02',isActive=False); b.update(kw)
    code,r=c.call('POST','/api/v1/payroll/salary-structures',b); print(name,code,(str(r)[:160]))
