const L=require('./lib.cjs');(async()=>{
 const o=(await L.call('NU-GROW-E2E-076','jagadeesh','POST','/api/v1/okr/objectives',{title:'NUAURA_TEST_OKR_hr',startDate:'2026-11-01',endDate:'2026-12-31',objectiveLevel:'INDIVIDUAL'})).body;
 const k=await L.call('NU-GROW-E2E-076','jagadeesh','POST',`/api/v1/okr/objectives/${o.id}/key-results`,{title:'NUAURA_TEST_KRhr',measurementType:'NUMBER',startValue:0,targetValue:100,weight:100});
 console.log(o.id,k.status);
 const n=await L.call('NU-GROW-E2E-076','jagadeesh','POST','/api/v1/okr/objectives',{title:'NUAURA_TEST_OKR_hr2',startDate:'2026-11-01',endDate:'2026-12-31',objectiveLevel:'INDIVIDUAL',keyResults:[{title:'NUAURA_TEST_KRn',measurementType:'NUMBER',startValue:0,targetValue:100}]});
 console.log(n.status)})()
