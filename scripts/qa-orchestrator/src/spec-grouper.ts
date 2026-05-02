import * as fs from 'node:fs';
import * as path from 'node:path';
import { QA_CONFIG } from './config.js';

/**
 * Reads the e2e directory and returns full paths of every `*.spec.ts` file,
 * excluding `*.setup.ts` and non-spec TypeScript files.
 */
export function getAllSpecFiles(e2eDir: string): string[] {
  const entries = fs.readdirSync(e2eDir) as unknown as string[];
  return entries
    .filter((name) => name.endsWith('.spec.ts') && !name.endsWith('.setup.ts'))
    .map((name) => path.join(e2eDir, name));
}

/**
 * Assigns each spec path to the first matching agent group (by priority order).
 * Matching is done on the basename so directory paths don't interfere.
 * Each spec appears in exactly one group.
 */
export function groupSpecsByAgent(
  specs: string[],
  groups: typeof QA_CONFIG.agentGroups,
): Record<string, string[]> {
  // Initialise every group bucket
  const result: Record<string, string[]> = {};
  for (const g of groups) {
    result[g.name] = [];
  }

  for (const specPath of specs) {
    const base = path.basename(specPath);
    const matched = groups.find((g) => g.pattern.test(base));
    if (matched) {
      result[matched.name].push(specPath);
    }
  }

  return result;
}

/**
 * Returns spec paths that do not match any agent group pattern.
 * Ideally empty — non-empty result signals a gap in agentGroups config.
 */
export function getUnassignedSpecs(
  specs: string[],
  groups: typeof QA_CONFIG.agentGroups,
): string[] {
  return specs.filter((specPath) => {
    const base = path.basename(specPath);
    return !groups.some((g) => g.pattern.test(base));
  });
}
