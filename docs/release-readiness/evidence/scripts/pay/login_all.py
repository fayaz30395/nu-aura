import sys,os,time; sys.path.insert(0,os.path.dirname(__file__))
import nuapi
for em in sys.argv[1:]:
    c=nuapi.Client(em)
    code,_=c.call('GET','/api/v1/auth/me')
    t=0
    while code!=200 and t<40:
        code,b=c.login()
        if code==200: break
        time.sleep(15); t+=1
    print(em,code,flush=True)
