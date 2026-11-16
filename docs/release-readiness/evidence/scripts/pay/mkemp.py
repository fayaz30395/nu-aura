import sys,json,os; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
PW=os.environ["NUAURA_TEST_PW"]
def mk(c, key, first, join, state="Karnataka", gender="MALE"):
    body={'employeeCode':f'NUAURA_TEST_PAY_{key}','firstName':f'NUAURA_TEST_Pay{key}','lastName':'Tester','workEmail':f'nuaura_test_pay_{key.lower()}@nulogic.io','joiningDate':join,'designation':'NUAURA_TEST Analyst','employmentType':'FULL_TIME','password':PW,'state':state,'country':'India','gender':gender,'bankAccountNumber':'000000000'+('%03d'%ord(key)),'bankName':'NUAURA_TEST Bank'}
    code,b=c.call('POST','/api/v1/employees',body)
    return code,(b.get('id') if isinstance(b,dict) and code<300 else b)
if __name__=="__main__":
    c=nuapi.Client('admin@nulogic.io')
    print(mk(c,sys.argv[1],'x',sys.argv[2]))
