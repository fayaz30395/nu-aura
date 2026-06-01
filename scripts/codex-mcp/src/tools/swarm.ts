import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {RESPONSE_FORMATS, type ResponseFormat} from '../config.js';
import {bulletList, formatResult} from '../core/format.js';
import {buildStartWorkCommand, routeTask} from '../core/routing.js';
import {appendSwarm, createId, listSwarms} from '../core/state.js';

const ResponseFormatSchema = z.enum(RESPONSE_FORMATS).default('markdown');

export function registerSwarmTools(server: McpServer): void {
  server.registerTool(
    'nuaura_swarm_init',
    {
      title: 'Plan NU-AURA Codex Swarm',
      description:
        'Create a Codex-readable swarm plan using NU-AURA routing rules and existing docs/swarm workflow YAMLs. This records a plan; it does not spawn external LLM workers.',
      inputSchema: z.object({
        task: z.string().min(2).max(1000).describe('Task to plan.'),
        topology: z
          .enum(['hierarchical', 'mesh', 'hierarchical-mesh'])
          .default('hierarchical')
          .describe('Requested topology. Codex plan records the value; workflow YAML remains source of truth.'),
        strategy: z
          .enum(['specialized', 'balanced', 'adaptive'])
          .default('specialized')
          .describe('Requested strategy.'),
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
      task,
      topology,
      strategy,
      response_format,
    }: {
      task: string;
      topology: string;
      strategy: string;
      response_format: ResponseFormat;
    }) => {
      const decision = routeTask(task);
      const swarmId = createId('swarm');
      const record = {
        swarmId,
        createdAt: new Date().toISOString(),
        task,
        topology,
        strategy,
        pipeline: decision.pipeline,
        agents: decision.agents,
        status: 'planned' as const,
      };
      appendSwarm(record);
      const command = buildStartWorkCommand(decision, task);
      const markdown = [
        `# NU-AURA Codex Swarm ${swarmId}`,
        '',
        `Pipeline: ${decision.pipeline}`,
        `Workflow: ${decision.workflowPath ?? 'direct Codex execution'}`,
        `Topology: ${topology}`,
        `Strategy: ${strategy}`,
        '',
        'Agents:',
        bulletList(decision.agents),
        '',
        command ? `Dry-run command: \`${command}\`` : 'Dry-run command: direct Codex execution.',
      ].join('\n');
      return formatResult({swarm: record, decision, command}, markdown, response_format);
    },
  );

  server.registerTool(
    'nuaura_swarm_status',
    {
      title: 'List NU-AURA Codex Swarms',
      description: 'List locally recorded NU-AURA Codex swarm plans.',
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
      const swarms = listSwarms().slice(-limit).reverse();
      const markdown =
        swarms.length === 0
          ? 'No NU-AURA Codex swarm plans recorded.'
          : [
              '# NU-AURA Codex Swarm Plans',
              '',
              ...swarms.map((swarm) => `- \`${swarm.swarmId}\` ${swarm.pipeline}: ${swarm.task}`),
            ].join('\n');
      return formatResult({count: swarms.length, swarms}, markdown, response_format);
    },
  );
}
