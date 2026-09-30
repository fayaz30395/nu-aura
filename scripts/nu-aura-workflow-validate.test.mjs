import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  parseYaml,
  validateWorkflow,
  validateMatrix,
  generateMatrix,
  deepEqual,
} from './nu-aura-workflow-validate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const YAML_TEXT = readFileSync(resolve(REPO, '.nu-aura/orchestration/workflow.yaml'), 'utf8');
const MATRIX_TEXT = readFileSync(resolve(REPO, '.nu-aura/orchestration/workflow-matrix.md'), 'utf8');

const doc = () => parseYaml(YAML_TEXT);

test('parser handles quoted scalars, lists and empty collections', () => {
  const v = parseYaml('a:\n  b: "x: y"\n  c: []\n  d: {}\n  e:\n    - one\n    - "two"\n');
  assert.equal(v.a.b, 'x: y');
  assert.deepEqual(v.a.c, []);
  assert.deepEqual(v.a.d, {});
  assert.deepEqual(v.a.e, ['one', 'two']);
});

test('parser rejects unsupported sequence-of-maps', () => {
  assert.throws(() => parseYaml('a:\n  - b: c\n'), /Sequence of maps/);
});

test('workflow.yaml parses with expected shape', () => {
  const d = doc();
  assert.equal(d.workflow.name, 'nu-aura');
  assert.equal(d.workflow.version, '1.0');
  assert.equal(d.workflow.statuses.length, 9);
  assert.equal(
    Object.values(d.workflow.transitions).reduce((n, tos) => n + tos.length, 0),
    28,
  );
});

test('workflow.yaml is structurally valid', () => {
  assert.deepEqual(validateWorkflow(doc()), []);
});

test('workflow-matrix.md is in sync with workflow.yaml', () => {
  assert.deepEqual(validateMatrix(MATRIX_TEXT, doc().workflow), []);
});

test('generated matrix validates and deep-equals the snapshot', () => {
  const wf = doc().workflow;
  const generated = generateMatrix(wf, YAML_TEXT);
  assert.deepEqual(validateMatrix(generated, wf), []);
});

test('a missing transition requirement is detected', () => {
  const d = doc();
  delete d.workflow.transition_requirements['BLOCKED->READY'];
  const errors = validateWorkflow(d);
  assert.ok(errors.some((e) => e.includes('transition_requirements is missing: BLOCKED->READY')));
});

test('bypassing VALIDATION to reach ACCEPTED is rejected (INV-013)', () => {
  const d = doc();
  d.workflow.transitions.READY.push('ACCEPTED');
  d.workflow.transition_requirements['READY->ACCEPTED'] = { all: ['x'] };
  const errors = validateWorkflow(d);
  assert.ok(errors.some((e) => e.includes('INV-013')));
});

test('a legacy status cannot be a canonical status (INV-014)', () => {
  const d = doc();
  d.workflow.statuses.push('DONE');
  d.workflow.transitions.DONE = [];
  const errors = validateWorkflow(d);
  assert.ok(errors.some((e) => e.includes('INV-014')));
});

test('an actor permission referencing an unknown transition is rejected', () => {
  const d = doc();
  d.workflow.actor_permissions.QA.push('READY->ACCEPTED');
  const errors = validateWorkflow(d);
  assert.ok(errors.some((e) => e.includes('references invalid transition: READY->ACCEPTED')));
});

test('a matrix version mismatch is detected', () => {
  const bad = MATRIX_TEXT.replace(
    'CANONICAL-SNAPSHOT:BEGIN workflow-version=1.0',
    'CANONICAL-SNAPSHOT:BEGIN workflow-version=9.9',
  );
  const errors = validateMatrix(bad, doc().workflow);
  assert.ok(errors.some((e) => e.includes('Version mismatch')));
});

test('a mutated snapshot is detected', () => {
  const bad = MATRIX_TEXT.replace('    - BACKLOG\n', '    - BACKLOGGED\n');
  assert.notEqual(bad, MATRIX_TEXT, 'fixture mutation must apply');
  const errors = validateMatrix(bad, doc().workflow);
  assert.ok(errors.length > 0);
});

test('deepEqual distinguishes nested differences', () => {
  assert.ok(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }));
  assert.ok(!deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] }));
});
