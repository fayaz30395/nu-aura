const L = require('./lib.cjs');
(async () => {
  const b = await L.chromium.launch();
  for (const e of process.argv.slice(2)) { try { const f = await L.loginUI(b, e); console.log('ok', e); } catch (x) { console.log('FAIL', e, x.message.slice(0,200)); } await new Promise(r=>setTimeout(r,14000)); }
  await b.close();
})();
