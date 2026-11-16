const L=require('./lib.cjs');(async()=>{const id=process.argv[2];
 for(const who of ['anshuman','suresh','finance']){const r=await L.call('NU-GROW-E2E-131','%s'.replace('%s',who),'GET','/api/v1/lms/progress/'+id);console.log(who,r.status,JSON.stringify(r.body).slice(0,200))}
 const r=await L.call('NU-GROW-E2E-131','arun','GET','/api/v1/lms/progress/'+id);console.log('owner',r.status);})()
