#!/usr/bin/env node
/*
 * NU-AURA workflow consistency validator + matrix generator.
 *
 * Authority: .nu-aura/orchestration/workflow.yaml (machine-readable).
 * Human view: .nu-aura/orchestration/workflow-matrix.md (derived, embedded snapshot).
 *
 * Usage:
 *   node scripts/nu-aura-workflow-validate.mjs            # validate (exit 0/1)
 *   node scripts/nu-aura-workflow-validate.mjs --generate # regenerate workflow-matrix.md
 *
 * Dependency-free: no YAML library. A constrained parser handles exactly the
 * schema subset used by workflow.yaml (nested maps, scalar sequences, quoted
 * scalars, [] / {} empties, full-line comments). Unsupported constructs fail
 * loudly instead of being silently mis-parsed.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const WORKFLOW_YAML = resolve(REPO, '.nu-aura/orchestration/workflow.yaml');
const MATRIX_MD = resolve(REPO, '.nu-aura/orchestration/workflow-matrix.md');

const SNAPSHOT_BEGIN_RE = /^<!--\s*CANONICAL-SNAPSHOT:BEGIN\s+workflow-version=(\S+)\s*-->$/;
const SNAPSHOT_END = '<!-- CANONICAL-SNAPSHOT:END -->';
const GENERATED_BY = 'node scripts/nu-aura-workflow-validate.mjs --generate';

const ACTORS = ['ORCHESTRATOR', 'DEV', 'QA', 'SECURITY', 'RELEASE', 'HUMAN'];

const STATUS_MEANING = {
  BACKLOG: 'Known work not yet prepared for execution',
  READY: 'Work is prepared, owned, and executable',
  IN_PROGRESS: 'Active implementation or remediation is underway',
  BLOCKED: 'Technical/dependency condition prevents progress',
  HUMAN_REQUIRED: 'Authorized human action/authority is required',
  VALIDATION: 'Work is undergoing independent verification',
  FAILED: 'Validation demonstrated that required criteria are not satisfied',
  ACCEPTED: 'Work has been verified and accepted into the trusted baseline',
  CANCELLED: 'Work has been intentionally abandoned',
};

const TRANSITION_PURPOSE = {
  'BACKLOG->READY': 'Work is sufficiently defined and executable',
  'BACKLOG->CANCELLED': 'Work is intentionally abandoned',
  'READY->IN_PROGRESS': 'Begin execution',
  'READY->BLOCKED': 'Newly discovered blocker prevents execution',
  'READY->HUMAN_REQUIRED': 'Human action is required before execution',
  'READY->CANCELLED': 'Work is intentionally abandoned',
  'IN_PROGRESS->VALIDATION': 'Implementation is complete and ready for verification',
  'IN_PROGRESS->BLOCKED': 'Execution is prevented by a technical/dependency blocker',
  'IN_PROGRESS->HUMAN_REQUIRED': 'Human action/authority is required',
  'IN_PROGRESS->CANCELLED': 'Work is intentionally abandoned',
  'BLOCKED->READY': 'Blocker resolved; work needs to be prepared/revalidated',
  'BLOCKED->IN_PROGRESS': 'Blocker resolved; execution can resume',
  'BLOCKED->HUMAN_REQUIRED': 'Resolution now requires human action',
  'BLOCKED->CANCELLED': 'Blocked work is abandoned',
  'HUMAN_REQUIRED->READY': 'Human action completed; work requires normal readiness',
  'HUMAN_REQUIRED->IN_PROGRESS': 'Human action completed; execution can continue',
  'HUMAN_REQUIRED->VALIDATION': 'Human action completed and work is ready for validation',
  'HUMAN_REQUIRED->BLOCKED': 'Human action did not resolve the blocking condition',
  'HUMAN_REQUIRED->CANCELLED': 'Work is abandoned',
  'VALIDATION->ACCEPTED': 'Required validation passed',
  'VALIDATION->FAILED': 'Validation demonstrated unmet criteria',
  'VALIDATION->BLOCKED': 'Validation cannot continue because of a blocker',
  'VALIDATION->HUMAN_REQUIRED': 'Validation requires human action/authority',
  'FAILED->IN_PROGRESS': 'Failure understood; remediation begins',
  'FAILED->BLOCKED': 'Remediation cannot proceed',
  'FAILED->HUMAN_REQUIRED': 'Remediation requires human action/authority',
  'FAILED->CANCELLED': 'Failed work is intentionally abandoned',
  'ACCEPTED->IN_PROGRESS': 'Previously accepted work is legitimately reopened',
};

/* ------------------------------------------------------------------ */
/* Constrained YAML parser                                             */
/* ------------------------------------------------------------------ */

