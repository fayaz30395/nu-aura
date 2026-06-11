/* Orchestrator OS — client core (pure, no DOM). Loaded by the live page via
   <script src="/client-core.js"> AND unit-tested in node. One implementation,
   two consumers. UMD so it works as a browser global or a CommonJS module. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.OrchClientCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const COLX = [90, 320, 580, 855];

  const KIND = {
    directive: { c: 'var(--directive)', label: 'directive' },
    spawn: { c: 'var(--spawn)', label: 'spawn' },
    handoff: { c: 'var(--handoff)', label: 'handoff' },
    query: { c: 'var(--query)', label: 'query' },
    report: { c: 'var(--report)', label: 'report' },
    result: { c: 'var(--report)', label: 'result' },
    verdict: { c: 'var(--verdict)', label: 'verdict' },
  };

  function esc(s) {
    return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }

  function edgeKey(a, b) { return [a, b].sort().join('~'); }

  function depth(nodes, id) { let d = 0, n = id; while (nodes[n] && nodes[n].parent) { d++; n = nodes[n].parent; } return d; }

  /**
   * Hierarchical layout: columns by depth; leaves spread evenly down the right
   * column; each parent is vertically centered on its children. Pure — returns
   * { id: {x, y} } and never mutates the input.
   */
  function computeLayout(nodes, colx) {
    const COL = colx || COLX;
    const ids = Object.keys(nodes); const pos = {}; if (!ids.length) return pos;
    const byD = {}; let maxD = 0;
    ids.forEach(id => { const d = depth(nodes, id); (byD[d] = byD[d] || []).push(id); maxD = Math.max(maxD, d); });
    const leaves = ids.filter(id => !ids.some(x => nodes[x].parent === id));
    const top = 55, bot = 565, gap = leaves.length > 1 ? (bot - top) / (leaves.length - 1) : 0;
    const y = {}; leaves.forEach((id, i) => y[id] = top + i * gap);
    for (let d = maxD; d >= 0; d--) (byD[d] || []).forEach(id => {
      const kids = ids.filter(x => nodes[x].parent === id);
      y[id] = kids.length ? kids.reduce((s, k) => s + y[k], 0) / kids.length : (y[id] != null ? y[id] : top);
      pos[id] = { x: COL[Math.min(d, 3)], y: y[id] };
    });
    return pos;
  }

  /** Cubic-bezier sample used to animate a message packet along an edge. */
  function bezierPoint(t, p0, p1, p2, p3) {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  }

  return { COLX, KIND, esc, edgeKey, depth, computeLayout, bezierPoint };
});
