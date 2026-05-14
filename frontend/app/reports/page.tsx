'use client';

import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AnimatePresence, motion} from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react';
import {DateInput} from '@mantine/dates';

import {AppLayout} from '@/components/layout';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {Button} from '@/components/ui/Button';
import {ReportRequest, ReportType} from '@/lib/services/core/report.service';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useReportDownload} from '@/lib/hooks/queries/useReportDownload';

// Single ease curve for every transition on this page. Avoids the cubic-bezier
// drift that compounds when each motion spec picks its own easing.
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: string;
  endpoint: string;
  requiresDateRange: boolean;
  filters?: string[];
}

const reports: ReportConfig[] = [
  {
    id: 'employee',
    title: 'Employee Directory Report',
    description: 'Complete employee details with contact information, department, and employment status',
    icon: Users,
    category: 'HR',
    endpoint: 'employee-directory',
    requiresDateRange: false,
    filters: ['department', 'status'],
  },
  {
    id: 'attendance',
    title: 'Attendance Report',
    description: 'Daily attendance records with check-in/check-out times and work hours',
    icon: Calendar,
    category: 'Attendance',
    endpoint: 'attendance',
    requiresDateRange: true,
    filters: ['department', 'employee', 'status'],
  },
  {
    id: 'department',
    title: 'Department Headcount Report',
    description: 'Department-wise employee distribution, active/inactive counts, and headcount analysis',
    icon: BarChart3,
    category: 'Analytics',
    endpoint: 'department-headcount',
    requiresDateRange: false,
  },
  {
    id: 'leave',
    title: 'Leave Report',
    description: 'Leave requests, balances, and utilization by employee and department',
    icon: FileText,
    category: 'Leave',
    endpoint: 'leave',
    requiresDateRange: true,
    filters: ['department', 'leaveType', 'status'],
  },
  {
    id: 'payroll',
    title: 'Payroll Report',
    description: 'Monthly payroll summary with earnings, deductions, and net salary',
    icon: DollarSign,
    category: 'Payroll',
    endpoint: 'payroll',
    requiresDateRange: true,
    filters: ['department', 'payrollRun'],
  },
  {
    id: 'performance',
    title: 'Performance Report',
    description: 'Employee performance reviews, ratings, and goal achievements',
    icon: TrendingUp,
    category: 'Performance',
    endpoint: 'performance',
    requiresDateRange: false,
    filters: ['department', 'reviewCycle'],
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const router = useRouter();
  const {hasPermission, isReady: permReady} = usePermissions();
  const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-clear success message with proper cleanup
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

  const downloadMutation = useReportDownload();

  // RBAC guard — reports hub requires REPORT_VIEW permission (DEF-49)
  useEffect(() => {
    if (!permReady) return;
    if (!hasPermission(Permissions.REPORT_VIEW)) {
      router.replace('/dashboard');
    }
  }, [permReady, hasPermission, router]);

  // RBAC guard — block render for unauthorized users (DEF-49)
  if (!permReady || !hasPermission(Permissions.REPORT_VIEW)) {
    return null;
  }

  const handleDownload = (type: ReportType, request: ReportRequest) => {
    if (!selectedReport) return;

    downloadMutation.mutate(
      {type, request},
      {
        onSuccess: () => {
          setSuccessMessage(`${selectedReport.title} downloaded successfully!`);
          setSelectedReport(null);
        },
      }
    );
  };

  const dateRangeCount = reports.filter((r) => r.requiresDateRange).length;
  const filterableCount = reports.filter((r) => (r.filters?.length ?? 0) > 0).length;

  return (
    <AppLayout activeMenuItem="reports">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-10">
        <PageHeader />

        <AnimatePresence>
          {successMessage && (
            <SuccessStrip key="success" message={successMessage} />
          )}
        </AnimatePresence>

        {/* Stats row — borders, not card boxes, for breathable density */}
        <StatsRow
          total={reports.length}
          dateRangeCount={dateRangeCount}
          filterableCount={filterableCount}
          categories={new Set(reports.map((r) => r.category)).size}
        />

        {/* Bento — one wide hero + smaller tiles in 12-col asymmetric grid */}
        <BentoReports reports={reports} onSelect={setSelectedReport} />

        {/* Tips strip — single inline panel, not a nested card */}
        <TipsStrip />

        {/* Download Modal */}
        <AnimatePresence>
          {selectedReport && (
            <DownloadModal
              report={selectedReport}
              onClose={() => setSelectedReport(null)}
              onDownload={handleDownload}
              isPending={downloadMutation.isPending}
            />
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────
function PageHeader() {
  return (
    <motion.header
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: EASE}}
      className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div className="space-y-2 max-w-2xl">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Reports
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-heading)] leading-[1.05]">
          Generate, schedule, and share every HR report.
        </h1>
        <p className="text-body-secondary max-w-[55ch]">
          Export to Excel, PDF, or CSV. Filter by date, department, or status — formatted for analysis or sharing.
        </p>
      </div>
    </motion.header>
  );
}

// ── Stats row (borders, not boxes) ───────────────────────────────────────────
function StatsRow({total, dateRangeCount, filterableCount, categories}: {
  total: number;
  dateRangeCount: number;
  filterableCount: number;
  categories: number;
}) {
  const items = [
    {label: 'Reports available', value: total, icon: FileText},
    {label: 'Categories', value: categories, icon: BarChart3},
    {label: 'Date-ranged', value: dateRangeCount, icon: Calendar},
    {label: 'Filterable', value: filterableCount, icon: Filter},
  ];

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.06, delayChildren: 0.08}}}}
      aria-label="Reports at a glance"
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
          <p className="mt-3 font-mono text-3xl sm:text-4xl tabular-nums tracking-tight text-[var(--text-heading)]">
            {item.value}
          </p>
        </motion.div>
      ))}
    </motion.section>
  );
}