function splitKey(text) {
  let inS = false;
  let inD = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === ':' && !inS && !inD) {
      const next = text[i + 1];
      if (next === undefined || next === ' ') {
        return { key: unquote(text.slice(0, i).trim()), rest: text.slice(i + 1).trim() };
      }
    }
  }
  return null;
}

function unquote(s) {
  if (s.startsWith('"')) return JSON.parse(s);
  if (s.startsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  return s;
}

export function parseScalar(raw) {
  const s = raw.trim();
  if (s === '') return null;
  if (s === '[]') return [];
  if (s === '{}') return {};
  if (s.startsWith('"')) return JSON.parse(s);
  if (s.startsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  if (s === 'null' || s === '~') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s) || /^-?\d+\.\d+$/.test(s)) return Number(s);
  return s;
}

function isSeqItem(text) {
  return text === '-' || text.startsWith('- ');
}

function parseSeq(tokens, start, indent) {
  const out = [];
  let i = start;
  while (i < tokens.length && tokens[i].indent === indent && isSeqItem(tokens[i].text)) {
    const t = tokens[i];
    const item = t.text === '-' ? '' : t.text.slice(2).trim();
    if (item === '') {
      if (i + 1 < tokens.length && tokens[i + 1].indent > indent) {
        const [v, next] = parseBlock(tokens, i + 1, tokens[i + 1].indent);
        out.push(v);
        i = next;
      } else {
        out.push(null);
        i += 1;
      }
      continue;
    }
    // A sequence of maps is outside the supported schema subset.
    if (splitKey(item)) {
      throw new Error(`Sequence of maps is not supported in this schema: "- ${item}"`);
    }
    out.push(parseScalar(item));
    i += 1;
  }
  return [out, i];
}

function parseMap(tokens, start, indent) {
  const obj = {};
  let i = start;
  while (i < tokens.length && tokens[i].indent === indent) {
    const t = tokens[i];
    if (isSeqItem(t.text)) break;
    const kv = splitKey(t.text);
    if (!kv) throw new Error(`Invalid map entry: "${t.text}"`);
    const { key, rest } = kv;
    i += 1;
    if (rest === '[]') {
      obj[key] = [];
      continue;
    }
    if (rest === '{}') {
      obj[key] = {};
      continue;
    }
    if (rest === '') {
      if (i < tokens.length && tokens[i].indent > indent) {
        const [v, next] = parseBlock(tokens, i, tokens[i].indent);
        obj[key] = v;
        i = next;
      } else {
        obj[key] = null;
      }
      continue;
    }
    obj[key] = parseScalar(rest);
  }
  return [obj, i];
}

function parseBlock(tokens, start, indent) {
  const first = tokens[start];
  if (!first || first.indent !== indent) {
    throw new Error(`Unexpected indentation at token ${start}`);
  }
  if (isSeqItem(first.text)) return parseSeq(tokens, start, indent);
  return parseMap(tokens, start, indent);
}

export function parseYaml(text) {
  const tokens = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    if (raw.trimStart().startsWith('#')) continue;
    const indent = raw.length - raw.trimStart().length;
    if (raw.slice(0, indent).includes('\t')) throw new Error('Tabs are not allowed for indentation');
    tokens.push({ indent, text: raw.slice(indent).replace(/\s+$/, '') });
  }
  if (tokens.length === 0) return null;
  const [value, next] = parseBlock(tokens, 0, tokens[0].indent);
  if (next !== tokens.length) throw new Error(`Parser stopped early at token ${next}/${tokens.length}`);
  return value;
}

