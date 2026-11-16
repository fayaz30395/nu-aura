import {get} from './pb_lib.mjs';
const paths = ['/api/v1/auth/me', '/api/v1/self-service/dashboard', '/api/v1/notifications/unread/count', '/api/v1/leave-requests?page=0&size=20', '/api/v1/leave-balances/employee/48000000-e001-0000-0000-000000000009', '/api/v1/employees?page=0&size=20', '/api/v1/knowledge/wiki/pages?page=0&size=20&sortBy=updatedAt&sortDirection=DESC', '/api/v1/workflow/inbox/count'];
for (const r of ['employee', 'manager', 'hradmin']) for (const p of paths) { const x = await get(r, p); console.log(r.padEnd(9), x.s, Math.round(x.ms) + 'ms', 'rl=' + x.rl, p.slice(0, 60)); }
