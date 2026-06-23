import { chromium } from '@playwright/test';

(async()=>{
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });
  try {
    await page.goto('https://hrms-frontend-vert.vercel.app/auth/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const box = await page.locator('#login-email').evaluate(el => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        id: el.id,
        display: s.display,
        visibility: s.visibility,
        opacity: s.opacity,
        pointerEvents: s.pointerEvents,
        rect: {x:r.x,y:r.y,w:r.width,h:r.height},
      };
    }).catch((e)=>({err: e.message}));

    const ps = await page.locator('#login-password').evaluate(el => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        id: el.id,
        display: s.display,
        visibility: s.visibility,
        opacity: s.opacity,
        pointerEvents: s.pointerEvents,
        rect: {x:r.x,y:r.y,w:r.width,h:r.height},
      };
    }).catch((e)=>({err: e.message}));

    const maybe = await page.locator('button:has-text("Demo Accounts")').textContent().catch(()=>'none');
    const demo = await page.locator('button').filter({hasText: /Sign in with Email|Email and password/}).count().catch(() => 0);
    console.log('email styles', box);
    console.log('password styles', ps);
    console.log('is visible via locator', await page.locator('#login-email').isVisible());
    console.log('demo btn text', maybe, 'toggle count', demo);

    const forms = await page.locator('form').count();
    const buttons = await page.locator('button').count();
    console.log('forms', forms, 'buttons', buttons);

    for(const sel of ['#login-email','#login-password']){
      const exists = await page.locator(sel).count();
      const box2 = exists ? await page.locator(sel).boundingBox() : null;
      console.log('bbox', sel, 'exists', exists, 'bbox', box2);
    }
  } finally {
    await browser.close();
  }
})();
