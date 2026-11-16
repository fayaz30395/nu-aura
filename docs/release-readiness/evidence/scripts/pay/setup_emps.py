import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi, mkemp
OUT=os.environ["NUAURA_JAR_DIR"]+"/emps.json"
ids=json.load(open(OUT)) if os.path.exists(OUT) else {}
c=nuapi.Client('admin@nulogic.io')
spec={'A':('2026-01-01','Karnataka','MALE'),'B':('2026-01-01','Karnataka','FEMALE'),'C':('2026-04-16','Karnataka','MALE'),
      'D':('2026-01-01','Maharashtra','FEMALE'),'E':('2026-01-01','Karnataka','MALE'),'F':('2026-01-01','Tamil Nadu','MALE')}
for k,(j,st,g) in spec.items():
    if k in ids: continue
    code,b=mkemp.mk(c,k,'x',j,st,g); print(k,code,b if code>=300 else 'ok')
    if code<300: ids[k]=b
json.dump(ids,open(OUT,'w')); print(ids)
