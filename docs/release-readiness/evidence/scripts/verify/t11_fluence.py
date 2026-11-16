import json,os,nuapi,time
SID='a437ab8f-28cf-4ba2-8f5d-c4569e308f8b'; K='/api/v1/knowledge'
doc=lambda t:json.dumps({'type':'doc','content':[{'type':'paragraph','content':[{'type':'text','text':t}]}]})
who=os.environ.get('WHO','jagadeesh@nulogic.io')
c=nuapi.get(who)
print('user',who)
for n in (1,2):
    st=int(time.time()*1000)
    code,w=c.call('POST',f'{K}/wiki/pages',{'spaceId':SID,'title':f'NUAURA_TEST_VFY_wiki_{n}','slug':f'nuaura-vfy-wiki-{st}','content':doc('x'),'visibility':'ORGANIZATION','status':'DRAFT'})
    print(f' wiki POST#{n}',code,(w.get('id') if code<300 else str(w)[:250]))
    if code<300:
        g,b=c.call('GET',f'{K}/wiki/pages/{w["id"]}'); print(f'   GET by id',g,(b.get('title') if g<300 else str(b)[:200]))
    code,bl=c.call('POST',f'{K}/blogs',{'title':f'NUAURA_TEST_VFY_blog_{n}','slug':f'nuaura-vfy-blog-{st}','content':doc('x'),'visibility':'ORGANIZATION','status':'DRAFT'})
    print(f' blog POST#{n}',code,(bl.get('id') if code<300 else str(bl)[:250]))
    if code<300:
        g,b=c.call('GET',f'{K}/blogs/{bl["id"]}'); print(f'   GET by id',g,(b.get('title') if g<300 else str(b)[:200]))
    code,t=c.call('POST',f'{K}/templates',{'name':f'NUAURA_TEST_VFY_tpl_{n}','slug':f'nuaura-vfy-tpl-{st}','category':'GENERAL','content':doc('x')})
    print(f' template POST#{n}',code,(t.get('id') if code<300 else str(t)[:250]))
    if code<300:
        g,b=c.call('GET',f'{K}/templates/{t["id"]}'); print(f'   GET by id',g,(b.get('name') if g<300 else str(b)[:200]))
    code,l=c.call('GET',f'{K}/wiki/pages?size=5'); print(f' wiki list#{n}',code,(l.get('totalElements') if isinstance(l,dict) else str(l)[:200]))
    code,l=c.call('GET',f'{K}/blogs?size=5'); print(f' blog list#{n}',code)
    code,l=c.call('GET',f'{K}/templates?size=5'); print(f' template list#{n}',code)
