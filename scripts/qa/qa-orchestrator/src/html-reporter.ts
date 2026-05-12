import * as fs from 'node:fs';
import * as path from 'node:path';
import type {CycleResult, ReleaseDecision, Severity, TestResult} from './severity-classifier.js';

// ── Badge colours ─────────────────────────────────────────────────────────────

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  P0: {bg: '#dc2626', color: '#fff'},
  P1: {bg: '#ea580c', color: '#fff'},
  P2: {bg: '#ca8a04', color: '#fff'},
  PASS: {bg: '#16a34a', color: '#fff'},
  FAIL: {bg: '#dc2626', color: '#fff'},
};

const DEFAULT_BADGE = {bg: '#6b7280', color: '#fff'};

// ── Public API ────────────────────────────────────────────────────────────────

export function generateSummaryBadge(value: ReleaseDecision | Severity): string {
  const style = BADGE_STYLES[value] ?? DEFAULT_BADGE;
  return (
    `<span style="display:inline-block;padding:2px 8px;border-radius:4px;` +
    `font-size:12px;font-weight:700;background:${style.bg};color:${style.color};">` +
    `${value}</span>`
  );
}

export function generateTestRow(test: TestResult): string {
  const statusBg = test.status === 'passed' ? '#16a34a' : '#dc2626';
  const statusLabel = test.status === 'passed' ? 'PASS' : 'FAIL';
  const error = test.errorMessage ? escapeHtml(test.errorMessage.slice(0, 120)) : '—';
  const durationLabel = `${test.durationMs}ms`;

  return `<tr style="border-bottom:1px solid #e5e7eb;">
    <td style="padding:6px 8px;font-size:12px;color:#374151;">${escapeHtml(test.agentGroup ?? '')}</td>
    <td style="padding:6px 8px;font-size:12px;color:#111827;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(test.testTitle ?? '')}</td>
    <td style="padding:6px 8px;text-align:center;">
      <span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;background:${statusBg};color:#fff;">${statusLabel}</span>
    </td>
    <td style="padding:6px 8px;text-align:center;">${generateSummaryBadge(test.severity ?? 'P2')}</td>
    <td style="padding:6px 8px;font-size:12px;color:#6b7280;text-align:right;">${durationLabel}</td>
    <td style="padding:6px 8px;font-size:11px;color:#9ca3af;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${error}</td>
  </tr>`;
}

