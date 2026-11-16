#!/bin/bash
# Live verification for fixes-rbac-audit. Demo password comes from env DEMO_PW (never printed).
B=http://localhost:8080/api/v1; D=$(mktemp -d)
login(){ curl -s -o /dev/null -w "login $1 %{http_code}\n" -c $D/$1.jar -H 'Content-Type: application/json' -d "{\"email\":\"$1@nulogic.io\",\"password\":\"$DEMO_PW\"}" $B/auth/login; }
g(){ curl -s -o $D/out -w "%{http_code}" -b $D/$1.jar "$B$2"; }
for u in arun sumit jagadeesh tenant.admin; do login $u; done
echo "employee wiki pages: $(g arun /knowledge/wiki/pages)"
echo "employee blog posts: $(g arun /knowledge/blogs/posts)"
echo "hr_manager wiki pages: $(g jagadeesh /knowledge/wiki/pages)"
echo "manager wiki pages: $(g sumit /knowledge/wiki/pages)"
g tenant.admin "/knowledge/wiki/pages?size=5" >/dev/null
PID=$(python3 -c "import json;print(json.load(open('$D/out'))['content'][0]['id'])" 2>/dev/null)
echo "page=$PID"
echo "versions: $(g tenant.admin /knowledge/wiki/pages/$PID/versions)"
echo "PUT w/o status/visibility: $(curl -s -o $D/o2 -w '%{http_code}' -X PUT -b $D/tenant.admin.jar -H 'Content-Type: application/json' -d '{"title":"NUAURA_TEST_x"}' $B/knowledge/wiki/pages/$PID)"
g sumit "/employees?size=50" >/dev/null
EID=$(python3 -c "
import json;d=json.load(open('$D/out'));c=d.get('content',d)
print([e['id'] for e in c if e.get('email')!='sumit@nulogic.io'][0])" 2>/dev/null)
echo "manager PUT other employee: $(curl -s -o /dev/null -w '%{http_code}' -X PUT -b $D/sumit.jar -H 'Content-Type: application/json' -d '{}' $B/employees/$EID)"
echo "employee tds? payslip self-service etc: $(g arun /documents 2>/dev/null)"
