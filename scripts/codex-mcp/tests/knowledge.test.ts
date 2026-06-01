import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {searchKnowledge} from '../src/core/knowledge.js';
import {storeMemory} from '../src/core/state.js';

let tempRoot: string;
let oldRepoRoot: string | undefined;
let oldStateDir: string | undefined;

function writeFixture(relativePath: string, contents: string): void {
  const fullPath = path.join(tempRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), {recursive: true});
  fs.writeFileSync(fullPath, contents, 'utf8');
}

describe('searchKnowledge', () => {
  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nuaura-mcp-test-'));
    oldRepoRoot = process.env.NU_AURA_REPO_ROOT;
    oldStateDir = process.env.NU_AURA_MCP_STATE_DIR;
    process.env.NU_AURA_REPO_ROOT = tempRoot;
    process.env.NU_AURA_MCP_STATE_DIR = path.join(tempRoot, '.state');

    writeFixture('AGENTS.md', 'SuperAdmin bypass and tenant_id scoping are mandatory.');
    writeFixture('docs/patterns/redis-cache-with-fallback.md', 'Redis fallback protects reads.');
  });

  afterEach(() => {
    if (oldRepoRoot === undefined) delete process.env.NU_AURA_REPO_ROOT;
    else process.env.NU_AURA_REPO_ROOT = oldRepoRoot;
    if (oldStateDir === undefined) delete process.env.NU_AURA_MCP_STATE_DIR;
    else process.env.NU_AURA_MCP_STATE_DIR = oldStateDir;
    fs.rmSync(tempRoot, {recursive: true, force: true});
  });

  it('returns repo hits with relative paths and line numbers', () => {
    const hits = searchKnowledge('SuperAdmin tenant_id', 5);
    expect(hits[0]?.source).toBe('repo');
    expect(hits[0]?.path).toBe('AGENTS.md');
    expect(hits[0]?.lineStart).toBe(1);
  });

  it('searches stored Codex MCP memory', () => {
    storeMemory('patterns', 'codex-mcp', 'Use local state for agent handoff records.', [
      'codex',
    ]);
    const hits = searchKnowledge('handoff records', 5);
    expect(hits.some((hit) => hit.source === 'memory' && hit.key === 'codex-mcp')).toBe(true);
  });
});
