import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QA_CONFIG } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROBE_TIMEOUT_MS = 3000;
const POLL_INTERVAL_MS = 2000;

/**
 * Probes a single URL with a short timeout.
 * Returns true when the server responds with any HTTP response (ok or not),
 * false when the connection is refused or the probe times out.
 */
export async function checkServer(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(url, { signal: controller.signal });
    return true; // any HTTP response means port is listening
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Polls `url` every POLL_INTERVAL_MS until it responds or timeoutMs elapses.
 * Resolves when the server is up; rejects with a timeout error otherwise.
 */
export async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (true) {
    const up = await checkServer(url);
    if (up) return;
    if (Date.now() >= deadline) {
      throw new Error(`waitForServer timeout: ${url} did not respond within ${timeoutMs}ms`);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Returns the live status of both servers in a single call.
 */
export async function getServerStatus(): Promise<{ frontend: boolean; backend: boolean }> {
  const { frontend, backend } = QA_CONFIG.servers;
  const [frontendUp, backendUp] = await Promise.all([
    checkServer(frontend.url + frontend.healthPath),
    checkServer(backend.url + backend.healthPath),
  ]);
  return { frontend: frontendUp, backend: backendUp };
}

/**
 * Ensures both servers are reachable before tests begin.
 * - Auto-starts the Next.js dev server if it is not running.
 * - Throws if the Spring Boot backend is unreachable (cannot be auto-started).
 */
export async function ensureServersRunning(): Promise<void> {
  const { frontend, backend } = QA_CONFIG.servers;
  const status = await getServerStatus();

  if (!status.backend) {
    throw new Error(
      `Backend is not running at ${backend.url}. ` +
      'Start Spring Boot manually before running the orchestrator.',
    );
  }

  if (!status.frontend) {
    console.log(`[server-manager] Frontend not running — starting: ${frontend.startCmd}`);
    const frontendCwd = path.resolve(__dirname, '..', '..', '..', 'frontend');
    const child = spawn(frontend.startCmd, {
      cwd: frontendCwd,
      detached: true,
      stdio: 'ignore',
      shell: true,
    });
    child.unref();

    console.log(`[server-manager] Waiting for frontend at ${frontend.url} …`);
    await waitForServer(frontend.url + frontend.healthPath, 120_000);
    console.log('[server-manager] Frontend is up.');
  } else {
    console.log('[server-manager] Both servers are running.');
  }
}
