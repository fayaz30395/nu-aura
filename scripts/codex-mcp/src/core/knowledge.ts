import * as path from 'node:path';
import {getRepoRoot} from '../config.js';
import {fileExists, listFilesRecursive, readUtf8} from './fs-safe.js';
import {listMemory} from './state.js';

export interface SearchHit {
  source: 'repo' | 'memory';
  path?: string;
  namespace?: string;
  key?: string;
  lineStart?: number;
  score: number;
  text: string;
}

const STATIC_SOURCES = [
  'AGENTS.md',
  'CLAUDE.md',
  'MEMORY.md',
  'tools/PROCESS-RULES.md',
  'tools/CONSTRAINT.md',
  'tools/MERMAID.md',
  'docs/adr/README.md',
  'docs/patterns/README.md',
  'docs/security/baseline.md',
  'docs/runbooks/swarm-pipelines.md',
  'docs/swarm/README.md',
  'scripts/agents/ready.sh',
  'scripts/agents/start-work.sh',
  'scripts/ruflo-start.sh',
  'scripts/ruflo-sync.sh',
];

const RECURSIVE_SOURCES = [
  'docs/adr',
  'docs/patterns',
  'docs/swarm',
];

export function listKnowledgeFiles(repoRoot = getRepoRoot()): string[] {
  const staticFiles = STATIC_SOURCES
    .map((source) => path.join(repoRoot, source))
    .filter(fileExists);
  const recursiveFiles = RECURSIVE_SOURCES.flatMap((source) =>
    listFilesRecursive(path.join(repoRoot, source), new Set(['.md', '.yaml', '.yml'])),
  );
  return [...new Set([...staticFiles, ...recursiveFiles])].sort();
}

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9:_-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function scoreText(text: string, tokens: string[]): number {
  const lower = text.toLowerCase();
  return tokens.reduce((score, token) => {
    if (lower.includes(token)) return score + (token.length > 4 ? 2 : 1);
    return score;
  }, 0);
}

function snippet(lines: string[], index: number): string {
  const start = Math.max(0, index - 2);
  const end = Math.min(lines.length, index + 3);
  return lines.slice(start, end).join('\n').trim();
}

export function searchKnowledge(query: string, limit: number, namespace = 'patterns'): SearchHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const repoRoot = getRepoRoot();
  const hits: SearchHit[] = [];

  for (const file of listKnowledgeFiles(repoRoot)) {
    const lines = readUtf8(file).split('\n');
    lines.forEach((line, index) => {
      const score = scoreText(line, tokens);
      if (score > 0) {
        hits.push({
          source: 'repo',
          path: path.relative(repoRoot, file),
          lineStart: index + 1,
          score,
          text: snippet(lines, index),
        });
      }
    });
  }

  for (const memory of listMemory(namespace)) {
    const text = `${memory.key}\n${memory.value}\n${memory.tags.join(' ')}`;
    const score = scoreText(text, tokens);
    if (score > 0) {
      hits.push({
        source: 'memory',
        namespace: memory.namespace,
        key: memory.key,
        score,
        text: memory.value,
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
