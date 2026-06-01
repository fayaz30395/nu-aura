import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {RESPONSE_FORMATS, type ResponseFormat} from '../config.js';
import {bulletList, formatResult} from '../core/format.js';

const ResponseFormatSchema = z.enum(RESPONSE_FORMATS).default('markdown');

export function registerCapabilitiesTools(server: McpServer): void {
  server.registerTool(
    'nuaura_guidance_capabilities',
    {
      title: 'List NU-AURA Codex MCP Capabilities',
      description:
        'List the Codex-local NU-AURA MCP capability areas and when to use each tool family.',
      inputSchema: z.object({
        area: z
          .enum(['all', 'memory', 'hooks', 'swarm', 'agents'])
          .default('all')
          .describe('Capability area to filter. Use all for the complete list.'),
        response_format: ResponseFormatSchema.describe('Output format: markdown or json.'),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({area, response_format}: {area: string; response_format: ResponseFormat}) => {
      const capabilities = [
        {
          area: 'memory',
          tools: ['nuaura_memory_search', 'nuaura_memory_store', 'nuaura_memory_list'],
          useWhen: 'Find or persist NU-AURA repo patterns, task notes, or project rules.',
        },
        {
          area: 'hooks',
          tools: ['nuaura_hooks_route', 'nuaura_hooks_pre_task', 'nuaura_hooks_post_task'],
          useWhen: 'Route a task, build the required context checklist, and record outcomes.',
        },
        {
          area: 'swarm',
          tools: ['nuaura_swarm_init', 'nuaura_swarm_status'],
          useWhen: 'Create a Codex-readable swarm plan from the existing NU-AURA workflow YAMLs.',
        },
        {
          area: 'agents',
          tools: ['nuaura_agent_spawn', 'nuaura_agent_list'],
          useWhen: 'Track named agent work items for Codex coordination without a Ruflo daemon.',
        },
      ].filter((capability) => area === 'all' || capability.area === area);

      const markdown = [
        '# NU-AURA Codex MCP Capabilities',
        '',
        ...capabilities.flatMap((capability) => [
          `## ${capability.area}`,
          capability.useWhen,
          '',
          bulletList(capability.tools),
          '',
        ]),
      ].join('\n');

      return formatResult({capabilities}, markdown, response_format);
    },
  );
}
