import json,os,nuapi
D=os.environ["NUAURA_JAR_DIR"]; v=json.load(open(D+'/vfy.json'))
pids={l.split('|')[0][-1]:l.split('|')[1].strip() for l in open('/tmp/vfy_p.txt').read().splitlines()[1:] if '|' in l}
J=nuapi.get('nuaura_test_vfy_j@nulogic.io'); K=nuapi.get('nuaura_test_vfy_k@nulogic.io')
P='/api/v1/payroll/payslips'
for i in (1,2):
    code,b,ct=J.call('GET',f'{P}/{pids["J"]}/pdf',raw=True)
    print(f'J own payslip pdf run{i}: status={code} ct={ct} bytes={len(b)} startsWithPDF={b[:4]==b"%PDF"}')
    if i==1: open(D+'/J_jul.pdf','wb').write(b)
code,b,ct=J.call('GET',f'{P}/employee/{v["J"]}/period/pdf?year=2026&month=7',raw=True); print(f'J period pdf: status={code} bytes={len(b)} startsWithPDF={b[:4]==b"%PDF"}')
code,b,ct=K.call('GET',f'{P}/{pids["J"]}/pdf',raw=True); print(f'K reading J pdf (expect 403): status={code}')
