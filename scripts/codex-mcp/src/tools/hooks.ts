import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {RESPONSE_FORMATS, type ResponseFormat} from '../config.js';
import {bulletList, formatResult} from '../core/format.js';
import {buildStartWorkCommand, routeTask} from '../core/routing.js';
import {appendTaskEvent, createId, storeMemory} from '../core/state.js';

const ResponseFormatSchema = z.enum(RESPONSE_FORMATS).default('markdown');

function contextChecklist(securitySensitive: boolean): string[] {
  const common = [
    'Read AGENTS.md, CLAUDE.md, MEMORY.md.',
    'Read tools/PROCESS-RULES.md, tools/CONSTRAINT.md, tools/MERMAID.md.',
    'Check docs/adr/README.md before design decisions.',
    'Check docs/patterns/README.md before implementation.',
    'Read every file before editing it.',
    'Run focused validation before broad checks.',
  ];
  return securitySensitive ? [...common, 'Read docs/security/baseline.md before editing.'] : common;
}

export function registerHookTools(server: McpServer): void {
  server.registerTool(
    'nuaura_hooks_route',
    {
      title: 'Route NU-AURA Task',
      description:
        'Route a NU-AURA task to the appropriate Codex workflow, reasoning effort, and existing swarm YAML.',
      inputSchema: z.object({
        task: z.string().min(2).max(1000).describe('Task description to route.'),
        changed_files: z.array(z.string()).max(100).default([]).describe('Optional changed file paths.'),
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
      task,
      changed_files,
      response_format,
    }: {
      task: string;
      changed_files: string[];
      response_format: ResponseFormat;
    }) => {
      const decision = routeTask(task, changed_files);
      const command = buildStartWorkCommand(decision, task);
      const markdown = [
        '# NU-AURA Task Route',
        '',
        `Pipeline: ${decision.pipeline}`,
        `Confidence: ${Math.round(decision.confidence * 100)}%`,
        `Reasoning effort: ${decision.reasoningEffort}`,
        `Reason: ${decision.reason}`,
        '',
        'Agents:',
        bulletList(decision.agents),
        '',
        command ? `Dry-run command: \`${command}\`` : 'Dry-run command: direct Codex execution.',
      ].join('\n');
      return formatResult({decision, command}, markdown, response_format);
    },
  );

  server.registerTool(
    'nuaura_hooks_pre_task',
    {
      title: 'Start NU-AURA Task Hook',
      description:
        'Record a task start, return the route decision, and provide the mandatory context checklist for Codex.',
      inputSchema: z.object({
        task_id: z.string().min(1).max(120).optional().describe('Stable task id. Generated when omitted.'),
        task: z.string().min(2).max(1000).describe('Task description.'),
        changed_files: z.array(z.string()).max(100).default([]).describe('Optional changed file paths.'),
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
      task_id,
      task,
      changed_files,
      response_format,
    }: {
      task_id?: string;
      task: string;
      changed_files: string[];
      response_format: ResponseFormat;
    }) => {
      const taskId = task_id ?? createId('task');
      const decision = routeTask(task, changed_files);
      const checklist = contextChecklist(decision.pipeline === 'security');
      appendTaskEvent({
        taskId,
        kind: 'pre_task',
        timestamp: new Date().toISOString(),
        payload: {task, changed_files, decision, checklist},
      });
      const markdown = [
        `# Started NU-AURA Task ${taskId}`,
        '',
        `Pipeline: ${decision.pipeline}`,
        `Reason: ${decision.reason}`,
        '',
        'Required context:',
        bulletList(checklist),
      ].join('\n');
      return formatResult({taskId, decision, checklist}, markdown, response_format);
    },
  );

  server.registerTool(
    'nuaura_hooks_post_task',
    {
      title: 'Complete NU-AURA Task Hook',
      description:
        'Record a NU-AURA task outcome and optionally store a reusable memory pattern for future Codex runs.',
      inputSchema: z.object({
        task_id: z.string().min(1).max(120).describe('Task id from nuaura_hooks_pre_task.'),
        success: z.boolean().describe('Whether the task succeeded.'),
        summary: z.string().min(1).max(2000).describe('Evidence-backed outcome summary.'),
        memory_key: z.string().min(1).max(120).optional().describe('Optional memory key to store.'),
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
      task_id,
      success,
      summary,
      memory_key,
      response_format,
    }: {
      task_id: string;
      success: boolean;
      summary: string;
      memory_key?: string;
      response_format: ResponseFormat;
    }) => {
      appendTaskEvent({
        taskId: task_id,
        kind: 'post_task',
        timestamp: new Date().toISOString(),
        payload: {success, summary, memory_key},
      });
      const memory = memory_key
        ? storeMemory('patterns', memory_key, summary, ['post-task', success ? 'success' : 'failure'])
        : undefined;
      const markdown = [
        `Recorded task ${task_id}: ${success ? 'success' : 'failure'}.`,
        memory ? `Stored pattern memory \`patterns:${memory.key}\`.` : 'No memory stored.',
      ].join('\n');
      return formatResult({taskId: task_id, success, memory}, markdown, response_format);
    },
  );
}
