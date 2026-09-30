#!/usr/bin/env node
// Renders faylo-sdlc/{epics,stories} into a single static build-map page.
// Usage: node scripts/faylo-build-map.mjs [outFile]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ledger = join(root, 'faylo-sdlc');
const template = join(root, 'scripts', 'faylo-build-map.template.html');
const out = process.argv[2] ?? join(root, 'build-map.html');

const field = (text, key) => text.match(new RegExp(`^> \\*\\*${key}:\\*\\* (.+)$`, 'm'))?.[1].trim() ?? '';
const heading = (text) => text.match(/^# (\S+): (.+)$/m) ?? [];
const count = (text, re) => (text.match(re) ?? []).length;

const read = (dir) => readdirSync(join(ledger, dir))
  .filter((f) => f.endsWith('.md'))
  .map((f) => readFileSync(join(ledger, dir, f), 'utf8'));

const epics = read('epics').map((text) => {
  const [, id, title] = heading(text);
  return { id, title, state: field(text, 'Status'), stories: [] };
});

const stories = read('stories').map((text) => {
  const [, id, title] = heading(text);
  return {
    id,
    title,
    epic: field(text, 'Epic'),
    tier: field(text, 'Tier'),
    state: field(text, 'Status'),
    created: field(text, 'Created'),
    branch: field(text, 'Branch'),
    acs: count(text, /^- \*\*AC\d+:\*\*/gm),
    ok: count(text, /^\s+- \*\*Verified:\*\* yes/gm),
  };
});

const byId = new Map(epics.map((e) => [e.id, e]));
for (const s of stories) byId.get(s.epic)?.stories.push(s);
// ponytail: stories whose epic file is missing would vanish silently — surface them instead.
const orphans = stories.filter((s) => !byId.has(s.epic));
if (orphans.length) epics.push({ id: 'UNLINKED', title: 'Stories with no epic file', state: '—', stories: orphans });

const data = { generated: new Date().toISOString().slice(0, 10), epics };
writeFileSync(out, readFileSync(template, 'utf8').replace('"__BUILD_MAP_DATA__"', JSON.stringify(data)));
console.log(`${out}: ${epics.length} epics, ${stories.length} stories`);