// ── Bento navigation: hero + tiles in asymmetric 12-col grid ─────────────────
function BentoReports({reports, onSelect}: {
  reports: ReportConfig[];
  onSelect: (r: ReportConfig) => void;
}) {
  const [hero, ...tiles] = reports;
  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{visible: {transition: {staggerChildren: 0.07, delayChildren: 0.18}}}}
      className="grid gap-4 grid-cols-1 lg:grid-cols-12"
      aria-label="Available reports"
    >
      <BentoHero report={hero} onSelect={onSelect} />
      {tiles.map((r) => (
        <BentoTile key={r.id} report={r} onSelect={onSelect} />
      ))}
    </motion.section>
  );
}

function BentoHero({report, onSelect}: {
  report: ReportConfig;
  onSelect: (r: ReportConfig) => void;
}) {
  const Icon = report.icon;
  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.5, ease: EASE}}}}
      className="lg:col-span-7 lg:row-span-2"
    >
      <button
        type="button"
        onClick={() => onSelect(report)}
        className="group block w-full h-full text-left rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-7 sm:p-9 transition-all hover:border-[var(--border-main)] hover:shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {report.category}
          </span>
        </div>
        <h2 className="mt-8 text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-heading)]">
          {report.title}
        </h2>
        <p className="mt-3 text-body-secondary max-w-[52ch]">
          {report.description}
        </p>
        <div className="mt-10 flex items-end justify-between gap-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--text-secondary)]">
            {report.requiresDateRange && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                Date range
              </span>
            )}
            {report.filters && report.filters.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                {report.filters.length} filters
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
              Excel · PDF · CSV
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 dark:text-accent-300 transition-transform group-hover:translate-x-0.5">
            Download
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </button>
    </motion.div>
  );
}

function BentoTile({report, onSelect}: {
  report: ReportConfig;
  onSelect: (r: ReportConfig) => void;
}) {
  const Icon = report.icon;
  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
      className="lg:col-span-5"
    >
      <button
        type="button"
        onClick={() => onSelect(report)}
        className="group flex w-full h-full items-start gap-4 text-left rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-6 transition-all hover:border-[var(--border-main)] hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.07)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-[var(--text-heading)] truncate">{report.title}</h3>
            <span className="text-2xs font-medium uppercase tracking-wider text-[var(--text-muted)] shrink-0">
              {report.category}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2">{report.description}</p>
          <div className="mt-3 flex items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
            {report.requiresDateRange && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                Date range
              </span>
            )}
            {report.filters && report.filters.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Filter className="h-3 w-3" aria-hidden="true" />
                Filters
              </span>
            )}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 self-center text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