/* ------------------------------------------------------------------ */
/* Structural validation                                               */
/* ------------------------------------------------------------------ */

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function transitionPairs(transitions) {
  const pairs = [];
  for (const [from, tos] of Object.entries(transitions)) {
    for (const to of tos) pairs.push(`${from}->${to}`);
  }
  return pairs;
}

export function validateWorkflow(doc) {
  const errors = [];
  const wf = doc && doc.workflow;
  if (!isPlainObject(wf)) {
    return ['Top-level "workflow" key is missing or not a map'];
  }

  const statuses = wf.statuses;
  if (!Array.isArray(statuses) || statuses.length === 0) {
    errors.push('workflow.statuses must be a non-empty list');
  } else {
    const seen = new Set();
    for (const s of statuses) {
      if (typeof s !== 'string' || !s) errors.push(`Invalid status entry: ${JSON.stringify(s)}`);
      else if (seen.has(s)) errors.push(`Duplicate status: ${s}`);
      seen.add(s);
    }
  }
  const statusSet = new Set(Array.isArray(statuses) ? statuses : []);

  for (const listKey of [
    'results',
    'severities',
    'validation_types',
    'work_types',
    'gate_values',
    'reopen_categories',
    'terminal_statuses',
    'reopenable_statuses',
  ]) {
    if (!Array.isArray(wf[listKey]) || wf[listKey].length === 0) {
      errors.push(`workflow.${listKey} must be a non-empty list`);
    }
  }

  const transitions = wf.transitions;
  if (!isPlainObject(transitions)) {
    errors.push('workflow.transitions must be a map');
  } else {
    for (const s of statusSet) {
      if (!(s in transitions)) errors.push(`workflow.transitions is missing status key: ${s}`);
    }
    for (const [from, tos] of Object.entries(transitions)) {
      if (!statusSet.has(from)) errors.push(`transitions has unknown source status: ${from}`);
      if (!Array.isArray(tos)) {
        errors.push(`transitions.${from} must be a list`);
        continue;
      }
      for (const to of tos) {
        if (!statusSet.has(to)) errors.push(`transitions.${from} references unknown status: ${to}`);
      }
    }
  }

  const pairs = isPlainObject(transitions) ? transitionPairs(transitions) : [];
  const pairSet = new Set(pairs);

  const reqs = wf.transition_requirements;
  if (!isPlainObject(reqs)) {
    errors.push('workflow.transition_requirements must be a map');
  } else {
    const reqKeys = new Set(Object.keys(reqs));
    for (const p of pairs) {
      if (!reqKeys.has(p)) errors.push(`transition_requirements is missing: ${p}`);
    }
    for (const k of reqKeys) {
      if (!pairSet.has(k)) errors.push(`transition_requirements has non-transition key: ${k}`);
      const entry = reqs[k];
      if (!isPlainObject(entry) || !Array.isArray(entry.all) || entry.all.length === 0) {
        errors.push(`transition_requirements.${k} must define a non-empty "all" list`);
      }
    }
  }

  const perms = wf.actor_permissions;
  if (!isPlainObject(perms)) {
    errors.push('workflow.actor_permissions must be a map');
  } else {
    for (const [actor, list] of Object.entries(perms)) {
      if (!ACTORS.includes(actor)) errors.push(`actor_permissions has unknown actor: ${actor}`);
      if (!Array.isArray(list)) {
        errors.push(`actor_permissions.${actor} must be a list`);
        continue;
      }
      for (const t of list) {
        if (t === '*') continue;
        if (!pairSet.has(t)) errors.push(`actor_permissions.${actor} references invalid transition: ${t}`);
      }
    }
    for (const actor of ACTORS) {
      if (!(actor in perms)) errors.push(`actor_permissions is missing actor: ${actor}`);
    }
  }

  for (const s of (Array.isArray(wf.terminal_statuses) ? wf.terminal_statuses : [])) {
    if (!statusSet.has(s)) errors.push(`terminal_statuses references unknown status: ${s}`);
  }
  for (const s of (Array.isArray(wf.reopenable_statuses) ? wf.reopenable_statuses : [])) {
    if (!statusSet.has(s)) errors.push(`reopenable_statuses references unknown status: ${s}`);
  }

  if (!isPlainObject(wf.legacy_status_mapping)) {
    errors.push('workflow.legacy_status_mapping must be a map');
  } else {
    for (const [legacy, canonical] of Object.entries(wf.legacy_status_mapping)) {
      if (statusSet.has(legacy)) errors.push(`legacy_status_mapping key "${legacy}" is a canonical status`);
      if (!statusSet.has(canonical)) {
        errors.push(`legacy_status_mapping.${legacy} maps to unknown status: ${canonical}`);
      }
    }
  }

  for (const inv of Object.keys(wf.invariants || {})) {
    if (!/^INV-\d{3}$/.test(inv)) errors.push(`Invalid invariant id: ${inv}`);
  }

  if (!isPlainObject(wf.entity_schemas)) {
    errors.push('workflow.entity_schemas must be a map');
  } else {
    for (const [name, schema] of Object.entries(wf.entity_schemas)) {
      if (!isPlainObject(schema) || !Array.isArray(schema.fields) || schema.fields.length === 0) {
        errors.push(`entity_schemas.${name} must define a non-empty "fields" list`);
      }
    }
  }

  if (typeof wf.version !== 'string' || !wf.version) {
    errors.push('workflow.version must be a non-empty string');
  }

  // Invariant spot-checks.
  if (Array.isArray(statuses) && isPlainObject(transitions)) {
    for (const from of statuses) {
      const tos = transitions[from] || [];
      if (from !== 'VALIDATION' && tos.includes('ACCEPTED')) {
        errors.push(`INV-013 violated: ${from}->ACCEPTED bypasses VALIDATION`);
      }
    }
  }
  if (isPlainObject(wf.legacy_status_mapping)) {
    for (const legacy of Object.keys(wf.legacy_status_mapping)) {
      if (statusSet.has(legacy)) errors.push(`INV-014 violated: legacy status "${legacy}" is canonical`);
    }
  }

  return errors;
}

