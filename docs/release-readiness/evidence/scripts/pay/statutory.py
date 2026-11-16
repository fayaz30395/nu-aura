import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
D=os.environ["NUAURA_JAR_DIR"]; ids=json.load(open(D+"/emps.json"))
c=nuapi.Client('finance@nulogic.io')
states={'A':'Karnataka','E':'Karnataka','D':'Maharashtra','F':'Tamil Nadu','C':'Karnataka','B':'Karnataka'}
for k in sys.argv[2:]:
    code,s=c.call('GET',f"/api/v1/payroll/payslips/employee/{ids[k]}/period?year=2026&month={sys.argv[1]}")
    pid=s['id']
    code,r=c.call('POST',f"/api/v1/payroll/statutory/{pid}/apply?state={states[k].replace(' ','%20')}")
    print(k,code,{x:r[x] for x in r if x in('employeePf','employerPf','employeeEsi','employerEsi','professionalTax','tdsMonthly','employeeLwf','totalEmployeeDeductions')} if code<300 else r)
    code,s=c.call('GET',f'/api/v1/payroll/payslips/{pid}')
    print('   payslip:',{x:s[x] for x in('grossSalary','providentFund','professionalTax','incomeTax','otherDeductions','employeeEsi','totalDeductions','netSalary')})
