const L=require('./lib.cjs');const {execSync}=require('child_process');
(async()=>{const b=await L.chromium.launch();const a=await L.newCtx(b,'hradmin');
const id=execSync(`${__dirname}/db.sh "select id from departments where code='NUAURA_TEST_D1'"`).toString().trim().split('\n')[1];
let r=await L.api(a,'DELETE','/api/v1/departments/'+id);console.log(r.status,JSON.stringify(r.body).slice(0,200));
await a.unrouteAll({behavior:'ignoreErrors'});await b.close()})()
