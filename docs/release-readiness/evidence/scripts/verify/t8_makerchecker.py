import json,os,nuapi
D=os.environ["NUAURA_JAR_DIR"]; v=json.load(open(D+'/vfy.json')); rid=v['run']; P=f'/api/v1/payroll/runs/{rid}'
fin=nuapi.get('finance@nulogic.io')
def show(c,l,p):
    code,r=c.call('POST',p); print(l,code,(r.get('status'),'processedBy' in r) if isinstance(r,dict) and code<300 else (str(r.get('message') if isinstance(r,dict) else r)[:160]))
    return code
print('run status before:',fin.call('GET',P)[1].get('status'))
show(fin,'finance (processor) approve #1',P+'/approve'); show(fin,'finance (processor) approve #2',P+'/approve')
print('run status after self-approve attempts:',fin.call('GET',P)[1].get('status'))
for em in ('tenant.admin@nulogic.io','admin@nulogic.io'):
    c=nuapi.get(em); code=show(c,f'{em} approve',P+'/approve')
    if code<300: break
print('run status final:',fin.call('GET',P)[1].get('status'))
