// P3 runner: executes the P3 probes in order (each prints findings; see evidence/ui-bugs-p3.md).
// Re-login first if a role session expired: node p3-relogin.mjs <role> <email>
import {spawnSync} from 'child_process';
const steps = ['p3-sweep.mjs', 'p3-t2.mjs', 'p3-t6.mjs', 'p3-t9.mjs', 'p3-t10.mjs', 'p3-t11.mjs', 'p3-t12.mjs', 'p3-t13.mjs', 'p3-t14.mjs', 'p3-t16.mjs', 'p3-t17.mjs', 'p3-t18.mjs', 'p3-t19.mjs', 'p3-t21.mjs', 'p3-t23.mjs'];
for (const s of steps) { console.log('### ' + s); spawnSync('node', [new URL(s, import.meta.url).pathname], {stdio: 'inherit'}); }
