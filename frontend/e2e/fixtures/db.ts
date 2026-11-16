import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const PSQL_BIN = process.env.E2E_PSQL_BIN ?? '/opt/homebrew/opt/postgresql@16/bin/psql';
const ENV_FILE = process.env.E2E_DB_ENV_FILE ?? `${process.env.HOME}/.config/nu-aura/local-db.env`;
const DEFAULT_TENANT = '660e8400-e29b-41d4-a716-446655440001';

/** E2E_DB=0 turns DB access off; callers must check `isDbEnabled()` before use. */
export function isDbEnabled(): boolean {
  return process.env.E2E_DB !== '0';
}

function loadDbEnv(): Record<string, string> {
  const pairs = readFileSync(ENV_FILE, 'utf8')
    .split('\n')
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()] as const);
  return Object.fromEntries(pairs);
}

/**
 * Read-only SQL against the local dev DB as the app role.
 * RLS needs the tenant GUC, so the query runs inside a READ ONLY transaction that sets it.
 */
export function sql(query: string, tenant: string = DEFAULT_TENANT): string {
  const env = loadDbEnv();
  const url = new URL(env.SPRING_DATASOURCE_URL.replace('jdbc:', ''));
  const input = [
    'BEGIN READ ONLY;',
    `SELECT set_config('app.current_tenant_id','${tenant}',true) AS x \\g /dev/null`,
    `${query};`,
    'COMMIT;',
  ].join('\n');
  try {
    return execFileSync(
      PSQL_BIN,
      ['-h', url.hostname, '-p', url.port || '5432', '-U', env.SPRING_DATASOURCE_USERNAME,
        '-d', url.pathname.slice(1), '-At', '-F', '|', '-q', '-v', 'ON_ERROR_STOP=1'],
      {env: {...process.env, PGPASSWORD: env.SPRING_DATASOURCE_PASSWORD}, input, stdio: ['pipe', 'pipe', 'pipe']},
    ).toString().trim();
  } catch (error) {
    const stderr = (error as {stderr?: Buffer}).stderr?.toString().split('\n')[0] ?? String(error);
    throw new Error(`SQL failed: ${stderr}`);
  }
}
