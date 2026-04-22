'use client';

import {AdminPageContent} from '@/components/layout';
import {usePayrollRuns, useSalaryStructures} from '@/lib/hooks/queries/usePayroll';
import {
  AlertCircle,
  Banknote,
  BarChart2,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Layers,
  Package,
  Scale,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import type {PayrollRunStatus} from '@/lib/types/hrms/payroll';

// ─── Quick-link cards ─────────────────────────────────────────────────────────

const PAYROLL_LINKS = [
  {
    href: '/payroll/runs',
    label: 'Payroll Runs',
    description: 'Create and process payroll for each pay cycle',
    icon: Banknote,
    accent: "text-accent",
    bg: "bg-accent-subtle",
  },
  {
    href: '/payroll/payslips',
    label: 'Payslips',
    description: 'View and download employee payslips',
    icon: FileText,
    accent: "text-accent",
    bg: "bg-accent-subtle",
  },
  {
    href: '/payroll/structures',
    label: 'Salary Structures',
    description: 'Manage components, allowances and deductions',
    icon: Layers,
    accent: "text-accent",
    bg: "bg-accent-subtle",
  },
  {
    href: '/payroll/bulk-processing',
    label: 'Bulk Processing',
    description: 'Process multiple employees in a single run',
    icon: Settings,
    accent: "text-status-warning-text",
    bg: "bg-status-warning-bg",
  },
  {
    href: '/payroll/components',
    label: 'Pay Components',
    description: 'Configure reimbursement and deduction types',
    icon: Package,
    accent: "text-accent",
    bg: "bg-accent-subtle",
  },
  {
    href: '/payroll/statutory',
    label: 'Statutory Config',
    description: 'PF, ESI, PT, TDS and LWF configurations',
    icon: Scale,
    accent: "text-status-success-text",
    bg: "bg-status-success-bg",
  },
  {
    href: '/statutory-filings',
    label: 'Statutory Filings',
    description: 'Generate and submit government compliance filings',
    icon: BarChart2,
    accent: "text-status-info-text",
    bg: "bg-status-info-bg",
  },
  {
    href: '/reports/payroll',
    label: 'Payroll Reports',
    description: 'Download payroll and CTC reports',
    icon: FileText,
    accent: "text-accent",
    bg: "bg-accent-subtle",
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusIcon({status}: { status: PayrollRunStatus }) {
  switch (status) {
    case 'LOCKED':
    case 'APPROVED':
      return <CheckCircle className='h-4 w-4 text-status-success-text'/>;
    case 'PROCESSED':
      return <CheckCircle className='h-4 w-4 text-accent'/>;
    case 'PROCESSING':
      return <Clock className='h-4 w-4 text-status-warning-text'/>;
    default:
      return <AlertCircle className="h-4 w-4 text-[var(--text-muted)]"/>;
  }
}

function statusBadgeClass(status: PayrollRunStatus): string {
  switch (status) {
    case 'LOCKED':
    case 'APPROVED':
      return 'badge-success';
    case 'PROCESSED':
      return "bg-accent-subtle text-accent";
    case 'PROCESSING':
      return 'badge-warning';
    default:
      return 'bg-[var(--surface-2)] text-[var(--text-secondary)]';
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPayrollPage() {
  const {data: runsPage, isLoading: runsLoading} = usePayrollRuns(0, 5);
  const {data: structuresPage, isLoading: structuresLoading} = useSalaryStructures(0, 5);

  const runs = runsPage?.content ?? [];
  const structures = structuresPage?.content ?? [];

  const totalRuns = runsPage?.totalElements ?? 0;
  const totalStructures = structuresPage?.totalElements ?? 0;
  const pendingRuns = runs.filter(
    (r) => r.status === 'DRAFT' || r.status === 'PROCESSING',
  ).length;
  const approvedRuns = runs.filter(
    (r) => r.status === 'APPROVED' || r.status === 'LOCKED',
  ).length;

  return (
    <AdminPageContent className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
          Payroll Administration
        </h1>
        <p className="mt-1 text-body-secondary">
          Manage payroll runs, salary structures, and statutory configurations
        </p>
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {label: 'Total Runs', value: totalRuns, loading: runsLoading, color: "text-accent"},
          {label: 'Pending / Processing', value: pendingRuns, loading: runsLoading, color: "text-status-warning-text"},
          {label: 'Approved / Locked', value: approvedRuns, loading: runsLoading, color: "text-status-success-text"},
          {label: 'Salary Structures', value: totalStructures, loading: structuresLoading, color: "text-accent"},
        ].map(({label, value, loading, color}) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]"
          >
            <p className="text-caption mb-1">{label}</p>
            {loading ? (
              <div className="h-8 w-16 rounded bg-[var(--skeleton-base)] animate-pulse"/>
            ) : (
              <p className={`text-3xl font-bold skeuo-emboss ${color}`}>{value}</p>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: recent data tables */}
        <div className="xl:col-span-2 space-y-4">
          {/* Recent Runs */}
          <div
            className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="row-between px-4 py-2 divider-b">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Payroll Runs</h2>
              <Link
                href="/payroll/runs"
                className='text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer'
              >
                View all <ChevronRight className="h-3 w-3"/>
              </Link>
            </div>
            {runsLoading ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {Array.from({length: 4}).map((_, i) => (
                  <div key={i} className="px-4 py-2 flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-[var(--skeleton-base)] animate-pulse"/>
                    <div className="h-4 flex-1 rounded bg-[var(--skeleton-base)] animate-pulse"/>
                    <div className="h-5 w-20 rounded-full bg-[var(--skeleton-base)] animate-pulse"/>
                  </div>
                ))}
              </div>
            ) : runs.length === 0 ? (
              <div className="py-12 text-center">
                <Banknote className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2"/>
                <p className="text-body-muted">No payroll runs yet</p>
                <Link
                  href="/payroll/runs"
                  className='mt-2 inline-block text-xs text-accent hover:underline cursor-pointer'
                >
                  Create first run →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {runs.map((run) => (
                  <Link
                    key={run.id}
                    href="/payroll/runs"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  >
                    <StatusIcon status={run.status}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {run.runName}
                      </p>
                      <p className="text-caption">
                        {run.payrollPeriodStart} → {run.payrollPeriodEnd}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(run.status)}`}
                    >
                      {run.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Salary Structures */}
          <div
            className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="row-between px-4 py-2 divider-b">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Recent Salary Structures
              </h2>
              <Link
                href="/payroll/structures"
                className='text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer'
              >
                View all <ChevronRight className="h-3 w-3"/>
              </Link>
            </div>
            {structuresLoading ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {Array.from({length: 3}).map((_, i) => (
                  <div key={i} className="px-4 py-2 flex items-center gap-2">
                    <div className="h-4 flex-1 rounded bg-[var(--skeleton-base)] animate-pulse"/>
                    <div className="h-5 w-16 rounded-full bg-[var(--skeleton-base)] animate-pulse"/>
                  </div>
                ))}
              </div>
            ) : structures.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-body-muted">No salary structures configured</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {structures.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 px-4 py-2">
                    <Layers className='h-4 w-4 text-accent shrink-0'/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {s.employeeName ?? `Employee ${s.employeeId.substring(0, 8)}`}
                      </p>
                      <p className="text-caption">
                        Effective {s.effectiveDate} · CTC ₹{(s.totalCTC ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.status === 'ACTIVE'
                          ? 'badge-success'
                          : s.status === 'PENDING'
                            ? 'badge-warning'
                            : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick links */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Quick Access</h2>
          <div className="space-y-2">
            {PAYROLL_LINKS.map(({href, label, description, icon: Icon, accent, bg}) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 hover:bg-[var(--surface-hover)] transition-colors shadow-[var(--shadow-card)] cursor-pointer group"
              >
                <div className={`shrink-0 rounded-lg p-2 ${bg}`}>
                  <Icon className={`h-4 w-4 ${accent}`}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{label}</p>
                  <p className="text-caption truncate">{description}</p>
                </div>
                <ChevronRight
                  className='h-4 w-4 text-[var(--text-muted)] group-hover:text-accent transition-colors shrink-0'/>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminPageContent>
  );
}
