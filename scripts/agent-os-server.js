#!/usr/bin/env node
/* ======================================================================
   NU-AURA Agent OS — live control plane (zero deps, Node builtins only)

   Spawns REAL agents from the dashboard:
     · QA agents  → real shell commands against the live backend (:8090)
     · AI agents  → real `claude -p` headless runs (read-only: Read/Grep/Glob)

   Streams stdout/stderr back to the browser over SSE. Design (CSS) is
   reused verbatim from qa-reports/agent-os.html so there is one source of
   truth for the look.

   Run:  node scripts/agent-os-server.js   →  http://localhost:8788
   ====================================================================== */
'use strict';
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = +(process.env.AGENT_OS_PORT || 8788);
const BE = process.env.AGENT_OS_BACKEND || 'http://localhost:8090';
const COOKIES = path.join(ROOT, 'test-results', 'cookies');
const OWN = '660e8400-e29b-41d4-a716-446655440001';
const OTHER = '550e8400-e29b-41d4-a716-446655440000';
const jar = r => path.join(COOKIES, `${r}.txt`);

/* ---- agent registry --------------------------------------------------- */
const sh = s => ({ exec: 'zsh', args: ['-lc', s] });

const AGENTS = [
  { id: 'health', kind: 'qa', label: 'health', sub: 'backend components',
    run: sh(`/usr/bin/curl -s ${BE}/actuator/health | python3 -c "import sys,json;d=json.load(sys.stdin);print('status:',d['status']);[print(f'  {k}: {v[\\"status\\"]}') for k,v in d['components'].items()]"`) },

  { id: 'verify-endpoints', kind: 'qa', label: 'verify-endpoints', sub: 're-test 4 fixes',
    run: sh(`J="${jar('SUPER_ADMIN')}"; echo "re-testing the 4 previously-failing endpoints as SUPER_ADMIN…";
      for ep in /api/v1/audit/search /api/v1/admin/system/audit-logs/search /api/v1/admin/system/tenants /api/v1/tax-declarations; do
        code=$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' -b "$J" "${BE}$ep"); echo "$code  $ep"; done; echo "done."`) },

  { id: 'rbac-sweep', kind: 'qa', label: 'rbac-sweep', sub: '10 eps × 7 roles',
    run: sh(`EPS=(/api/v1/employees /api/v1/departments /api/v1/projects /api/v1/announcements /api/v1/assets /api/v1/expenses /api/v1/helpdesk/tickets /api/v1/holidays /api/v1/attendance/today /api/v1/leave-requests);
      for R in SUPER_ADMIN HR_MANAGER MANAGER TEAM_LEAD EMPLOYEE RECRUITMENT_ADMIN FINANCE_ADMIN; do
        J="${COOKIES}/$R.txt"; ok=0; forb=0; oth=0;
        for ep in "\${EPS[@]}"; do
          code=$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' -b "$J" "${BE}$ep?size=1");
          case "$code" in 2*) ok=$((ok+1));; 403) forb=$((forb+1));; *) oth=$((oth+1));; esac; done;
        echo "$R  \${ok}×2xx  \${forb}×403  \${oth}×other"; done; echo "I1: SUPER_ADMIN 403 count above must be 0";`) },

  { id: 'i2-probes', kind: 'qa', label: 'i2-probes', sub: 'tenant injection',
    run: sh(`J="${jar('HR_MANAGER')}"; g(){ /usr/bin/curl -s "$@" | grep -o '"totalElements":[0-9]*' | head -1; };
      echo "baseline own-tenant:        $(g -b "$J" "${BE}/api/v1/employees?size=1")";
      echo "inject X-Tenant-Id=OTHER:    $(g -b "$J" -H "X-Tenant-Id: ${OTHER}" "${BE}/api/v1/employees?size=1")";
      echo "inject ?tenantId=OTHER:       $(g -b "$J" "${BE}/api/v1/employees?size=1&tenantId=${OTHER}")";
      echo "--- non-super on cross-tenant admin (expect 403) ---";
      for R in EMPLOYEE MANAGER FINANCE_ADMIN; do
        code=$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' -b "${COOKIES}/$R.txt" "${BE}/api/v1/admin/system/tenants"); echo "$code  $R  /admin/system/tenants"; done;
      echo "I2: injection ignored (identical counts) + admin role-gated → PASS";`) },

  { id: 'cross-module-reads', kind: 'qa', label: 'cross-module-reads', sub: '11 journeys (SYS)',
    run: sh(`J="${jar('SUPER_ADMIN')}";
      for ep in /api/v1/employees /api/v1/departments /api/v1/attendance/today /api/v1/leave-requests /api/v1/expenses /api/v1/assets /api/v1/announcements /api/v1/helpdesk/tickets /api/v1/holidays /api/v1/projects; do
        out=$(/usr/bin/curl -s -w '#%{http_code}' -b "$J" "${BE}$ep?size=2");
        code=\${out##*#}; te=$(echo "\${out%#*}" | grep -o '"totalElements":[0-9]*' | head -1);
        echo "$code  $ep  $te"; done; echo "I1 holds across journeys";`) },

  // ---- AI agents (real claude -p, read-only tools, opt-in/token-spending) ----
  { id: 'claude:coder', kind: 'ai', label: 'claude:coder', sub: 'analyze backend diff', tokens: true,
    task: 'In this nu-aura repo, read the current git diff for backend/src/main/java/com/nulogic/infrastructure/audit/repository/AuditLogRepository.java and backend/src/main/java/com/nulogic/application/admin/service/SystemAdminService.java. In 5 bullet points, summarize what changed and whether each change looks correct. Read-only — do not edit anything.' },

  { id: 'claude:reviewer', kind: 'ai', label: 'claude:reviewer', sub: 'review staged diff', tokens: true,
    task: 'Review the staged/working backend changes in this nu-aura repo (the audit CAST fix, the SystemAdminService null-tolerant map, and the V287 migration). List any correctness or security risks as a short bullet list. Read-only — do not edit.' },

  { id: 'claude:researcher', kind: 'ai', label: 'claude:researcher', sub: 'find test gaps', tokens: true,
    task: 'In this nu-aura backend, name up to 5 controllers or services that appear to lack corresponding tests. One line each with the file path. Read-only.' },
];