// ── Tips strip (replaces former nested info card) ────────────────────────────
function TipsStrip() {
  const tips = [
    'Excel is best for analysis and further processing.',
    'PDF is ideal for printing and sharing official documents.',
    'CSV pairs with every spreadsheet tool out there.',
    'Use date filters to scope reports to a specific period.',
  ];
  return (
    <motion.section
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.32}}
      aria-label="Report generation tips"
      className="space-y-4"
    >
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-heading)]">
          Tips for cleaner exports
        </h2>
        <span className="text-2xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Quick reference
        </span>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        {tips.map((tip, i) => (
          <li key={i} className="grid grid-cols-[auto_1fr] items-center gap-4 py-3 sm:gap-6">
            <span className="font-mono text-2xs font-semibold tabular-nums text-[var(--text-muted)] w-6">
              {String(i + 1).padStart(2, '0')}
            </span>
            <p className="text-sm text-[var(--text-secondary)]">{tip}</p>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

// ── Success strip (one-line, not a card) ─────────────────────────────────────
function SuccessStrip({message}: {message: string}) {
  return (
    <motion.aside
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -6}}
      transition={{duration: 0.35, ease: EASE}}
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-xl border border-success-200 bg-success-50/40 dark:border-success-700/40 dark:bg-success-950/30 px-5 py-3"
    >
      <Check className="h-4 w-4 shrink-0 text-success-600 dark:text-success-400" aria-hidden="true" />
      <p className="text-sm text-[var(--text-primary)]">{message}</p>
    </motion.aside>
  );
}

// ── Download Modal ───────────────────────────────────────────────────────────
interface DownloadModalProps {
  report: ReportConfig;
  onClose: () => void;
  onDownload: (type: ReportType, request: ReportRequest) => void;
  isPending: boolean;
}

const DownloadModal: React.FC<DownloadModalProps> = ({report, onClose, onDownload, isPending}) => {
  const [format, setFormat] = useState<'EXCEL' | 'PDF' | 'CSV'>('EXCEL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const handleDownload = () => {
    if (report.requiresDateRange && (!startDate || !endDate)) {
      setError('Please select both start and end dates');
      return;
    }

    setError('');

    const request: ReportRequest = {
      format,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    onDownload(report.endpoint as ReportType, request);
  };

  const formats: Array<{value: 'EXCEL' | 'PDF' | 'CSV'; label: string; ext: string; icon: React.ElementType}> = [
    {value: 'EXCEL', label: 'Excel', ext: '.xlsx', icon: FileSpreadsheet},
    {value: 'PDF', label: 'PDF', ext: '.pdf', icon: FileText},
    {value: 'CSV', label: 'CSV', ext: '.csv', icon: FileSpreadsheet},
  ];

  const Icon = report.icon;

  return (
    <Modal isOpen={true} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">{report.title}</h2>
            <p className="text-2xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {report.category}
            </p>
          </div>
        </div>
      </ModalHeader>
      <ModalBody className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-4">
            Export Format
          </label>
          <div className="grid grid-cols-3 gap-3">
            {formats.map((f) => {
              const FIcon = f.icon;
              const selected = format === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormat(f.value)}
                  aria-pressed={selected}
                  className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 ${
                    selected
                      ? 'border-accent-500 bg-accent-50/60 dark:bg-accent-950/30'
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-main)]'
                  }`}
                >
                  <FIcon
                    className={`h-5 w-5 ${selected ? 'text-accent-700 dark:text-accent-300' : 'text-[var(--text-muted)]'}`}
                    aria-hidden="true"
                  />
                  <div className="text-center">
                    <p className={`font-medium text-sm ${selected ? 'text-[var(--text-heading)]' : 'text-[var(--text-secondary)]'}`}>
                      {f.label}
                    </p>
                    <p className="text-caption">{f.ext}</p>
                  </div>
                  {selected && (
                    <Check className="h-3.5 w-3.5 text-accent-700 dark:text-accent-300 absolute top-2 right-2" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {report.requiresDateRange && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-4">
              Date Range <span aria-hidden="true" className="text-danger-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-caption mb-1">From</label>
                <DateInput
                  value={startDate || null}
                  onChange={(d) => setStartDate(d ?? '')}
                  valueFormat="YYYY-MM-DD"
                  placeholder="YYYY-MM-DD"
                  clearable
                  size="sm"
                  aria-required="true"
                />
              </div>
              <div>
                <label className="block text-caption mb-1">To</label>
                <DateInput
                  value={endDate || null}
                  onChange={(d) => setEndDate(d ?? '')}
                  valueFormat="YYYY-MM-DD"
                  placeholder="YYYY-MM-DD"
                  clearable
                  size="sm"
                  aria-required="true"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-danger-200 bg-danger-50/40 dark:border-danger-700/40 dark:bg-danger-950/30 px-4 py-3 text-sm text-danger-700 dark:text-danger-300"
          >
            {error}
          </div>
        )}
      </ModalBody>
      <ModalFooter className="gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleDownload}
          disabled={isPending}
          className="flex-1"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Generating
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Download
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
