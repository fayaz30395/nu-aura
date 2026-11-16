// Lists (default) or deletes NUAURA_TEST_ data created by E2E runs.
// Usage: node scripts/e2e-cleanup.mjs            -> dry run, prints counts
//        node scripts/e2e-cleanup.mjs --apply    -> deletes (not run by default)
// Table list is a placeholder until verified against the schema; see docs/release-readiness/evidence/test-data-e2e.md.
const APPLY = process.argv.includes('--apply');
const PREFIX = 'NUAURA_TEST_';
const TABLES = []; // [table, column] pairs, filled after schema check

if (TABLES.length === 0) {
  console.log(`No cleanup tables configured (prefix ${PREFIX}). Nothing to do.`);
  process.exit(0);
}
console.log(APPLY ? 'APPLY mode' : 'DRY RUN (no deletes)');
