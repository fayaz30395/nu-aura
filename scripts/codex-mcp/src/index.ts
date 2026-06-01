#!/usr/bin/env node
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {SERVER_NAME, SERVER_VERSION} from './config.js';
import {initState} from './core/state.js';
import {registerAgentTools} from './tools/agents.js';
import {registerCapabilitiesTools} from './tools/capabilities.js';
import {registerHookTools} from './tools/hooks.js';
import {registerMemoryTools} from './tools/memory.js';
import {registerSwarmTools} from './tools/swarm.js';

async function main(): Promise<void> {
  initState();

  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerCapabilitiesTools(server);
  registerMemoryTools(server);
  registerHookTools(server);
  registerSwarmTools(server);
  registerAgentTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
