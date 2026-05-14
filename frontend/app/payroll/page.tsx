'use client';

import React, {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {motion} from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronRight,
  FileText,
  Layers,
  Package,
  Scale,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';

import {AppLayout} from '@/components/layout';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {Button} from '@/components/ui/Button';
import {Skeleton} from '@/components/ui/Skeleton';
import {usePayrollRuns} from '@/lib/hooks/queries/usePayroll';
import type {PayrollRun, PayrollRunStatus} from '@/lib/types/hrms/payroll';
import {formatCurrency, formatDate} from '@/lib/utils';

// One ease curve for every transition on this page. Audit-heavy pages benefit
// from predictable motion — same curve, just slightly different durations.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Compact currency for headline numbers — full precision lives on the runs page.
function formatCompactINR(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)} K`;
  return `₹${amount.toFixed(0)}`;
}

const STATUS_LABEL: Record<PayrollRunStatus, string> = {
  DRAFT: 'Draft',
  PROCESSING: 'Processing',
  PROCESSED: 'Processed',
  APPROVED: 'Approved',
  LOCKED: 'Locked',
};

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const router = useRouter();
  const {hasPermission, isReady: permReady} = usePermissions();
  const hasAccess = hasPermission(Permissions.PAYROLL_VIEW);

  useEffect(() => {
    if (permReady && !hasAccess) router.replace('/dashboard');
  }, [permReady, hasAccess, router]);

  useEffect(() => {
    document.title = 'Payroll | NU-AURA';
  }, []);

  const {data: runsPage, isLoading, error} = usePayrollRuns(0, 10, undefined, permReady && hasAccess);

  if (!permReady || !hasAccess) return null;

  const runs: PayrollRun[] = runsPage?.content ?? [];
  const latest = runs[0];
  const exceptions = runs.filter((r) => r.status === 'DRAFT' || r.status === 'PROCESSING');
  const statutoryRemitted = latest ? latest.totalDeductions : 0;

  return (
    <AppLayout activeMenuItem="payroll">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
        <PageHeader latest={latest} />

        {error && (
          <ErrorBanner
            message={error instanceof Error ? error.message : 'Failed to load payroll data'}
          />
        )}

        {/* Stats row — borders, not card boxes, for breathable density */}
        {isLoading ? (
          <StatsSkeleton />
        ) : (
          <StatsRow
            netPaid={latest?.totalNetAmount ?? 0}
            employeesPaid={latest?.totalEmployees ?? 0}
            statutoryRemitted={statutoryRemitted}
            exceptions={exceptions.length}
          />
        )}

        {/* Bento — one wide hero "Current cycle status" + smaller tiles */}
        <BentoNavigation latest={latest} hasManage={hasPermission(Permissions.PAYROLL_PROCESS)} />

        {/* Exceptions needing review (divide-y list) */}
        {exceptions.length > 0 && <ExceptionsList items={exceptions.slice(0, 4)} />}

        {/* One-line alert when a draft cycle is sitting unprocessed */}
        {latest && latest.status === 'DRAFT' && <CycleAlert run={latest} />}
      </div>
    </AppLayout>
  );
}

// ── Header (asymmetric) ──────────────────────────────────────────────────────
function PageHeader({latest}: {latest?: PayrollRun}) {
  return (
    <motion.header
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: EASE}}
      className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="space-y-2 max-w-2xl">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Payroll
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-heading)] leading-[1.05]">
          Run, reconcile, and remit — every cycle, fully traceable.
        </h1>
        <p className="text-body-secondary max-w-[58ch]">
          One source of truth for runs, payslips, statutory remittances, and adjustments.
          {latest && (
            <>
              {' '}Last cycle{' '}
              <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                {formatDate(latest.payrollPeriodEnd)}
              </span>{' '}
              — {STATUS_LABEL[latest.status].toLowerCase()}.
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-end">
        <Link href="/payroll/runs">
          <Button variant="outline">View runs</Button>
        </Link>
        <Link href="/payroll/runs?action=new">
          <Button variant="primary">
            Start new run
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </motion.header>
  );
}

// ── Stats row (no card boxes, borders divide instead) ────────────────────────
function StatsRow({netPaid, employeesPaid, statutoryRemitted, exceptions}: {
  netPaid: number;
  employeesPaid: number;
  statutoryRemitted: number;
  exceptions: number;
}) {
  const items = [
    {
      label: 'Last run net',
      value: formatCompactINR(netPaid),
      icon: Wallet,
      tone: 'neutral' as const,
    },
    {
      label: 'Employees paid',
      value: employeesPaid.toLocaleString('en-IN'),
      icon: Users,
      tone: 'neutral' as const,
    },
    {
      label: 'Statutory remitted',
      value: formatCompactINR(statutoryRemitted),
      icon: Scale,
      tone: 'neutral' as const,
    },
    {
      label: 'Exceptions',
      value: exceptions.toLocaleString('en-IN'),
      icon: AlertTriangle,
      tone: exceptions > 0 ? ('warning' as const) : ('neutral' as const),
    },
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.06, delayChildren: 0.08}}}}
      aria-label="Payroll at a glance"
      className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]"
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={{hidden: {opacity: 0, y: 6}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
          className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0"
        >
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-2xs font-medium uppercase tracking-wider">{item.label}</span>
          </div>
          <p
            className={`mt-3 font-mono text-3xl sm:text-4xl tabular-nums tracking-tight ${
              item.tone === 'warning'
                ? 'text-warning-700 dark:text-warning-300'
                : 'text-[var(--text-heading)]'
            }`}
          >
            {item.value}
          </p>
        </motion.div>
      ))}
    </motion.section>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]">
      {Array.from({length: 4}).map((_, i) => (
        <div key={i} className="px-5 py-6 sm:px-7 sm:py-8 first:pl-0 last:pr-0">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="mt-3 h-9 w-28 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Bento navigation ─────────────────────────────────────────────────────────
function BentoNavigation({latest, hasManage}: {latest?: PayrollRun; hasManage: boolean}) {
  const tiles = [
    {
      title: 'Payslips',
      description: 'Search, finalise, and download payslips with full breakdowns.',
      icon: FileText,
      href: '/payroll/payslips',
    },
    {
      title: 'Statutory',
      description: 'PF, ESI, PT, TDS, LWF — configure rates and remit on schedule.',
      icon: Scale,
      href: '/payroll/statutory',
    },
    {
      title: 'Salary structures',
      description: 'Define allowances and deductions per employee or template.',
      icon: Layers,
      href: '/payroll/structures',
    },
    {
      title: 'Components & history',
      description: 'Manage components, bulk process cycles, and review history.',
      icon: Package,
      href: '/payroll/components',
      secondaryHref: '/payroll/bulk-processing',
      secondaryLabel: 'Bulk processing',
      hidden: !hasManage,
    },
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.07, delayChildren: 0.18}}}}
      className="grid gap-4 grid-cols-1 lg:grid-cols-12"
      aria-label="Explore payroll"
    >
      <BentoHero latest={latest} />
      {tiles.filter((t) => !t.hidden).map((tile) => (
        <BentoTile key={tile.href} {...tile} />
      ))}
    </motion.section>
  );
}

function BentoHero({latest}: {latest?: PayrollRun}) {
  const status = latest?.status;
  const gross = latest?.totalGrossAmount ?? 0;
  const deductions = latest?.totalDeductions ?? 0;
  const net = latest?.totalNetAmount ?? 0;

  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.5, ease: EASE}}}}
      className="lg:col-span-7 lg:row-span-2"
    >
      <Link
        href="/payroll/runs"
        className="group block h-full rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-7 sm:p-9 transition-all hover:border-[var(--border-main)] hover:shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
            <Banknote className="h-5 w-5" aria-hidden="true" />
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
        <h2 className="mt-8 text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-heading)]">
          Current cycle status
        </h2>
        <p className="mt-3 text-body-secondary max-w-[52ch]">
          {latest
            ? `${latest.runName} • ${formatDate(latest.payrollPeriodStart)} – ${formatDate(latest.payrollPeriodEnd)}`
            : 'No active cycle. Start a new run to begin.'}
        </p>

        {latest ? (
          <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-[var(--border-subtle)] pt-6">
            <CycleFigure label="Gross" value={formatCurrency(gross, 'INR', {maximumFractionDigits: 0})} />
            <CycleFigure label="Deductions" value={formatCurrency(deductions, 'INR', {maximumFractionDigits: 0})} />
            <CycleFigure label="Net" value={formatCurrency(net, 'INR', {maximumFractionDigits: 0})} emphasis />
          </dl>
        ) : null}

        <div className="mt-8 flex items-end justify-between gap-6">
          <StateMachine status={status} />
          <p className="text-2xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Live data
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

function CycleFigure({label, value, emphasis}: {label: string; value: string; emphasis?: boolean}) {
  return (
    <div>
      <dt className="text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</dt>
      <dd
        className={`mt-1.5 font-mono tabular-nums tracking-tight ${
          emphasis ? 'text-xl sm:text-2xl text-[var(--text-heading)]' : 'text-base sm:text-lg text-[var(--text-secondary)]'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

// Linear state machine visual for run lifecycle.
function StateMachine({status}: {status?: PayrollRunStatus}) {
  const stages: PayrollRunStatus[] = ['DRAFT', 'PROCESSING', 'PROCESSED', 'APPROVED', 'LOCKED'];
  const activeIndex = status ? stages.indexOf(status) : -1;
  return (
    <div className="flex items-center gap-1.5 flex-1" aria-hidden="true">
      {stages.map((s, i) => {
        const reached = activeIndex >= i;
        const current = activeIndex === i;
        return (
          <React.Fragment key={s}>
            <motion.span
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              transition={{duration: 0.35, ease: EASE, delay: 0.4 + i * 0.05}}
              className={`h-1.5 flex-1 rounded-full ${
                current
                  ? 'bg-accent-500 dark:bg-accent-400'
                  : reached
                    ? 'bg-accent-200 dark:bg-accent-700/60'
                    : 'bg-[var(--border-subtle)]'
              }`}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}

function BentoTile({title, description, icon: Icon, href, secondaryHref, secondaryLabel}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
      className="lg:col-span-5"
    >
      <Link
        href={href}
        className="group flex h-full items-start gap-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 transition-all hover:border-[var(--border-main)] hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.07)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-[var(--text-heading)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
          {secondaryHref && secondaryLabel && (
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent-700 dark:text-accent-300">
              {secondaryLabel}
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </span>
          )}
        </div>
        <ArrowRight className="h-4 w-4 self-center text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}

// ── Exceptions list (divide-y, no nested cards) ──────────────────────────────
function ExceptionsList({items}: {items: PayrollRun[]}) {
  return (
    <motion.section
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.32}}
      className="space-y-4"
    >
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-heading)]">
          Exceptions needing review
        </h2>
        <Link
          href="/payroll/runs"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-700 dark:text-accent-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded"
        >
          View all runs
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        {items.map((r) => {
          const isProcessing = r.status === 'PROCESSING';
          return (
            <li key={r.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-4 sm:gap-6">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  isProcessing
                    ? 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                }`}
              >
                {isProcessing ? <Settings className="h-4 w-4" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-heading)] truncate">{r.runName}</p>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  <span className="font-mono tabular-nums">{formatDate(r.payrollPeriodStart)}</span>
                  {' – '}
                  <span className="font-mono tabular-nums">{formatDate(r.payrollPeriodEnd)}</span>
                  {' · '}
                  <span className="font-mono tabular-nums">{r.totalEmployees}</span> employees
                </p>
              </div>
              <p className="font-mono text-sm font-semibold tabular-nums text-[var(--text-heading)]">
                {formatCompactINR(r.totalNetAmount)}
              </p>
              <span
                className={`inline-flex items-center px-2 h-6 text-2xs font-medium rounded-full ${
                  isProcessing
                    ? 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                }`}
              >
                {STATUS_LABEL[r.status]}
              </span>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

// ── Cycle alert (one-line) ───────────────────────────────────────────────────
function CycleAlert({run}: {run: PayrollRun}) {
  return (
    <motion.aside
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.42}}
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-4 rounded-xl border border-warning-200 bg-warning-50/40 dark:border-warning-700/40 dark:bg-warning-950/30 px-5 py-4"
    >
      <div className="flex items-center gap-3 text-sm">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400" aria-hidden="true" />
        <p className="text-[var(--text-primary)]">
          <span className="font-semibold">{run.runName}</span> is a draft.{' '}
          <span className="font-mono tabular-nums text-[var(--text-secondary)]">
            {run.totalEmployees}
          </span>{' '}
          employees, payable{' '}
          <span className="font-mono tabular-nums text-[var(--text-secondary)]">
            {formatDate(run.paymentDate)}
          </span>
          . Process when ready.
        </p>
      </div>
      <Link href={`/payroll/runs/${run.id}`}>
        <Button variant="outline" size="sm">
          Open run
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </Link>
    </motion.aside>
  );
}

// ── Error banner ─────────────────────────────────────────────────────────────
function ErrorBanner({message}: {message: string}) {
  return (
    <div
      role="alert"
      className="flex items-center gap-4 rounded-xl border border-danger-200 bg-danger-50/40 dark:border-danger-700/40 dark:bg-danger-950/30 px-5 py-4"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-danger-600 dark:text-danger-400" aria-hidden="true" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-danger-700 dark:text-danger-300">Could not load payroll data</p>
        <p className="text-[var(--text-secondary)]">{message}</p>
      </div>
    </div>
  );
}
