import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {RESPONSE_FORMATS, type ResponseFormat} from '../config.js';
import {formatResult} from '../core/format.js';
import {searchKnowledge} from '../core/knowledge.js';
import {listMemory, storeMemory} from '../core/state.js';

const ResponseFormatSchema = z.enum(RESPONSE_FORMATS).default('markdown');

export function registerMemoryTools(server: McpServer): void {
  server.registerTool(
    'nuaura_memory_search',
    {
      title: 'Search NU-AURA Memory',
      description:
        'Search NU-AURA repo knowledge and Codex MCP stored memory by text relevance. Reads AGENTS, CLAUDE, MEMORY, ADRs, patterns, security baseline, and swarm docs.',
      inputSchema: z.object({
        query: z.string().min(2).max(400).describe('Search query, for example "RBAC SuperAdmin bypass".'),
        namespace: z.string().min(1).max(80).default('patterns').describe('Stored memory namespace to include.'),
        limit: z.number().int().min(1).max(25).default(8).describe('Maximum hits to return.'),
        response_format: ResponseFormatSchema.describe('Output format: markdown or json.'),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({
      query,
      namespace,
      limit,
      response_format,
    }: {
      query: string;
      namespace: string;
      limit: number;
      response_format: ResponseFormat;
    }) => {
      const hits = searchKnowledge(query, limit, namespace);
      const markdown =
        hits.length === 0
          ? `No NU-AURA memory hits for "${query}".`
          : [
              `# NU-AURA Memory Search: ${query}`,
              '',
              ...hits.map((hit, index) => {
                const location =
                  hit.source === 'repo'
                    ? `${hit.path}:${hit.lineStart ?? 1}`
                    : `${hit.namespace}:${hit.key}`;
                return [
                  `## ${index + 1}. ${location}`,
                  `Score: ${hit.score}`,
                  '',
                  '```text',
                  hit.text,
                  '```',
                ].join('\n');
              }),
            ].join('\n\n');

      return formatResult({query, namespace, count: hits.length, hits}, markdown, response_format);
    },
  );

  server.registerTool(
    'nuaura_memory_store',
    {
      title: 'Store NU-AURA Memory',
      description:
        'Persist a reusable NU-AURA pattern or task note in the Codex MCP state directory. Does not edit project MEMORY.md.',
      inputSchema: z.object({
        namespace: z.string().min(1).max(80).default('patterns').describe('Memory namespace.'),
        key: z.string().min(1).max(120).describe('Stable memory key.'),
        value: z.string().min(1).max(4000).describe('Memory value to store.'),
        tags: z.array(z.string().min(1).max(40)).max(20).default([]).describe('Search tags.'),
        response_format: ResponseFormatSchema.describe('Output format: markdown or json.'),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({
      namespace,
      key,
      value,
      tags,
      response_format,
    }: {
      namespace: string;
      key: string;
      value: string;
      tags: string[];
      response_format: ResponseFormat;
    }) => {
      const memory = storeMemory(namespace, key, value, tags);
      const markdown = `Stored NU-AURA memory \`${namespace}:${key}\` at ${memory.createdAt}.`;
      return formatResult({memory}, markdown, response_format);
    },
  );

  server.registerTool(
    'nuaura_memory_list',
    {
      title: 'List NU-AURA Stored Memory',
      description: 'List Codex MCP memories stored in the local NU-AURA MCP state directory.',
      inputSchema: z.object({
        namespace: z.string().min(1).max(80).default('patterns').describe('Memory namespace.'),
        limit: z.number().int().min(1).max(100).default(20).describe('Maximum entries to return.'),
        response_format: ResponseFormatSchema.describe('Output format: markdown or json.'),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({
      namespace,
      limit,
      response_format,
    }: {
      namespace: string;
      limit: number;
      response_format: ResponseFormat;
    }) => {
      const memories = listMemory(namespace).slice(-limit).reverse();
      const markdown =
        memories.length === 0
          ? `No stored NU-AURA memories in namespace \`${namespace}\`.`
          : [
              `# NU-AURA Stored Memory: ${namespace}`,
              '',
              ...memories.map((memory) => `- \`${memory.key}\` (${memory.createdAt})`),
            ].join('\n');
      return formatResult({namespace, count: memories.length, memories}, markdown, response_format);
    },
  );
}
