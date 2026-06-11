'use strict';
/* Unit tests for the browser client core (pure logic served to the live page). */
const test = require('node:test');
const assert = require('node:assert');
const { esc, edgeKey, depth, computeLayout, bezierPoint, KIND, COLX } = require('./orchestrator-client-core');

test('esc: escapes HTML metacharacters', () => {
  assert.equal(esc('<b>&"</b>'), '&lt;b&gt;&amp;"&lt;/b&gt;');
  assert.equal(esc(42), '42');
});

test('edgeKey: order-independent and stable', () => {
  assert.equal(edgeKey('a', 'b'), edgeKey('b', 'a'));
  assert.equal(edgeKey('lead', 'qa'), 'lead~qa');
});

test('depth: counts hops to a root', () => {
  const nodes = { you: {}, lead: { parent: 'you' }, qa: { parent: 'lead' }, scan: { parent: 'qa' } };
  assert.equal(depth(nodes, 'you'), 0);
  assert.equal(depth(nodes, 'lead'), 1);
  assert.equal(depth(nodes, 'scan'), 3);
});

test('computeLayout: columns by depth, parents centered on children', () => {
  const nodes = { you: {}, lead: { parent: 'you' }, qa: { parent: 'lead' }, scan: { parent: 'qa' }, synth: { parent: 'qa' } };
  const pos = computeLayout(nodes, COLX);
  // columns
  assert.equal(pos.you.x, COLX[0]);
  assert.equal(pos.lead.x, COLX[1]);
  assert.equal(pos.qa.x, COLX[2]);
  assert.equal(pos.scan.x, COLX[3]);
  assert.equal(pos.synth.x, COLX[3]);
  // leaves spread across [55, 565]; parent centered on its two children
  const mid = (pos.scan.y + pos.synth.y) / 2;
  assert.ok(Math.abs(pos.qa.y - mid) < 1e-9, 'qa centered on scan/synth');
  assert.ok(Math.abs(pos.lead.y - pos.qa.y) < 1e-9, 'lead centered on qa');
  assert.ok(Math.abs(pos.you.y - pos.lead.y) < 1e-9, 'you centered on lead');
});

test('computeLayout: does not mutate input + handles empty', () => {
  const nodes = { a: {} };
  const copy = JSON.stringify(nodes);
  computeLayout(nodes, COLX);
  assert.equal(JSON.stringify(nodes), copy, 'input untouched');
  assert.deepEqual(computeLayout({}, COLX), {});
});

test('bezierPoint: endpoints are exact', () => {
  assert.equal(bezierPoint(0, 10, 20, 30, 40), 10);
  assert.equal(bezierPoint(1, 10, 20, 30, 40), 40);
});

test('KIND: every message kind maps to a color + label', () => {
  ['directive', 'spawn', 'handoff', 'query', 'report', 'result', 'verdict'].forEach(k => {
    assert.ok(KIND[k] && KIND[k].c && KIND[k].label, `${k} mapped`);
  });
});
