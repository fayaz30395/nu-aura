const { chromium } = require('/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/node_modules/playwright');
const OUT='/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/screenshots/';
async function login(page,email,pw){
  await page.goto('http://localhost:3000/auth/login',{waitUntil:'domcontentloaded'});
  await page.locator('input[type=email],input[name=email],input[type=text]').first().fill(email);
  await page.locator('input[type=password]').first().fill(pw);
  await page.locator('button[type=submit]').first().click();
  await page.waitForURL(u=>!u.toString().includes('/auth/login'),{timeout:60000}).catch(()=>{});
  await page.waitForTimeout(2000);
}
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1440,height:900},acceptDownloads:true}); const page=await ctx.newPage();
  await ctx.route('http://backend:8080/**',r=>r.continue({url:r.request().url().replace('http://backend:8080','http://localhost:8080')}));
  const errs=[],fails=[],api=[];
  page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,160))});
  page.on('requestfailed',r=>fails.push(r.url().slice(0,120)));
  page.on('response',r=>{if(r.url().includes('/payroll/'))api.push(r.status()+' '+r.url().replace('http://localhost:8080','').slice(0,110))});
  await login(page,'finance@nulogic.io','Welcome@123');
  console.log('after login url',page.url());
  await page.goto('http://localhost:3000/payroll/runs',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(4000);
  await page.screenshot({path:OUT+'NU-PAY-071-finance-runs-ui.png',fullPage:true});
  const txt=await page.locator('body').innerText();
  console.log('runs page: Locked',/Locked/i.test(txt),'Processed',/Processed/i.test(txt),'Approved',/Approved/i.test(txt));
  console.log(txt.replace(/\s+/g,' ').slice(0,700));
  console.log('payroll API calls:\n'+api.join('\n')); console.log('console errors:',errs.slice(0,5)); console.log('failed requests:',fails.slice(0,5));
  await b.close();
})();
