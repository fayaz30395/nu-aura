import {test as base} from '@playwright/test';

export const TEST_DATA_PREFIX = 'NUAURA_TEST_';

export interface TrackedRecord {
  /** Human label, e.g. "leave request". */
  kind: string;
  /** Record id or business key that carries the NUAURA_TEST_ prefix. */
  key: string;
}

/**
 * Fixture that records every test-created record and reports leftovers.
 * Cleanup itself is done by scripts/e2e-cleanup.mjs (dry-run by default).
 */
export const test = base.extend<{track: (record: TrackedRecord) => void; tracked: TrackedRecord[]}>({
  tracked: async ({}, use) => {
    const records: TrackedRecord[] = [];
    await use(records);
  },
  track: async ({tracked}, use) => {
    await use((record) => {
      if (!record.key.startsWith(TEST_DATA_PREFIX)) {
        throw new Error(`track(): key must start with ${TEST_DATA_PREFIX}: ${record.key}`);
      }
      tracked.push(record);
    });
  },
});
