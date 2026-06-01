import * as os from 'node:os';
import * as path from 'node:path';

export const SERVER_NAME = 'nu-aura-codex-mcp-server';
export const SERVER_VERSION = '0.1.0';

export function getRepoRoot(): string {
  return path.resolve(process.env.NU_AURA_REPO_ROOT ?? process.cwd());
}

export function getStateDir(): string {
  return path.resolve(
    process.env.NU_AURA_MCP_STATE_DIR ?? path.join(os.homedir(), '.codex', 'nu-aura-mcp'),
  );
}

export const RESPONSE_FORMATS = ['markdown', 'json'] as const;
export type ResponseFormat = (typeof RESPONSE_FORMATS)[number];
