import type {ResponseFormat} from '../config.js';

export interface ToolResult<T extends Record<string, unknown>> {
  [key: string]: unknown;
  content: Array<{type: 'text'; text: string}>;
  structuredContent: T;
}

export function formatResult<T extends Record<string, unknown>>(
  output: T,
  markdown: string,
  responseFormat: ResponseFormat,
): ToolResult<T> {
  return {
    content: [
      {
        type: 'text',
        text: responseFormat === 'json' ? JSON.stringify(output, null, 2) : markdown,
      },
    ],
    structuredContent: output,
  };
}

export function bulletList(values: string[]): string {
  if (values.length === 0) return '- None';
  return values.map((value) => `- ${value}`).join('\n');
}