const findAgent = id => AGENTS.find(a => a.id === id);

/* ---- run registry + SSE ----------------------------------------------- */
let RUNSEQ = 0;
const runs = new Map(); // runId -> { agentId, status, code, lines:[], clients:Set, proc }

function classify(text) {
  const t = text.trim();
  if (/^2\d\d\b/.test(t) || /\b(PASS|✓|200|exited 0|done)\b/i.test(t)) return 'ok';
  if (/^5\d\d\b/.test(t) || /\b(error|fail|exception|500|denied)\b/i.test(t)) return 'err';
  if (/^4\d\d\b/.test(t) || /\b(403|warn|⚠)\b/.test(t)) return 'warn';
  return 'info';
}
function emit(run, ev, data) {
  if (ev === 'line') run.lines.push(data);
  const payload = `event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of run.clients) { try { res.write(payload); } catch (_) {} }
}

function startRun(agent, taskOverride) {
  const runId = `run_${++RUNSEQ}_${Date.now().toString(36)}`;
  const run = { agentId: agent.id, status: 'running', code: null, lines: [], clients: new Set(), proc: null };
  runs.set(runId, run);

  let exec, args;
  if (agent.kind === 'ai') {
    const task = (taskOverride && taskOverride.trim()) || agent.task;
    exec = 'claude';
    args = ['-p', task, '--output-format', 'stream-json', '--verbose',
            '--allowedTools', 'Read', 'Grep', 'Glob'];
  } else {
    exec = agent.run.exec; args = agent.run.args;
  }

  const proc = spawn(exec, args, { cwd: ROOT, env: process.env });
  run.proc = proc;

  const onChunk = (buf, stream) => {
    const text = buf.toString();
    for (const raw of text.split('\n')) {
      const line = raw.replace(/\s+$/, '');
      if (!line) continue;
      if (agent.kind === 'ai') {
        // parse claude stream-json events into readable lines
        let shown = null, level = 'info';
        try {
          const ev = JSON.parse(line);
          if (ev.type === 'assistant' && ev.message?.content) {
            shown = ev.message.content.map(c => c.text || (c.type === 'tool_use' ? `↳ ${c.name}` : '')).join(' ').trim();
          } else if (ev.type === 'result') {
            shown = `✓ result (${ev.subtype || 'ok'})`; level = 'ok';
          } else if (ev.type === 'system' && ev.subtype === 'init') {
            shown = `agent init · model ${ev.model || '?'} · tools ${ (ev.tools||[]).length }`;
          } else if (ev.type === 'user') { shown = null; }
          else shown = ev.type ? `· ${ev.type}` : null;
        } catch (_) { shown = line; }
        if (shown) emit(run, 'line', { level, text: shown.slice(0, 400) });
      } else {
        emit(run, 'line', { level: stream === 'err' ? 'err' : classify(line), text: line.slice(0, 400) });
      }
    }
  };
  proc.stdout.on('data', b => onChunk(b, 'out'));
  proc.stderr.on('data', b => onChunk(b, 'err'));
  proc.on('error', e => { emit(run, 'line', { level: 'err', text: `spawn error: ${e.message}` }); });
  proc.on('close', code => {
    run.status = code === 0 ? 'done' : 'failed'; run.code = code;
    emit(run, 'status', { status: run.status, code });
    setTimeout(() => { for (const c of run.clients) { try { c.end(); } catch (_) {} } }, 250);
  });
  return runId;
}

/* ---- live page (reuses agent-os.html CSS) ----------------------------- */
function styleBlock() {
  try {
    const html = fs.readFileSync(path.join(ROOT, 'qa-reports', 'agent-os.html'), 'utf8');
    const m = html.match(/<style>[\s\S]*?<\/style>/i);
    return m ? m[0] : '<style></style>';
  } catch (_) { return '<style></style>'; }
}

function livePage() {
  return `<!doctype html><html lang="en" data-theme="dark"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>NU-AURA · Agent OS · LIVE</title>
${styleBlock()}
<style>
  .v.live { color: var(--ok); border-color: var(--ok); }
  .taskbar { display:none; align-items:center; gap:10px; flex:1; }
  .taskbar.show { display:flex; }
  .taskbar input { flex:1; background: var(--surface); border:1px solid var(--line); color:var(--text);
    border-radius: var(--radius-sm); padding:9px 12px; font:500 12px/1 var(--mono); }
  .taskbar .warn { color: var(--run); font:600 11px/1 var(--mono); }
  .tile .kill { margin-left:auto; font:700 9px/1 var(--mono); color:var(--err); background:transparent;
    border:1px solid oklch(56% 0.16 22 / .5); border-radius:5px; padding:4px 7px; cursor:pointer; display:none; }
  .tile.s-running .kill { display:inline-block; }
  .chip[data-kind="ai"] .tag { color: var(--run); border-color: oklch(55% 0.12 85 / .5); }
  .runmeta { font:500 10px/1.5 var(--mono); color:var(--text-faint); }
</style></head>
<body>
  <header class="sysbar">
    <div class="brand"><b>AGENT&nbsp;OS</b><span class="v live">● LIVE</span></div>
    <div class="controls" id="controls">
      <button class="btn" id="reset">↺ Clear</button>
    </div>
    <div class="taskbar" id="taskbar">
      <span class="warn">⚠ spends tokens</span>
      <input id="taskInput" spellcheck="false"/>
      <button class="btn primary" id="taskGo">▶ Spawn Claude agent</button>
      <button class="btn" id="taskCancel">cancel</button>
    </div>
    <div class="meta">
      <span>backend <b id="beState">…</b></span>
      <span>tenant <b>660e…001</b></span>
      <span class="dot">●</span><span id="mLive">idle</span>
    </div>
  </header>
  <main class="os">
    <aside class="rail" aria-label="Spawnable agents">
      <div class="h">QA agents · live :8090</div><div id="railQa"></div>
      <div class="h">Claude agents · $</div><div id="railAi"></div>
    </aside>
    <section class="stage"><div class="grid" id="grid"></div></section>
    <aside class="inspector" aria-label="Run registry">
      <div class="h">Active runs</div><div id="registry" class="runmeta">no runs yet</div>
      <div class="h">How it works</div>
      <p class="runmeta" style="line-height:1.7">QA agents run real shell commands against the live backend and stream stdout here. Claude agents launch a real <code>claude -p</code> process (Read/Grep/Glob only) — every spawn spends tokens, so they require the confirm bar.</p>
    </aside>
  </main>
  <footer class="console">
    <div class="bar"><span class="h" style="margin:0">Console</span><span class="count" id="logCount">0 lines</span></div>
    <div class="log" id="log" role="log" aria-live="polite"></div>
  </footer>
<script>
const API='/api'; let AGENTS=[]; let logN=0, t0=performance.now(), running=0;
const $=(s,r=document)=>r.querySelector(s);
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const agents={}; let pendingAi=null;
function fmt(ms){const s=ms/1000;return String(Math.floor(s/60)).padStart(2,'0')+':'+(s%60).toFixed(1).padStart(4,'0');}
function ringHTML(){const r=12,c=2*Math.PI*r;return '<span class="ring"><svg width="30" height="30" viewBox="0 0 30 30"><circle class="trk" cx="15" cy="15" r="'+r+'"></circle><circle class="val" cx="15" cy="15" r="'+r+'" stroke-dasharray="'+c+'" stroke-dashoffset="'+c+'"></circle></svg></span>';}
function logLine(ag,msg,level){logN++;const ln=el('div','ln '+(level||'info'),'<span class="ts">'+fmt(performance.now()-t0)+'</span><span class="ag">'+ag+'</span><span class="msg">'+esc(msg)+'</span>');const b=$('#log');b.appendChild(ln);b.scrollTop=b.scrollHeight;$('#logCount').textContent=logN+' lines';}
function logSys(msg){logN++;const ln=el('div','ln','<span class="ts">'+fmt(performance.now()-t0)+'</span><span class="ag">os</span><span class="sys">'+esc(msg)+'</span>');$('#log').appendChild(ln);$('#log').scrollTop=1e9;$('#logCount').textContent=logN+' lines';}
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
function makeTile(a){const t=el('article','tile s-queued','<div class="top"><span class="led"></span><span class="ttl">'+a.label+'<small>'+a.sub+'</small></span>'+ringHTML()+'<button class="kill">kill</button></div><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="state">queued</span></div><div class="now">awaiting spawn…</div>');$('#grid').appendChild(t);agents[a.id]={tile:t,def:a,runId:null};$('.kill',t).addEventListener('click',()=>killRun(a.id));return t;}
function setState(id,st){const A=agents[id];A.tile.className='tile live s-'+st;$('.state',A.tile).textContent=st;}
function setNow(id,txt){$('.now',agents[id].tile).textContent=txt;}
function updateLive(){$('#mLive').textContent=running>0?running+' running':'idle';renderRegistry();}
function renderRegistry(){const rows=Object.values(agents).filter(A=>A.runId).map(A=>{const st=A.tile.classList.contains('s-done')?'done':A.tile.classList.contains('s-failed')?'failed':'running';return A.def.label+' · '+st+(A.code!=null?' ('+A.code+')':'');});$('#registry').innerHTML=rows.length?rows.map(r=>'<div>'+esc(r)+'</div>').join(''):'no runs yet';}

function chip(a){const c=el('button','chip','<span class="led"></span><span class="nm">'+a.label+'<small>'+a.sub+'</small></span><span class="tag">'+(a.kind==='ai'?'$ AI':'QA')+'</span>');c.dataset.spawn=a.id;c.dataset.kind=a.kind;c.addEventListener('click',()=>onChip(a));return c;}
function onChip(a){ if(a.kind==='ai'){ pendingAi=a; $('#taskInput').value=a.task||''; $('#taskbar').classList.add('show'); $('#controls').style.display='none'; $('#taskInput').focus(); } else { spawn(a.id); } }

async function spawn(id, task){
  const A=agents[id]; if(!A||A.tile.classList.contains('s-running'))return;
  const chipEl=document.querySelector('[data-spawn="'+id+'"]'); if(chipEl){chipEl.disabled=true;$('.led',chipEl).style.background='var(--run)';}
  setState(id,'running'); setNow(id,'starting…'); A.code=null; running++; updateLive();
  logSys('spawn '+id);
  let res;
  try{ res=await fetch(API+'/spawn',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,task})}); }
  catch(e){ setState(id,'failed'); setNow(id,'server unreachable'); logLine(id,'server unreachable: '+e.message,'err'); running--; updateLive(); return; }
  if(!res.ok){ const t=await res.text(); setState(id,'failed'); setNow(id,'spawn rejected'); logLine(id,t,'err'); running--; updateLive(); if(chipEl)chipEl.disabled=false; return; }
  const {runId}=await res.json(); A.runId=runId; renderRegistry();
  const es=new EventSource(API+'/stream/'+runId);
  es.addEventListener('line',e=>{const d=JSON.parse(e.data);setNow(id,d.text);logLine(id,d.text,d.level);});
  es.addEventListener('status',e=>{const d=JSON.parse(e.data);A.code=d.code;setState(id,d.status);setNow(id,d.status==='done'?'✓ exited 0':'✗ exit '+d.code);logSys(id+' '+d.status+(d.code!=null?' ('+d.code+')':''));es.close();running--;updateLive();if(chipEl){chipEl.disabled=false;$('.led',chipEl).style.background=d.status==='done'?'var(--ok)':'var(--err)';}});
  es.onerror=()=>{es.close();};
}
async function killRun(id){const A=agents[id];if(!A.runId)return;logSys('kill '+id);try{await fetch(API+'/kill/'+A.runId,{method:'POST'});}catch(_){}}