/* ------------------------------------------------------------------ */
/* Snapshot / matrix comparison                                        */
/* ------------------------------------------------------------------ */

export function extractSnapshot(matrixText) {
  const lines = matrixText.split(/\r?\n/);
  let begin = -1;
  let version = null;
  let end = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(SNAPSHOT_BEGIN_RE);
    if (m) {
      begin = i;
      version = m[1];
      continue;
    }
    if (begin !== -1 && lines[i].trim() === SNAPSHOT_END) {
      end = i;
      break;
    }
  }
  if (begin === -1) throw new Error('workflow-matrix.md is missing the CANONICAL-SNAPSHOT:BEGIN marker');
  if (end === -1) throw new Error('workflow-matrix.md is missing the CANONICAL-SNAPSHOT:END marker');
  const inner = lines.slice(begin + 1, end).filter((l) => l.trim() !== '```yaml' && l.trim() !== '```');
  return { version, yaml: inner.join('\n') };
}

export function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => k in b && deepEqual(a[k], b[k]));
  }
  return false;
}

export function validateMatrix(matrixText, wf) {
  const errors = [];
  const { version, yaml } = extractSnapshot(matrixText);
  if (version !== wf.version) {
    errors.push(`Version mismatch: matrix marker=${version} workflow.yaml=${wf.version}`);
  }
  let snap;
  try {
    snap = parseYaml(yaml);
  } catch (e) {
    return [...errors, `Embedded snapshot failed to parse: ${e.message}`];
  }
  if (!deepEqual(snap, { workflow: wf })) {
    errors.push('Embedded CANONICAL-SNAPSHOT does not deep-equal workflow.yaml');
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

function mdTable(headers, rows) {
  const out = [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`];
  for (const r of rows) out.push(`| ${r.join(' | ')} |`);
  return out.join('\n');
}

export function generateMatrix(wf, rawYaml) {
  const statuses = wf.statuses;
  const terminal = new Set(wf.terminal_statuses || []);
  const reopenable = new Set(wf.reopenable_statuses || []);

  const actorMatrixRows = [];
  for (const from of statuses) {
    for (const to of wf.transitions[from] || []) {
      const pair = `${from}->${to}`;
      const row = [`\`${from}\``, `\`${to}\``];
      for (const actor of ACTORS) {
        const allowed = (wf.actor_permissions[actor] || []).some((p) => p === '*' || p === pair);
        row.push(allowed ? '✅' : '—');
      }
      actorMatrixRows.push(row);
    }
  }

  const transitionRows = [];
  for (const from of statuses) {
    for (const to of wf.transitions[from] || []) {
      const pair = `${from}->${to}`;
      transitionRows.push([`\`${from}\``, `\`${to}\``, '✅', TRANSITION_PURPOSE[pair] || '']);
    }
  }

  const statusRows = statuses.map((s) => [
    `\`${s}\``,
    STATUS_MEANING[s] || '',
    terminal.has(s) ? 'Yes' : 'No',
    reopenable.has(s) ? 'Yes' : 'No',
  ]);

  const reqRows = [];
  for (const from of statuses) {
    for (const to of wf.transitions[from] || []) {
      const pair = `${from}->${to}`;
      const all = (wf.transition_requirements[pair] || {}).all || [];
      reqRows.push([`\`${pair}\``, all.map((r) => `\`${r}\``).join(', ')]);
    }
  }

  const out = [];
  out.push('<!--');
  out.push('GENERATED FROM:');
  out.push('.nu-aura/orchestration/workflow.yaml');
  out.push('');
  out.push('DO NOT EDIT MANUALLY.');
  out.push(`Regenerate with: ${GENERATED_BY}`);
  out.push('');
  out.push(`Workflow version: ${wf.version}`);
  out.push('-->');
  out.push('');
  out.push('# NU-AURA Canonical Workflow Matrix');
  out.push('');
  out.push('Workflow Version: ' + wf.version);
  out.push('');
  out.push('This is the human-readable, audit-oriented view of the canonical workflow.');
  out.push('`.nu-aura/orchestration/workflow.yaml` is the authoritative machine-readable definition.');
  out.push('If this view and `workflow.yaml` disagree, `workflow.yaml` wins and this view must be regenerated.');
  out.push('');
  out.push('## 1. Canonical statuses');
  out.push('');
  out.push(mdTable(['Status', 'Meaning', 'Terminal?', 'Reopenable?'], statusRows));
  out.push('');
  out.push('## 2. Transition matrix (allowed)');
  out.push('');
  out.push(mdTable(['From', 'To', 'Allowed', 'Primary purpose'], transitionRows));
  out.push('');
  out.push('Any directed status pair not listed above is **not permitted**.');
  out.push('');
  out.push('## 3. Actor transition matrix');
  out.push('');
  out.push(mdTable(['From', 'To', ...ACTORS], actorMatrixRows));
  out.push('');
  out.push('`*` in `workflow.yaml` (ORCHESTRATOR) means all transitions are allowed.');
  out.push('QA/SECURITY/RELEASE acceptance is scope-level; the Orchestrator owns release acceptance.');
  out.push('');
  out.push('## 4. Transition requirements');
  out.push('');
  out.push(mdTable(['Transition', 'Required (all must pass)'], reqRows));
  out.push('');
  out.push('## 5. Terminal & reopen rules');
  out.push('');
  out.push(`- Terminal statuses: ${(wf.terminal_statuses || []).map((s) => '`' + s + '`').join(', ')}`);
  out.push(`- Reopenable statuses: ${(wf.reopenable_statuses || []).map((s) => '`' + s + '`').join(', ')}`);
  out.push(`- Reopen categories: ${(wf.reopen_categories || []).map((s) => '`' + s + '`').join(', ')}`);
  out.push('');
  out.push('## 6. Acceptance, failure, blocker, human and reopen paths');
  out.push('');
  out.push('```text');
  out.push('Acceptance: IN_PROGRESS -> VALIDATION -> ACCEPTED');
  out.push('Failure:    VALIDATION -> FAILED -> IN_PROGRESS -> VALIDATION');
  out.push('Blocker:    <ACTIVE> -> BLOCKED -> READY | IN_PROGRESS');
  out.push('Human:      <ACTIVE> -> HUMAN_REQUIRED -> READY | IN_PROGRESS | VALIDATION');
  out.push('Reopen:     ACCEPTED -> IN_PROGRESS (documented reason required)');
  out.push('Cancel:     BACKLOG | READY | IN_PROGRESS | BLOCKED | HUMAN_REQUIRED | FAILED -> CANCELLED');
  out.push('```');
  out.push('');
  out.push('## 7. Invariants');
  out.push('');
  for (const [id, rule] of Object.entries(wf.invariants || {})) {
    out.push(`- **${id}** — ${rule}`);
  }
  out.push('');
  out.push('## 8. Authority and consistency contract');
  out.push('');
  out.push('- `workflow.yaml` = machine/runtime authority (semantics, transitions, requirements, permissions).');
  out.push('- `workflow-matrix.md` = human/audit authority view, generated from `workflow.yaml`.');
  out.push('- Both must declare the same version; a mismatch is a workflow integrity failure.');
  out.push('- A workflow change updates `workflow.yaml`, regenerates this file, bumps the version, and records a `workflow_change` decision.');
  out.push('- When the two representations disagree: stop, mark workflow integrity FAILED, reconcile, then resume.');
  out.push('');
  out.push('## 9. Legacy status migration');
  out.push('');
  out.push(mdTable(
    ['Legacy', 'Canonical'],
    Object.entries(wf.legacy_status_mapping || {}).map(([k, v]) => [`\`${k}\``, `\`${v}\``]),
  ));
  out.push('');
  out.push('Legacy tokens must not be written to new records; this table is migration guidance only.');
  out.push('');
  out.push('## 10. Canonical snapshot (machine-checked)');
  out.push('');
  out.push('The block below must deep-equal `workflow.yaml`.');
  out.push('');
  out.push(`<!-- CANONICAL-SNAPSHOT:BEGIN workflow-version=${wf.version} -->`);
  out.push('```yaml');
  out.push(rawYaml.replace(/\s+$/, ''));
  out.push('```');
  out.push(SNAPSHOT_END);
  out.push('');
  return out.join('\n');
}

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

