'use client';

import React, {useEffect} from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle,
  Clock,
  Download,
  Lock,
  MoreHorizontal,
  Percent,
  Play,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';

import {AppLayout} from '@/components/layout';
import {PageTransition, Reveal, Stagger, StaggerItem} from '@/components/motion';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {Card} from '@/components/ui/Card';
import {Stat} from '@/components/ui/Stat';
import type {StatDeltaDir} from '@/components/ui/Stat';
import {Skeleton} from '@/components/ui/Skeleton';
import {Donut} from '@/components/charts/aura';
import {usePayrollRuns} from '@/lib/hooks/queries/usePayroll';
import type {PayrollRun, PayrollRunStatus} from '@/lib/types/hrms/payroll';
import type {StatusMeta} from '@/lib/status/vocabulary';
import {formatCurrency, formatDate} from '@/lib/utils';

// Compact INR for headline numbers — full precision lives on the runs page.
function formatCompactINR(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)} K`;
  return `₹${amount.toFixed(0)}`;
}

function formatINR0(amount: number): string {
  return formatCurrency(amount, 'INR', {maximumFractionDigits: 0});
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Signed percentage change of `current` vs `prior`; null when no prior basis exists. */
function computePctDelta(current: number, prior: number): number | null {
  if (!Number.isFinite(prior) || prior <= 0) return null;
  return round1(((current - prior) / prior) * 100);
}

/** Map a signed numeric move to the Stat delta direction. */
function deltaDirOf(n: number): StatDeltaDir {
  if (n > 0) return 'up';
  if (n < 0) return 'down';
  return 'flat';
}

const STATUS_LABEL: Record<PayrollRunStatus, string> = {
  DRAFT: 'Draft',
  PROCESSING: 'Processing',
  PROCESSED: 'Processed',
  APPROVED: 'Approved',
  LOCKED: 'Locked',
};

// Local run-status vocabulary for the canonical StatusBadge (color + icon + label).
// Mirrors the prototype STATUS_VARIANT mapping onto the real run lifecycle.
const PAYROLL_RUN_STATUS: Record<string, StatusMeta> = {
  DRAFT: {label: 'Draft', tone: 'neutral', icon: AlertCircle},
  PROCESSING: {label: 'Processing', tone: 'info', icon: Clock},
  PROCESSED: {label: 'Processed', tone: 'info', icon: CheckCircle},
  APPROVED: {label: 'Approved', tone: 'success', icon: CheckCircle},
  LOCKED: {label: 'Paid', tone: 'success', icon: Lock},
};

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const {isReady: permReady} = usePermissions();

  useEffect(() => {
    document.title = 'Payroll | NU-AURA';
  }, []);

  const {data: runsPage, isLoading, error} = usePayrollRuns(0, 10, undefined, permReady);

  if (!permReady) return null;

  const runs: PayrollRun[] = runsPage?.content ?? [];
  const latest = runs[0];

  // Derived KPIs — all from real run data, no fabricated figures.
  const ytdGross = runs.reduce((sum, r) => sum + (r.totalGrossAmount ?? 0), 0);
  const latestEmployees = latest?.totalEmployees ?? 0;
  const avgCostPerEmployee = latest && latestEmployees > 0 ? latest.totalGrossAmount / latestEmployees : 0;
  const effectiveRate = latest && latest.totalGrossAmount > 0
    ? (latest.totalDeductions / latest.totalGrossAmount) * 100
    : 0;
  const priorRun = runs[1];

  // Run-over-run deltas — derived strictly from real latest/prior figures, so the
  // delta pills the design calls for carry truthful trend data (or stay absent).
  const priorEmployees = priorRun?.totalEmployees ?? 0;
  const priorAvgCost = priorRun && priorEmployees > 0 ? priorRun.totalGrossAmount / priorEmployees : 0;
  const priorRate = priorRun && priorRun.totalGrossAmount > 0
    ? (priorRun.totalDeductions / priorRun.totalGrossAmount) * 100
    : 0;
  const grossDelta = computePctDelta(latest?.totalGrossAmount ?? 0, priorRun?.totalGrossAmount ?? 0);
  const avgCostDelta = computePctDelta(avgCostPerEmployee, priorAvgCost);
  // Effective-rate move is reported in percentage points (not a % of a %).
  const rateDelta = priorRun ? round1(effectiveRate - priorRate) : null;
  const headcountDelta = priorRun ? latestEmployees - priorEmployees : null;

  return (
    <AppLayout activeMenuItem="payroll">
      <PageTransition className="mx-auto w-full max-w-7xl px-6 py-8 space-y-4">
        <PageHeader latest={latest} />

        {error && (
          <ErrorBanner
            message={error instanceof Error ? error.message : 'Failed to load payroll data'}
          />
        )}

        {/* Current-run banner */}
        {isLoading ? (
          <BannerSkeleton />
        ) : error ? null : latest ? (
          <Reveal>
            <CurrentRunBanner run={latest} />
          </Reveal>
        ) : (
          <EmptyBanner />
        )}

        {/* KPI row (4) */}
        {isLoading ? (
          <KpiSkeleton />
        ) : (
          <Stagger className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem>
              <Card padding="md" hover className="h-full">
                <Stat
                  icon={<Wallet className="h-[18px] w-[18px]" />}
                  iconTone="accent"
                  label="YTD gross"
                  value={formatCompactINR(ytdGross)}
                  delta={grossDelta != null ? `${Math.abs(grossDelta)}%` : undefined}
                  deltaDir={grossDelta != null ? deltaDirOf(grossDelta) : undefined}
                  foot={`Across ${runs.length} ${runs.length === 1 ? 'run' : 'runs'}`}
                />
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card padding="md" hover className="h-full">
                <Stat
                  icon={<Banknote className="h-[18px] w-[18px]" />}
                  iconTone="success"
                  label="Avg cost / employee"
                  value={formatCompactINR(avgCostPerEmployee)}
                  delta={avgCostDelta != null ? `${Math.abs(avgCostDelta)}%` : undefined}
                  deltaDir={avgCostDelta != null ? deltaDirOf(avgCostDelta) : undefined}
                  foot="Latest run, fully loaded"
                />
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card padding="md" hover className="h-full">
                <Stat
                  icon={<Percent className="h-[18px] w-[18px]" />}
                  iconTone="warning"
                  label="Effective deduction rate"
                  value={`${effectiveRate.toFixed(1)}%`}
                  delta={rateDelta != null ? `${rateDelta > 0 ? '+' : ''}${rateDelta}pp` : undefined}
                  deltaDir={rateDelta != null ? deltaDirOf(rateDelta) : undefined}
                  foot="Statutory + deductions"
                />
              </Card>
            </StaggerItem>
            <StaggerItem>
              <Card padding="md" hover className="h-full">
                <Stat
                  icon={<Users className="h-[18px] w-[18px]" />}
                  iconTone="info"
                  label="On this run"
                  value={latestEmployees.toLocaleString('en-IN')}
                  delta={
                    headcountDelta != null && headcountDelta !== 0
                      ? `${headcountDelta > 0 ? '+' : ''}${headcountDelta.toLocaleString('en-IN')}`
                      : undefined
                  }
                  deltaDir={headcountDelta != null ? deltaDirOf(headcountDelta) : undefined}
                  foot={
                    priorRun
                      ? `vs. prior ${priorRun.totalEmployees.toLocaleString('en-IN')}`
                      : 'Current cycle'
                  }
                />
              </Card>
            </StaggerItem>
          </Stagger>
        )}

        {/* Row: cost by run (share) · pay composition */}
        {!isLoading && latest && (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[2fr_1fr]">
            <Reveal>
              <CostByRunCard runs={runs} />
            </Reveal>
            <Reveal>
              <PayCompositionCard run={latest} />
            </Reveal>
          </div>
        )}

        {/* Run history */}
        {!isLoading && runs.length > 0 && (
          <Reveal>
            <RunHistoryCard runs={runs} />
          </Reveal>
        )}
      </PageTransition>
    </AppLayout>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
function PageHeader({latest}: {latest?: PayrollRun}) {
  const sub = latest
    ? `${latest.runName} · ${STATUS_LABEL[latest.status].toLowerCase()} · pays ${formatDate(latest.paymentDate)}`
    : 'No active cycle — start a new run to begin.';

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <h1 className="text-aura-title text-[var(--text-1)]">Payroll</h1>
        <p className="text-sm text-[var(--text-3)]">{sub}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/payroll/payslips">
          <Button variant="ghost" leftIcon={<Download className="h-4 w-4" />}>
            Export
          </Button>
        </Link>
        <Link href="/payroll/structures">
          <Button variant="ghost" leftIcon={<Settings2 className="h-4 w-4" />}>
            Configure
          </Button>
        </Link>
        <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
          <Link href="/payroll/runs?action=new">
            <Button
              variant="primary"
              leftIcon={<Play className="h-4 w-4" />}
              onClick={() => window.nuToast?.('Payroll run started', {msg: 'Cycle is now calculating.', type: 'info'})}
            >
              Run Payroll
            </Button>
          </Link>
        </PermissionGate>
      </div>
    </header>
  );
}

// ── Current-run banner ───────────────────────────────────────────────────────
const RUN_STAGES: PayrollRunStatus[] = ['DRAFT', 'PROCESSING', 'PROCESSED', 'APPROVED', 'LOCKED'];
const STAGE_LABEL: Record<PayrollRunStatus, string> = {
  DRAFT: 'Inputs locked',
  PROCESSING: 'Calculated',
  PROCESSED: 'Review',
  APPROVED: 'Approved',
  LOCKED: 'Paid',
};

function CurrentRunBanner({run}: {run: PayrollRun}) {
  const activeIndex = RUN_STAGES.indexOf(run.status);
  const badgeMeta = PAYROLL_RUN_STATUS[run.status];
  const stageDotClass = {
    done: 'bg-[var(--ok-fg)] text-[var(--text-inverse)]',
    current: 'bg-[var(--accent)] text-[var(--text-inverse)] shadow-[0_0_0_4px_var(--accent-soft)]',
    pending: 'bg-[var(--surface-sunken)] text-[var(--text-3)]',
  } as const;
  const stageLabelClass = {
    done: 'font-semibold text-[var(--text-1)]',
    current: 'font-semibold text-[var(--text-1)]',
    pending: 'font-medium text-[var(--text-3)]',
  } as const;

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Tinted gradient top region */}
      <div
        className="px-6 py-6"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--surface)), var(--surface) 60%)',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2.5">
              <Badge variant="primary" dot dotColor="info" pulse={run.status === 'PROCESSING'}>
                {badgeMeta.label}
              </Badge>
              <span className="num text-xs text-[var(--text-3)]">
                {run.runName}
              </span>
            </div>
            <div className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.02em] text-[var(--text-1)]">
              {run.runName}
            </div>
            <div className="mt-0.5 text-sm text-[var(--text-3)]">
              <span className="num">{run.totalEmployees.toLocaleString('en-IN')}</span> employees
              {' · '}pay date{' '}
              <span className="num">{formatDate(run.paymentDate)}</span>
            </div>
          </div>
          <Link href={`/payroll/runs/${run.id}`} className="self-start">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<ShieldCheck className="h-4 w-4" />}
              onClick={() => window.nuToast?.('Payroll approved', {msg: 'Cycle sent for disbursement.', type: 'ok'})}
            >
              Review &amp; approve
            </Button>
          </Link>
        </div>

        {/* 3 big mono stats */}
        <div className="mt-5 flex flex-wrap gap-x-12 gap-y-4">
          <BannerFigure label="Gross" value={formatINR0(run.totalGrossAmount)} />
          <BannerFigure label="Net pay" value={formatINR0(run.totalNetAmount)} />
          <BannerFigure label="Taxes &amp; deductions" value={formatINR0(run.totalDeductions)} />
        </div>
      </div>

      {/* Pipeline strip */}
      <div className="flex flex-wrap items-center gap-y-3 border-t border-[var(--border)] px-6 py-4">
        {RUN_STAGES.map((stage, i) => {
          const done = activeIndex > i;
          const current = activeIndex === i;
          const dotState = done ? stageDotClass.done : current ? stageDotClass.current : stageDotClass.pending;
          const labelState = done ? stageLabelClass.done : current ? stageLabelClass.current : stageLabelClass.pending;
          return (
            <React.Fragment key={stage}>
              <div className="flex items-center gap-2.5">
                <span
                  className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full ${dotState}`}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <span className="num text-xs font-bold">{i + 1}</span>
                  )}
                </span>
                <span className={`text-[13px] ${labelState}`}>
                  {STAGE_LABEL[stage]}
                </span>
              </div>
              {i < RUN_STAGES.length - 1 && (
                <div className={`mx-3.5 h-0.5 flex-1 rounded-[2px] ${done ? 'bg-[var(--ok-fg)]' : 'bg-[var(--border)]'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
}

function BannerFigure({label, value}: {label: string; value: string}) {
  return (
    <div>
      <div className="text-aura-micro text-[var(--text-3)]">{label}</div>
      <div className="num mt-1 text-xl font-bold text-[var(--text-1)] sm:text-[21px]">{value}</div>
    </div>
  );
}

// ── Cost by run (share bars) ─────────────────────────────────────────────────
function CostByRunCard({runs}: {runs: PayrollRun[]}) {
  const totalNet = runs.reduce((sum, r) => sum + (r.totalNetAmount ?? 0), 0) || 1;
  const rows = runs.slice(0, 6);

  return (
    <Card padding="md" className="h-full">
      <SectionHead
        title="Cost by cycle"
        sub="Net pay, share of recent runs"
        action={
          <Link
            href="/payroll/runs"
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 rounded"
          >
            Breakdown
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />
      <div className="-mx-2 mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-aura-micro text-[var(--text-3)]">
              <th className="px-2 pb-3 text-left font-bold">Cycle</th>
              <th className="px-2 pb-3 text-right font-bold">Employees</th>
              <th className="px-2 pb-3 text-right font-bold">Net</th>
              <th className="w-[200px] px-2 pb-3 text-left font-bold">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const pct = Math.round(((r.totalNetAmount ?? 0) / totalNet) * 100);
              return (
                <tr key={r.id} className="border-t border-[var(--border-soft)]">
                  <td className="px-2 py-3 font-semibold text-[var(--text-1)]">{r.runName}</td>
                  <td className="num px-2 py-3 text-right text-[var(--text-2)]">
                    {r.totalEmployees.toLocaleString('en-IN')}
                  </td>
                  <td className="num px-2 py-3 text-right font-semibold text-[var(--text-1)]">
                    {formatCompactINR(r.totalNetAmount)}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: i === 0 ? 'var(--chart-1)' : 'var(--chart-2)',
                          }}
                        />
                      </div>
                      <span className="num w-10 text-right text-xs text-[var(--text-3)]">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Pay composition (donut) ──────────────────────────────────────────────────
function PayCompositionCard({run}: {run: PayrollRun}) {
  const net = Math.max(run.totalNetAmount ?? 0, 0);
  const deductions = Math.max(run.totalDeductions ?? 0, 0);
  const gross = Math.max(run.totalGrossAmount ?? 0, net + deductions);
  const netPct = gross > 0 ? Math.round((net / gross) * 100) : 0;

  const segments = [
    {label: 'Net pay', value: net, color: 'var(--chart-1)'},
    {label: 'Taxes & deductions', value: deductions, color: 'var(--chart-4)'},
  ];

  return (
    <Card padding="md" className="h-full">
      <SectionHead title="Pay composition" sub="Where the money goes" />
      <div className="grid place-items-center py-3">
        <Donut
          size={156}
          thickness={24}
          center={{value: `${netPct}%`, label: 'net pay'}}
          data={segments}
          ariaLabel={`Net pay ${netPct} percent of gross`}
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <LegendRow label="Net pay" value={formatCompactINR(net)} color="var(--chart-1)" />
        <LegendRow label="Taxes & deductions" value={formatCompactINR(deductions)} color="var(--chart-4)" />
        <LegendRow label="Gross" value={formatCompactINR(gross)} color="var(--chart-3)" muted />
      </div>
    </Card>
  );
}

function LegendRow({label, value, color, muted}: {label: string; value: string; color: string; muted?: boolean}) {
  const colorClass =
    color === 'var(--chart-1)'
      ? 'bg-[var(--chart-1)]'
      : color === 'var(--chart-3)'
        ? 'bg-[var(--chart-3)]'
        : 'bg-[var(--chart-4)]';
  return (
    <div className="flex items-center gap-2.5 text-[13px]">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorClass}`} aria-hidden="true" />
      <span className={muted ? 'text-[var(--text-3)]' : 'font-medium text-[var(--text-2)]'}>{label}</span>
      <span className="num ml-auto font-semibold text-[var(--text-1)]">{value}</span>
    </div>
  );
}