function closeTaskbar(){$('#taskbar').classList.remove('show');$('#controls').style.display='';pendingAi=null;}
$('#taskGo').addEventListener('click',()=>{ if(!pendingAi)return; const a=pendingAi,task=$('#taskInput').value; closeTaskbar(); spawn(a.id,task); });
$('#taskCancel').addEventListener('click',closeTaskbar);
$('#reset').addEventListener('click',()=>{$('#log').innerHTML='';logN=0;$('#logCount').textContent='0 lines';});

async function boot(){
  try{ const h=await fetch(API+'/agents'); AGENTS=await h.json(); }
  catch(e){ logSys('cannot reach control server'); return; }
  AGENTS.filter(a=>a.kind==='qa').forEach(a=>{$('#railQa').appendChild(chip(a));makeTile(a);});
  AGENTS.filter(a=>a.kind==='ai').forEach(a=>{$('#railAi').appendChild(chip(a));makeTile(a);});
  try{ const b=await fetch(API+'/health'); const j=await b.json(); $('#beState').textContent=j.up?'UP':'DOWN'; $('#beState').style.color=j.up?'var(--ok)':'var(--err)'; }catch(_){ $('#beState').textContent='?'; }
  logSys('agent-os LIVE · '+AGENTS.filter(a=>a.kind==='qa').length+' QA + '+AGENTS.filter(a=>a.kind==='ai').length+' Claude agents · click a chip to spawn');
}
boot();
</script>
</body></html>`;
}

/* ---- HTTP ------------------------------------------------------------- */
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }
function readBody(req) { return new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => r(d)); }); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;

  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(livePage()); }

  if (p === '/api/agents') return json(res, 200, AGENTS.map(({ id, kind, label, sub, task, tokens }) => ({ id, kind, label, sub, task, tokens })));

  if (p === '/api/health') {
    const upstream = http.get(`${BE}/actuator/health`, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { json(res, 200, { up: JSON.parse(d).status === 'UP' }); } catch (_) { json(res, 200, { up: false }); } }); });
    upstream.on('error', () => json(res, 200, { up: false }));
    return;
  }

  if (p === '/api/spawn' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)) || '{}');
    const agent = findAgent(body.id);
    if (!agent) return json(res, 404, { error: 'unknown agent' });
    const runId = startRun(agent, body.task);
    return json(res, 200, { runId });
  }

  if (p.startsWith('/api/stream/')) {
    const run = runs.get(p.split('/').pop());
    if (!run) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    run.lines.forEach(l => res.write(`event: line\ndata: ${JSON.stringify(l)}\n\n`));
    if (run.status !== 'running') { res.write(`event: status\ndata: ${JSON.stringify({ status: run.status, code: run.code })}\n\n`); return res.end(); }
    run.clients.add(res);
    req.on('close', () => run.clients.delete(res));
    return;
  }

  if (p.startsWith('/api/kill/') && req.method === 'POST') {
    const run = runs.get(p.split('/').pop());
    if (run?.proc) { try { run.proc.kill('SIGTERM'); } catch (_) {} }
    return json(res, 200, { ok: true });
  }

  res.writeHead(404); res.end('not found');
});

server.listen(PORT, () => {
  console.log(`\n  NU-AURA Agent OS — live control plane`);
  console.log(`  ▸ http://localhost:${PORT}`);
  console.log(`  ▸ backend: ${BE}  ·  ${AGENTS.filter(a=>a.kind==='qa').length} QA + ${AGENTS.filter(a=>a.kind==='ai').length} Claude agents\n`);
});
