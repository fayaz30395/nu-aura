'use strict';
/* ======================================================================
   Orchestrator OS — pure core logic (no I/O), unit-tested separately.
   Extracted so the orchestration's decision logic can be verified without
   spawning real agents. See orchestrator-core.test.js.
   ====================================================================== */

/** kebab-case a label into a safe, non-empty node id. */
const norm = s => String(s || 'x').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';

/** Pull the first JSON object out of a model reply (handles ``` fences + prose). */
function extractJson(text) {
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  return JSON.parse(t);
}

/** Bound a delegation tree to safe limits (≤3 orchestrators, ≤2 agents each). */
function trimTree(tree) {
  if (!tree || !Array.isArray(tree.orchestrators) || !tree.orchestrators.length) throw new Error('invalid tree');
  tree.orchestrators = tree.orchestrators.slice(0, 3).map(o => ({ ...o, agents: (o.agents || []).slice(0, 2) }));
  return tree;
}

/**
 * Order agents into execution waves that respect handoff dependencies.
 * Agents with no unmet dependency run in parallel (same wave); a handoff
 * from→to means `to` waits for `from`. Cycles or dangling deps degrade to a
 * final catch-all wave so the run never deadlocks.
 * @returns {string[][]} waves of agent ids
 */
function planWaves(agentIds, handoffs) {
  const idset = new Set(agentIds);
  const deps = {}; agentIds.forEach(id => deps[id] = new Set());
  (handoffs || []).forEach(h => {
    const f = h && h.from, t = h && h.to;
    if (idset.has(f) && idset.has(t) && f !== t) deps[t].add(f);
  });
  const done = new Set(), waves = [];
  let guard = 0;
  while (done.size < agentIds.length && guard++ <= agentIds.length + 1) {
    const ready = agentIds.filter(id => !done.has(id) && [...deps[id]].every(d => done.has(d)));
    if (!ready.length) { waves.push(agentIds.filter(id => !done.has(id))); break; } // cycle / dangling → flush rest
    ready.forEach(id => done.add(id));
    waves.push(ready);
  }
  return waves;
}

/** Direct handoff sources for an agent (for context injection at run time). */
function incomingFor(agentId, agentIds, handoffs) {
  const idset = new Set(agentIds);
  return (handoffs || [])
    .filter(h => h && h.to === agentId && idset.has(h.from) && h.from !== agentId)
    .map(h => ({ from: h.from, reason: h.reason || '' }));
}

/** Safe default tree when the planner output can't be parsed. */
function fallbackTree(directive) {
  return { orchestrators: [
    { id: 'qa', label: 'QA Orchestrator', role: 'verification',
      agents: [
        { id: 'qa-scan', label: 'scanner', task: `Relating to "${directive}": read the repo and list the most relevant files/areas and obvious risks. Cite file:line. <=100 words.` },
        { id: 'qa-synth', label: 'synthesizer', task: `Summarize the scanner's findings into a readiness checklist.` } ],
      handoffs: [{ from: 'qa-scan', to: 'qa-synth', reason: 'scanner feeds the synthesizer' }] },
    { id: 'be', label: 'Backend Orchestrator', role: 'implementation analysis',
      agents: [{ id: 'be-plan', label: 'planner', task: `Relating to "${directive}": outline a concrete approach grounded in the backend. <=100 words.` }] },
  ] };
}

module.exports = { norm, extractJson, trimTree, planWaves, incomingFor, fallbackTree };