// ── Run history ──────────────────────────────────────────────────────────────
function RunHistoryCard({runs}: {runs: PayrollRun[]}) {
  return (
    <Card padding="none">
      <div className="px-5 pt-5">
        <SectionHead
          title="Run history"
          action={
            <Link href="/payroll/payslips">
              <Button variant="ghost" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />}>
                Export all
              </Button>
            </Link>
          }
        />
      </div>
      <div className="mt-1 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--surface)]">
            <tr className="text-aura-micro text-[var(--text-3)] border-b border-[var(--border-soft)]">
              <th className="px-5 py-3 text-left font-bold">Run</th>
              <th className="px-3 py-3 text-left font-bold">Period</th>
              <th className="px-3 py-3 text-left font-bold">Pay date</th>
              <th className="px-3 py-3 text-right font-bold">Employees</th>
              <th className="px-3 py-3 text-right font-bold">Gross</th>
              <th className="px-3 py-3 text-right font-bold">Net</th>
              <th className="px-3 py-3 text-left font-bold">Status</th>
              <th className="w-12 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr
                key={r.id}
                className="border-b border-[var(--border-soft)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                <td className="num px-5 py-3 font-semibold text-[var(--text-1)]">{r.runName}</td>
                <td className="px-3 py-3 text-[var(--text-1)]">
                  <span className="num">{formatDate(r.payrollPeriodStart)}</span>
                  {' – '}
                  <span className="num">{formatDate(r.payrollPeriodEnd)}</span>
                </td>
                <td className="num px-3 py-3 text-[13px] text-[var(--text-2)]">{formatDate(r.paymentDate)}</td>
                <td className="num px-3 py-3 text-right text-[var(--text-2)]">
                  {r.totalEmployees.toLocaleString('en-IN')}
                </td>
                <td className="num px-3 py-3 text-right text-[var(--text-2)]">
                  {formatCompactINR(r.totalGrossAmount)}
                </td>
                <td className="num px-3 py-3 text-right font-semibold text-[var(--text-1)]">
                  {formatCompactINR(r.totalNetAmount)}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={r.status} domain={PAYROLL_RUN_STATUS} compact />
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/payroll/runs/${r.id}`}
                    aria-label={`Open ${r.runName}`}
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-[var(--bg-card-hover)] transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Shared section header (inline helper — no shared primitive) ───────────────
function SectionHead({title, sub, action}: {title: string; sub?: string; action?: React.ReactNode}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-[var(--text-1)]">{title}</h2>
        {sub && <p className="mt-0.5 text-[13px] text-[var(--text-3)]">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Skeletons ────────────────────────────────────────────────────────────────
function BannerSkeleton() {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-6 py-6">
        <Skeleton className="h-5 w-32 rounded" />
        <Skeleton className="mt-3 h-7 w-48 rounded" />
        <Skeleton className="mt-2 h-4 w-64 rounded" />
        <div className="mt-5 flex gap-12">
          <Skeleton className="h-10 w-28 rounded" />
          <Skeleton className="h-10 w-28 rounded" />
          <Skeleton className="h-10 w-28 rounded" />
        </div>
      </div>
      <div className="border-t border-[var(--border)] px-6 py-4">
        <Skeleton className="h-6 w-full rounded" />
      </div>
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({length: 4}).map((_, i) => (
        <Card key={i} padding="md">
          <Skeleton className="h-9 w-9 rounded-aura-lg" />
          <Skeleton className="mt-4 h-3 w-24 rounded" />
          <Skeleton className="mt-2 h-8 w-28 rounded" />
        </Card>
      ))}
    </div>
  );
}

// ── Empty / error states ─────────────────────────────────────────────────────
function EmptyBanner() {
  return (
    <Card padding="lg" className="text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-aura-lg bg-[var(--accent-soft)] text-[var(--accent-text)]">
        <Banknote className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[var(--text-1)]">No active payroll cycle</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--text-3)]">
        Start a new run to calculate gross, deductions, and net pay for this cycle.
      </p>
      <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
        <Link href="/payroll/runs?action=new" className="mt-5 inline-block">
          <Button variant="primary" leftIcon={<Play className="h-4 w-4" />}>
            Run Payroll
          </Button>
        </Link>
      </PermissionGate>
    </Card>
  );
}

function ErrorBanner({message}: {message: string}) {
  return (
    <div
      role="alert"
      className="flex items-center gap-4 rounded-aura-lg border border-[var(--err-bd)] bg-[var(--err-bg)] px-5 py-4"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--err-fg)]" aria-hidden="true" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-[var(--err-fg)]">Could not load payroll data</p>
        <p className="text-[var(--text-2)]">{message}</p>
      </div>
    </div>
  );
}