function loadRaw() {
  if (!existsSync(WORKFLOW_YAML)) {
    throw new Error(`Missing canonical workflow file: ${WORKFLOW_YAML}`);
  }
  return readFileSync(WORKFLOW_YAML, 'utf8');
}

function runGenerate() {
  const raw = loadRaw();
  const doc = parseYaml(raw);
  const errors = validateWorkflow(doc);
  if (errors.length) {
    console.error('Cannot generate: workflow.yaml is invalid:\n' + errors.map((e) => `  - ${e}`).join('\n'));
    return 1;
  }
  mkdirSync(dirname(MATRIX_MD), { recursive: true });
  writeFileSync(MATRIX_MD, generateMatrix(doc.workflow, raw) + '\n', 'utf8');
  console.log(`Generated ${MATRIX_MD}`);
  return 0;
}

function runCheck() {
  const raw = loadRaw();
  const doc = parseYaml(raw);
  const errors = validateWorkflow(doc);
  if (errors.length) {
    console.error('workflow.yaml is invalid:');
    for (const e of errors) console.error(`  - ${e}`);
    return 1;
  }
  if (!existsSync(MATRIX_MD)) {
    console.error(`Missing ${MATRIX_MD}. Run: ${GENERATED_BY}`);
    return 1;
  }
  const matrixErrors = validateMatrix(readFileSync(MATRIX_MD, 'utf8'), doc.workflow);
  if (matrixErrors.length) {
    console.error('workflow-matrix.md is out of sync with workflow.yaml:');
    for (const e of matrixErrors) console.error(`  - ${e}`);
    return 1;
  }
  console.log(
    `Workflow OK: version ${doc.workflow.version}, ${doc.workflow.statuses.length} statuses, ` +
      `${transitionPairs(doc.workflow.transitions).length} transitions. Matrix in sync.`,
  );
  return 0;
}

function main(argv) {
  try {
    if (argv.includes('--generate')) return runGenerate();
    return runCheck();
  } catch (e) {
    console.error(`nu-aura-workflow-validate: ${e.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
