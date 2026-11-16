import json,os,nuapi,time
SID='a437ab8f-28cf-4ba2-8f5d-c4569e308f8b'; W='/api/v1/knowledge/wiki/pages'
doc=lambda t:json.dumps({'type':'doc','content':[{'type':'paragraph','content':[{'type':'text','text':t}]}]})
c=nuapi.get('admin@nulogic.io'); st=int(time.time()*1000)
code,p=c.call('POST',W,{'spaceId':SID,'title':'NUAURA_TEST_VFY_wikiB','slug':f'nuaura-vfy-wikib-{st}','content':doc('x'),'visibility':'ORGANIZATION','status':'DRAFT'}); pid=p['id']
code,ch=c.call('POST',W,{'spaceId':SID,'parentPageId':pid,'title':'NUAURA_TEST_VFY_child','slug':f'nuaura-vfy-child-{st}','content':doc('x'),'visibility':'ORGANIZATION','status':'DRAFT'}); print('child create',code)
print('GET child by id (has lazy parent)',c.call('GET',f'{W}/{ch["id"]}')[0] if code<300 else '-')
print('PUT update',c.call('PUT',f'{W}/{pid}',{'title':'NUAURA_TEST_VFY_wikiB2','content':doc('y')})[0])
print('children',c.call('GET',f'{W}/{pid}/children')[0],' root',c.call('GET',f'{W}/space/{SID}/root')[0],' tree',c.call('GET',f'{W}/space/{SID}/tree')[0],' related',c.call('GET',f'{W}/{pid}/related')[0],' versions',c.call('GET',f'{W}/{pid}/versions')[0],' breadcrumbs',c.call('GET',f'{W}/{ch["id"]}/breadcrumbs')[0])
print('publish',c.call('POST',f'{W}/{pid}/publish')[0])
print('search',c.call('GET',f'{W}/search?query=NUAURA_TEST_VFY')[0])
