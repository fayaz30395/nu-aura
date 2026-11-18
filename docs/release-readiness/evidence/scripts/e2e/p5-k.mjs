import {session, FE} from './p5-lib.mjs';
const [TAG,vis,status,roleArg]=process.argv.slice(2); const s=await session(roleArg||'hradmin'); const {p}=s;
await s.go('/fluence/wiki/new');
await p.getByLabel('Page title').fill(`${TAG} ${vis} ${status}`);
await p.locator('.ProseMirror').click(); await p.keyboard.type(`Canary ZEBRA-${TAG}-${vis}-${status}`);
await p.getByRole('button',{name:/Organization/}).first().click(); await p.waitForTimeout(600);
await p.locator('.mantine-Drawer-content [role=combobox], .mantine-Drawer-content input[placeholder="Select a space"]').first().click();
await p.getByRole('option',{name:/NUAURA_TEST_P5_R1/}).first().click();
await p.locator('.mantine-Drawer-content [role=radiogroup] >> text=/^'+vis+'$/i').first().click();
if (status==='DRAFT') { await p.getByRole('button',{name:'Continue Editing'}).click(); await p.waitForTimeout(500); await p.getByRole('button',{name:'Save Draft'}).click(); }
else await p.getByRole('button',{name:/Publish Page/}).click();
await s.settle(3500);
console.log('->', p.url().replace(FE,''), await s.toasts());
console.log(JSON.stringify(s.errs()).slice(0,300));
await s.b.close();
