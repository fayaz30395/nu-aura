import * as path from 'node:path';
import {getStateDir} from '../config.js';
import {appendJsonLine, ensureDir, readJsonLines} from './fs-safe.js';

export interface StoredMemory {
  id: string;
  namespace: string;
  key: string;
  value: string;
  tags: string[];
  createdAt: string;
}

export interface TaskEvent {
  taskId: string;
  kind: 'pre_task' | 'post_task';
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface SwarmRecord {
  swarmId: string;
  createdAt: string;
  task: string;
  topology: string;
  strategy: string;
  pipeline: string;
  agents: string[];
  status: 'planned' | 'active' | 'complete';
}

export interface AgentRecord {
  agentId: string;
  createdAt: string;
  agentType: string;
  task: string;
  model: string;
  status: 'planned' | 'active' | 'complete';
}

function stateFile(...parts: string[]): string {
  return path.join(getStateDir(), ...parts);
}

export function initState(): void {
  ensureDir(getStateDir());
  ensureDir(stateFile('memory'));
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function storeMemory(namespace: string, key: string, value: string, tags: string[]): StoredMemory {
  initState();
  const memory: StoredMemory = {
    id: createId('mem'),
    namespace,
    key,
    value,
    tags,
    createdAt: new Date().toISOString(),
  };
  appendJsonLine(stateFile('memory', `${namespace}.jsonl`), memory);
  return memory;
}

export function listMemory(namespace: string): StoredMemory[] {
  initState();
  return readJsonLines(stateFile('memory', `${namespace}.jsonl`)) as unknown as StoredMemory[];
}

export function appendTaskEvent(event: TaskEvent): void {
  initState();
  appendJsonLine(stateFile('tasks.jsonl'), event);
}

export function listTaskEvents(): TaskEvent[] {
  initState();
  return readJsonLines(stateFile('tasks.jsonl')) as unknown as TaskEvent[];
}

export function appendSwarm(record: SwarmRecord): void {
  initState();
  appendJsonLine(stateFile('swarms.jsonl'), record);
}

export function listSwarms(): SwarmRecord[] {
  initState();
  return readJsonLines(stateFile('swarms.jsonl')) as unknown as SwarmRecord[];
}

export function appendAgent(record: AgentRecord): void {
  initState();
  appendJsonLine(stateFile('agents.jsonl'), record);
}

export function listAgents(): AgentRecord[] {
  initState();
  return readJsonLines(stateFile('agents.jsonl')) as unknown as AgentRecord[];
}
