const L=require('./lib.cjs');(async()=>{for(const e of process.argv.slice(2)){console.log(e,await L.apiLogin(e));await new Promise(r=>setTimeout(r,13000));}
 for(const e of ['jagadeesh','arun',...process.argv.slice(2).map(x=>x.split('@')[0])]){const r=await L.api(e+'@nulogic.io','GET','/api/v1/auth/me');console.log(e,r.status,JSON.stringify(r.body).slice(0,200))}})()
