import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {RESPONSE_FORMATS, type ResponseFormat} from '../config.js';
import {formatResult} from '../core/format.js';
import {appendAgent, createId, listAgents} from '../core/state.js';

const ResponseFormatSchema = z.enum(RESPONSE_FORMATS).default('markdown');

export function registerAgentTools(server: McpServer): void {
  server.registerTool(
    'nuaura_agent_spawn',
    {
      title: 'Record NU-AURA Agent Plan',
      description:
        'Record a named agent work item for Codex coordination. This is a local planning primitive and does not launch an external process.',
      inputSchema: z.object({
        agent_type: z
          .string()
          .min(1)
          .max(80)
          .describe('Agent role, for example researcher, coder, tester, reviewer.'),
        task: z.string().min(2).max(1000).describe('Agent task.'),
        model: z
          .enum(['inherit', 'fast', 'balanced', 'deep'])
          .default('inherit')
          .describe('Codex execution preference for this work item.'),
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
      agent_type,
      task,
      model,
      response_format,
    }: {
      agent_type: string;
      task: string;
      model: string;
      response_format: ResponseFormat;
    }) => {
      const record = {
        agentId: createId(agent_type.replace(/[^a-z0-9_-]/gi, '-').toLowerCase()),
        createdAt: new Date().toISOString(),
        agentType: agent_type,
        task,
        model,
        status: 'planned' as const,
      };
      appendAgent(record);
      const markdown = [
        `Recorded agent plan \`${record.agentId}\`.`,
        `Type: ${record.agentType}`,
        `Model preference: ${record.model}`,
      ].join('\n');
      return formatResult({agent: record}, markdown, response_format);
    },
  );

  server.registerTool(
    'nuaura_agent_list',
    {
      title: 'List NU-AURA Agent Plans',
      description: 'List locally recorded NU-AURA Codex agent work items.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(10).describe('Maximum records to return.'),
        response_format: ResponseFormatSchema.describe('Output format: markdown or json.'),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({limit, response_format}: {limit: number; response_format: ResponseFormat}) => {
      const agents = listAgents().slice(-limit).reverse();
      const markdown =
        agents.length === 0
          ? 'No NU-AURA Codex agent plans recorded.'
          : [
              '# NU-AURA Agent Plans',
              '',
              ...agents.map((agent) => `- \`${agent.agentId}\` ${agent.agentType}: ${agent.task}`),
            ].join('\n');
      return formatResult({count: agents.length, agents}, markdown, response_format);
    },
  );
}