export function generateReport(cycle: CycleResult): string {
  const ts = cycle.startedAt instanceof Date ? cycle.startedAt : new Date(cycle.startedAt);
  const dateStr = ts.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const isPass = cycle.releaseDecision === 'PASS';
  const decisionBg = isPass ? '#16a34a' : '#dc2626';
  const decisionBanner = isPass
    ? 'READY FOR RELEASE'
    : `BLOCKED — ${cycle.summary.p0} P0 / ${cycle.summary.p1} P1 issues found`;
  const durationSec = (cycle.summary.durationMs / 1000).toFixed(1);

  const p0Tests = cycle.tests.filter((t) => t.status === 'failed' && t.severity === 'P0');
  const p1Tests = cycle.tests.filter((t) => t.status === 'failed' && t.severity === 'P1');
  const p2Tests = cycle.tests.filter((t) => t.status === 'failed' && t.severity === 'P2');

  // ── Agent group cards ─────────────────────────────────────────────────────
  const groups = [...new Set(cycle.tests.map((t) => t.agentGroup))].sort();
  const agentCards = groups
    .map((group) => {
      const groupTests = cycle.tests.filter((t) => t.agentGroup === group);
      const passed = groupTests.filter((t) => t.status === 'passed').length;
      const failed = groupTests.filter((t) => t.status === 'failed').length;
      const p0 = groupTests.filter((t) => t.severity === 'P0' && t.status === 'failed').length;
      const p1 = groupTests.filter((t) => t.severity === 'P1' && t.status === 'failed').length;
      const cardBorder = p0 > 0 ? '#dc2626' : p1 > 0 ? '#ea580c' : '#16a34a';
      return `<div style="border:2px solid ${cardBorder};border-radius:8px;padding:12px 16px;min-width:160px;flex:1;">
        <div style="font-weight:700;font-size:13px;color:#1e3a5f;margin-bottom:8px;">${escapeHtml(group)}</div>
        <div style="font-size:12px;color:#374151;">
          <span style="color:#16a34a;font-weight:600;">${passed} passed</span> /
          <span style="color:#dc2626;font-weight:600;">${failed} failed</span>
        </div>
        ${p0 > 0 ? `<div style="font-size:11px;margin-top:4px;">${generateSummaryBadge('P0')} ×${p0}</div>` : ''}
        ${p1 > 0 ? `<div style="font-size:11px;margin-top:4px;">${generateSummaryBadge('P1')} ×${p1}</div>` : ''}
      </div>`;
    })
    .join('\n');

  // ── Failure sections ──────────────────────────────────────────────────────
  const failureSection = (label: string, tests: TestResult[], bg: string, border: string) => {
    if (tests.length === 0) return '';
    const items = tests
      .map(
        (t) => `<li style="padding:8px 0;border-bottom:1px solid ${border}30;">
          <strong style="font-size:13px;">${escapeHtml(t.testTitle ?? '')}</strong>
          <span style="font-size:11px;color:#6b7280;margin-left:8px;">[${escapeHtml(t.agentGroup ?? '')}]</span>
          ${t.errorMessage ? `<pre style="margin:4px 0 0;font-size:11px;color:#374151;background:#f9fafb;padding:6px;border-radius:4px;overflow:auto;max-height:80px;">${escapeHtml(t.errorMessage.slice(0, 400))}</pre>` : ''}
        </li>`,
      )
      .join('');
    return `<details open style="margin-bottom:16px;">
      <summary style="cursor:pointer;padding:10px 14px;background:${bg};border-radius:6px;font-weight:700;font-size:14px;color:#fff;list-style:none;">
        ${generateSummaryBadge(label as Severity)} &nbsp;${tests.length} failure${tests.length !== 1 ? 's' : ''}
      </summary>
      <ul style="list-style:none;margin:0;padding:12px 16px;background:#fafafa;border:1px solid ${border};border-top:none;border-radius:0 0 6px 6px;">
        ${items}
      </ul>
    </details>`;
  };

  // ── All-tests table ───────────────────────────────────────────────────────
  const allRows = cycle.tests.map(generateTestRow).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NU-AURA QA Report — ${escapeHtml(cycle.cycleId)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #f3f4f6; color: #111827; }
    .container { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #1e3a5f; color: #fff; font-size: 12px; font-weight: 600; padding: 8px 8px; text-align: left; }
    details summary::-webkit-details-marker { display: none; }
    @media print { body { background: #fff; } }
  </style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);border-radius:12px;padding:24px 28px;margin-bottom:20px;color:#fff;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.8;margin-bottom:4px;">NU-AURA Autonomous QA Report</div>
    <div style="font-size:22px;font-weight:700;margin-bottom:8px;">${escapeHtml(cycle.cycleId)}</div>
    <div style="font-size:12px;opacity:0.75;">${dateStr} &nbsp;|&nbsp; Duration: ${durationSec}s</div>
    <div style="margin-top:12px;">${generateSummaryBadge(cycle.releaseDecision)}</div>
  </div>

  <!-- Release Decision Banner -->
  <div style="background:${decisionBg};border-radius:8px;padding:14px 20px;margin-bottom:20px;text-align:center;color:#fff;font-size:16px;font-weight:700;letter-spacing:0.5px;">
    ${escapeHtml(decisionBanner)}
  </div>

  <!-- Summary Bar -->
  <div style="background:#fff;border-radius:8px;padding:16px 20px;margin-bottom:20px;display:flex;flex-wrap:wrap;gap:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    ${summaryTile('Total', String(cycle.summary.total), '#1e3a5f')}
    ${summaryTile('Passed', String(cycle.summary.passed), '#16a34a')}
    ${summaryTile('Failed', String(cycle.summary.failed), '#dc2626')}
    ${summaryTile('P0', String(cycle.summary.p0), '#dc2626')}
    ${summaryTile('P1', String(cycle.summary.p1), '#ea580c')}
    ${summaryTile('P2', String(cycle.summary.p2), '#ca8a04')}
    ${summaryTile('Duration', durationSec + 's', '#2563eb')}
  </div>

  <!-- Agent Group Cards -->
  <div style="background:#fff;border-radius:8px;padding:16px 20px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="font-size:14px;font-weight:700;color:#1e3a5f;margin-bottom:12px;">Agent Groups</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;">
      ${agentCards}
    </div>
  </div>

  <!-- Failures by Severity -->
  <div style="background:#fff;border-radius:8px;padding:16px 20px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="font-size:14px;font-weight:700;color:#1e3a5f;margin-bottom:12px;">Failures by Severity</div>
    ${failureSection('P0', p0Tests, '#dc2626', '#dc2626')}
    ${failureSection('P1', p1Tests, '#ea580c', '#ea580c')}
    ${failureSection('P2', p2Tests, '#ca8a04', '#ca8a04')}
    ${p0Tests.length === 0 && p1Tests.length === 0 && p2Tests.length === 0
    ? '<p style="color:#16a34a;font-size:13px;font-weight:600;">No failures — all tests passed.</p>'
    : ''}
  </div>

  <!-- All Tests Table -->
  <div style="background:#fff;border-radius:8px;padding:16px 20px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow-x:auto;">
    <div style="font-size:14px;font-weight:700;color:#1e3a5f;margin-bottom:12px;">All Tests (${cycle.summary.total})</div>
    <table>
      <thead>
        <tr>
          <th>Agent Group</th>
          <th>Test Name</th>
          <th style="text-align:center;">Status</th>
          <th style="text-align:center;">Severity</th>
          <th style="text-align:right;">Duration</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody>
        ${allRows}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div style="text-align:center;font-size:11px;color:#9ca3af;padding-bottom:16px;">
    Generated by NU-AURA Autonomous QA Orchestrator &nbsp;|&nbsp; ${dateStr}
  </div>

</div>
</body>
</html>`;
}

export function saveReport(cycle: CycleResult, outputDir: string): string {
  const ts = cycle.startedAt instanceof Date ? cycle.startedAt : new Date(cycle.startedAt);
  const datePart = ts.toISOString().slice(0, 10); // YYYY-MM-DD
  const timePart = ts.toISOString().slice(11, 19).replace(/:/g, '-'); // HH-mm-ss
  const filename = `qa-report-${datePart}-${timePart}.html`;
  const filePath = path.join(outputDir, filename);

  fs.mkdirSync(outputDir, {recursive: true});
  fs.writeFileSync(filePath, generateReport(cycle), 'utf8');

  return filePath;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function summaryTile(label: string, value: string, color: string): string {
  return `<div style="text-align:center;min-width:72px;">
    <div style="font-size:22px;font-weight:700;color:${color};">${value}</div>
    <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
  </div>`;
}
