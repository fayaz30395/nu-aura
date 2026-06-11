'use strict';
/* Unit tests for the Orchestrator OS pure core. Run: node --test scripts/ */
const test = require('node:test');
const assert = require('node:assert');
const { norm, extractJson, trimTree, planWaves, incomingFor, fallbackTree } = require('./orchestrator-core');

test('norm: kebab-cases and stays non-empty', () => {
  assert.equal(norm('QA Orchestrator'), 'qa-orchestrator');
  assert.equal(norm('  Build/Deploy  '), 'build-deploy');
  assert.equal(norm('!!!'), 'x');
  assert.equal(norm(''), 'x');
  assert.equal(norm(undefined), 'x');
});

test('extractJson: plain, fenced, and prose-wrapped', () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Sure! Here:\n{"a":1,"b":[2]}\nThanks'), { a: 1, b: [2] });
});

test('extractJson: throws on no JSON', () => {
  assert.throws(() => extractJson('no json here'));
});

test('trimTree: caps orchestrators at 3 and agents at 2', () => {
  const big = { orchestrators: Array.from({ length: 5 }, (_, i) => ({ id: 'o' + i, agents: Array.from({ length: 4 }, (_, j) => ({ id: 'a' + j })) })) };
  const t = trimTree(big);
  assert.equal(t.orchestrators.length, 3);
  t.orchestrators.forEach(o => assert.equal(o.agents.length, 2));
});

test('trimTree: rejects invalid trees', () => {
  assert.throws(() => trimTree(null));
  assert.throws(() => trimTree({}));
  assert.throws(() => trimTree({ orchestrators: [] }));
});

test('planWaves: independent agents run in one wave', () => {
  assert.deepEqual(planWaves(['a', 'b', 'c'], []), [['a', 'b', 'c']]);
});

test('planWaves: linear handoff chain becomes sequential waves', () => {
  const waves = planWaves(['scan', 'synth'], [{ from: 'scan', to: 'synth' }]);
  assert.deepEqual(waves, [['scan'], ['synth']]);
});

test('planWaves: diamond dependency orders correctly', () => {
  // a -> b, a -> c, (b,c) -> d
  const waves = planWaves(['a', 'b', 'c', 'd'], [
    { from: 'a', to: 'b' }, { from: 'a', to: 'c' }, { from: 'b', to: 'd' }, { from: 'c', to: 'd' },
  ]);
  assert.deepEqual(waves[0], ['a']);
  assert.deepEqual(waves[1].sort(), ['b', 'c']);
  assert.deepEqual(waves[2], ['d']);
});

test('planWaves: cycle never deadlocks (flushes remaining)', () => {
  const waves = planWaves(['a', 'b'], [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }]);
  const flat = waves.flat().sort();
  assert.deepEqual(flat, ['a', 'b']); // both scheduled, no hang
});

test('planWaves: handoff referencing a missing agent is ignored', () => {
  assert.deepEqual(planWaves(['a'], [{ from: 'ghost', to: 'a' }]), [['a']]);
});

test('incomingFor: returns valid handoff sources only', () => {
  const inc = incomingFor('synth', ['scan', 'synth'], [{ from: 'scan', to: 'synth', reason: 'feed' }, { from: 'x', to: 'synth' }]);
  assert.equal(inc.length, 1);
  assert.equal(inc[0].from, 'scan');
  assert.equal(inc[0].reason, 'feed');
});

test('fallbackTree: well-formed and bounded with a handoff', () => {
  const t = fallbackTree('do X');
  assert.ok(Array.isArray(t.orchestrators) && t.orchestrators.length >= 1);
  assert.ok(t.orchestrators[0].handoffs.length >= 1);
  assert.doesNotThrow(() => trimTree(t));
});
