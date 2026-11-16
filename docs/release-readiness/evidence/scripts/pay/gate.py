"""Release-gating + cross-employee authz probes. usage: gate.py <label> ; reads emps/ids; writes transcript to stdout.
Statuses recorded: HTTP code + short body marker. Amounts never printed."""
import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
D=os.environ["NUAURA_JAR_DIR"]; ids=json.load(open(D+"/emps.json"))
pid=json.load(open(D+"/pids.json"))   # payslip ids by key
def show(who,c,m,p,exp=None):
    code,b,ct=c.call(m,p,raw=True)
    body=b[:80].decode('utf8','replace').replace('\n',' ') if 'pdf' not in ct else f'<PDF {len(b)} bytes>'
    if code==200 and 'json' in ct:
        try:
            j=json.loads(b); n=len(j) if isinstance(j,list) else (len(j.get('content',[])) if isinstance(j,dict) and 'content' in j else 'obj'); body=f'200 json items={n}'
            if isinstance(j,dict) and 'netSalary' in j: body='200 json LEAKED payslip object'
            if isinstance(j,dict) and 'content' in j and j['content'] and 'netSalary' in j['content'][0]: body=f'200 page LEAKED {len(j["content"])} payslip(s)'
            if isinstance(j,list) and j and isinstance(j[0],dict) and 'netSalary' in j[0]: body=f'200 list LEAKED {len(j)} payslip(s)'
        except Exception: pass
    print(f'{who:10s} {m:4s} {p:78s} -> {code} {body}'+(f'   [expect {exp}]' if exp else ''))
    return code
if __name__=="__main__":
    emp=sys.argv[1]; email=sys.argv[2]
    c=nuapi.get(email)
    A,B=ids['A'],ids['B']
    base='/api/v1/payroll'
    tgt=ids[sys.argv[3]]; tp=pid[sys.argv[3]]
    show(emp,c,'GET',f'{base}/payslips/{tp}')
    show(emp,c,'GET',f'{base}/payslips/{tp}/pdf')
    show(emp,c,'GET',f'{base}/payslips/employee/{tgt}')
    show(emp,c,'GET',f'{base}/payslips/employee/{tgt}/period?year=2026&month=4')
    show(emp,c,'GET',f'{base}/payslips/employee/{tgt}/period/pdf?year=2026&month=4')
    show(emp,c,'GET',f'{base}/payslips/employee/{tgt}/year/2026')
    show(emp,c,'GET',f'{base}/payslips/employee/{tgt}/release-status?year=2026')
    show(emp,c,'GET',f'{base}/payslips')
    show(emp,c,'GET',f'{base}/payslips/run/{json.load(open(D+"/runs.json"))["2026-04"]}')
    show(emp,c,'GET',f'{base}/runs')
    show(emp,c,'GET',f'{base}/salary-structures/employee/{tgt}')
    show(emp,c,'GET',f'{base}/salary-structures')
    show(emp,c,'GET','/api/v1/payroll/statutory/preview?employeeId='+tgt+'&basicSalary=1000&grossSalary=2000')
