#!/usr/bin/env node
import {ensureServersRunning} from './server-manager.js';
import {getAllSpecFiles, groupSpecsByAgent} from './spec-grouper.js';
import {startContinuousLoop} from './orchestrator.js';
import {saveReport} from './html-reporter.js';
import {QA_CONFIG} from './config.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Project root is 3 levels up from src/ → scripts/qa-orchestrator/src/
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

async function main(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  NU-AURA Autonomous QA Orchestrator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Ensure output dir exists
  const reportDir = path.join(PROJECT_ROOT, 'frontend', 'playwright-report', 'autonomous');
  fs.mkdirSync(reportDir, {recursive: true});

  // Step 1: Ensure servers are running
  console.log('\n[1/3] Checking servers...');
  await ensureServersRunning();

  // Step 2: Discover and group specs
  console.log('\n[2/3] Discovering specs...');
  const e2eDir = path.join(PROJECT_ROOT, 'frontend', 'e2e');
  const allSpecs = getAllSpecFiles(e2eDir);
  const groups = groupSpecsByAgent(allSpecs, [...QA_CONFIG.agentGroups]);
  const totalSpecs = allSpecs.length;
  console.log(`    Found ${totalSpecs} spec files across ${Object.keys(groups).length} agent groups`);

  // Step 3: Start continuous loop
  console.log('\n[3/3] Starting continuous test loop...');
  console.log('    Press Ctrl+C to stop\n');

  await startContinuousLoop(groups, {
    cooldownMs: QA_CONFIG.loop.cooldownMs,
    outputDir: reportDir,
    onCycleComplete: (cycle) => {
      const reportPath = saveReport(cycle, reportDir);
      const icon = cycle.releaseDecision === 'PASS' ? '✅' : '🚨';
      console.log(`\n${icon} Cycle ${cycle.cycleId} complete`);
      console.log(`   Decision: ${cycle.releaseDecision}`);
      console.log(`   Results: ${cycle.summary.passed}/${cycle.summary.total} passed`);
      console.log(`   P0: ${cycle.summary.p0}  P1: ${cycle.summary.p1}  P2: ${cycle.summary.p2}`);
      console.log(`   Report: ${reportPath}`);
      console.log(`   Next run in ${QA_CONFIG.loop.cooldownMs / 1000 / 60} minutes\n`);
    },
  });
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
