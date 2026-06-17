'use client';

import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AnimatePresence, motion} from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CalendarClock,
  Check,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import {DateInput} from '@mantine/dates';

import {AppLayout} from '@/components/layout';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';
import {Sparkline} from '@/components/charts/aura';
import {ReportRequest, ReportType} from '@/lib/services/core/report.service';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useReportDownload} from '@/lib/hooks/queries/useReportDownload';
import {MOTION_EASE} from '@/lib/animation';

// Single ease curve for every transition on this page. Avoids the cubic-bezier
// drift that compounds when each motion spec picks its own easing.
const EASE = MOTION_EASE.outExpo;

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: string;
  endpoint: string;
  requiresDateRange: boolean;
  filters?: string[];
  // Presentation-only: Aura saved-report card accent + trend preview. Bound to
  // each real report config; not part of the download request payload.
  color: string;
  spark: number[];
  updated: string;
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
    color: 'var(--chart-1)',
    spark: [42, 44, 43, 47, 49, 48, 52, 55, 54, 58, 61, 64],
    updated: '2h ago',
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
    color: 'var(--chart-4)',
    spark: [88, 92, 90, 86, 91, 94, 89, 87, 93, 95, 90, 92],
    updated: '1d ago',
  },
  {
    id: 'department',
    title: 'Department Headcount Report',
    description: 'Department-wise employee distribution, active/inactive counts, and headcount analysis',
    icon: BarChart3,
    category: 'Analytics',
    endpoint: 'department-headcount',
    requiresDateRange: false,
    color: 'var(--chart-3)',
    spark: [30, 33, 35, 34, 38, 41, 40, 44, 47, 49, 52, 55],
    updated: '5h ago',
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
    color: 'var(--chart-5)',
    spark: [18, 22, 26, 24, 29, 33, 37, 41, 44, 48, 53, 58],
    updated: '3d ago',
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
    color: 'var(--chart-2)',
    spark: [60, 58, 62, 65, 64, 68, 71, 70, 74, 77, 80, 83],
    updated: '4h ago',
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
    color: 'var(--chart-3)',
    spark: [40, 42, 45, 44, 48, 51, 53, 56, 59, 62, 66, 70],
    updated: '1w ago',
  },
];

// Scheduled deliveries — presentation-only (the real reports hub has no schedule
// fetch yet). Mirrors the Aura spec table; owners shown with initials avatars.
interface ScheduledDelivery {
  name: string;
  freq: string;
  owner: string;
  next: string;
  fmt: 'PDF' | 'XLSX' | 'CSV';
}

const SCHEDULED: ScheduledDelivery[] = [
  {name: 'Monthly headcount', freq: 'Monthly · 1st', owner: 'Fayaz Ahmed', next: 'Jun 1', fmt: 'PDF'},
  {name: 'Payroll reconciliation', freq: 'Monthly · 28th', owner: 'Mei Lin', next: 'Jun 28', fmt: 'XLSX'},
  {name: 'Attrition watch', freq: 'Weekly · Mon', owner: 'Aisha Bello', next: 'Jun 9', fmt: 'PDF'},
  {name: 'Comp benchmarking', freq: 'Quarterly', owner: 'Robert Cole', next: 'Jul 1', fmt: 'XLSX'},
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

  return (
    <AppLayout activeMenuItem="reports">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 space-y-8">
        <PageHeader savedCount={reports.length} scheduledCount={SCHEDULED.length} />

        <AnimatePresence>
          {successMessage && (
            <SuccessStrip key="success" message={successMessage} />
          )}
        </AnimatePresence>

        {/* Saved reports — 3-col grid of hoverable cards with sparkline preview */}
        <SavedReports reports={reports} onSelect={setSelectedReport} />

        {/* Scheduled deliveries — auto-generated, emailed to owners */}
        <ScheduledDeliveriesCard rows={SCHEDULED} />

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
function PageHeader({savedCount, scheduledCount}: {savedCount: number; scheduledCount: number}) {
  return (
    <motion.header
      initial={{opacity: 0, y: 4}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, ease: EASE}}
      className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="space-y-1.5">
        <h1 className="text-aura-title text-[var(--text-1)]">Reports</h1>
        <p className="text-sm text-[var(--text-2)]">
          Analytics across people, payroll and operations ·{' '}
          <span className="num tabular-nums">{savedCount}</span> saved ·{' '}
          <span className="num tabular-nums">{scheduledCount}</span> scheduled
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" leftIcon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}>
          Schedule
        </Button>
        <Button variant="primary" leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
          New Report
        </Button>
      </div>
    </motion.header>
  );
}

// ── Saved reports (3-col card grid) ──────────────────────────────────────────
function SavedReports({reports, onSelect}: {
  reports: ReportConfig[];
  onSelect: (r: ReportConfig) => void;
}) {
  return (
    <section aria-label="Saved reports" className="space-y-4">
      <div className="space-y-0.5">
        <h2 className="font-display text-base font-bold tracking-tight text-[var(--text-1)]">
          Saved reports
        </h2>
        <p className="text-xs text-[var(--text-3)]">Click to open the full analysis</p>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{visible: {transition: {staggerChildren: 0.06, delayChildren: 0.08}}}}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {reports.map((r) => (
          <SavedReportCard key={r.id} report={r} onSelect={onSelect} />
        ))}
      </motion.div>
    </section>
  );
}

function SavedReportCard({report, onSelect}: {
  report: ReportConfig;
  onSelect: (r: ReportConfig) => void;
}) {
  const Icon = report.icon;
  return (
    <motion.div
      variants={{hidden: {opacity: 0, y: 8}, visible: {opacity: 1, y: 0, transition: {duration: 0.4, ease: EASE}}}}
    >
      <Card
        hover
        onClick={() => onSelect(report)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(report);
          }
        }}
        aria-label={`Open ${report.title}`}
        className="group flex h-full flex-col p-5 focus-ring"
      >
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="grid h-[38px] w-[38px] place-items-center rounded-[10px]"
              style={{
                background: `color-mix(in srgb, ${report.color} 14%, transparent)`,
                color: report.color,
              }}
              aria-hidden="true"
            >
              <Icon className="h-[19px] w-[19px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-[var(--text-1)]">
                {report.title}
              </p>
              <Badge variant="default" size="sm" className="mt-1">
                {report.category}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${report.title}`}
            onClick={(e) => {
              // Kebab is presentation-only here; stop the card's open handler.
              e.stopPropagation();
            }}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="h-[52px]">
          <Sparkline
            data={report.spark}
            color={report.color}
            height={52}
            ariaLabel={`${report.title} recent trend`}
          />
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[var(--border-soft)] pt-3">
          <span className="text-[11.5px] text-[var(--text-3)]">Updated {report.updated}</span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] transition-transform group-hover:translate-x-0.5">
            Open
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </Card>
    </motion.div>
  );
}

// ── Scheduled deliveries (table) ─────────────────────────────────────────────
function ScheduledDeliveriesCard({rows}: {rows: ScheduledDelivery[]}) {
  return (
    <motion.div
      initial={{opacity: 0, y: 6}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.45, ease: EASE, delay: 0.2}}
    >
      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 pb-0 pt-[18px]">
          <div className="space-y-0.5">
            <h2 className="font-display text-base font-bold tracking-tight text-[var(--text-1)]">
              Scheduled deliveries
            </h2>
            <p className="text-xs text-[var(--text-3)]">Auto-generated and emailed to owners</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}>
            Add schedule
          </Button>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-[var(--border-soft)]">
                <ScheduleTh>Report</ScheduleTh>
                <ScheduleTh>Frequency</ScheduleTh>
                <ScheduleTh>Owner</ScheduleTh>
                <ScheduleTh>Next run</ScheduleTh>
                <ScheduleTh>Format</ScheduleTh>
                <th className="w-12" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr
                  key={s.name}
                  className="border-b border-[var(--border-soft)] transition-colors last:border-b-0 hover:bg-[var(--surface-hover)]"
                >
                  <td className="px-5 py-3.5 font-medium text-[var(--text-1)]">{s.name}</td>
                  <td className="px-5 py-3.5 text-[var(--text-2)]">{s.freq}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <OwnerAvatar name={s.owner} />
                      <span className="font-medium text-[var(--text-1)]">{s.owner}</span>
                    </div>
                  </td>
                  <td className="num px-5 py-3.5 text-[12.5px] tabular-nums text-[var(--text-2)]">{s.next}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant="primary" size="sm">{s.fmt}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${s.name}`}>
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}

function ScheduleTh({children}: {children: React.ReactNode}) {
  return (
    <th className="px-5 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--text-3)]">
      {children}
    </th>
  );
}

// Deterministic per-name avatar tint (no shared Avatar primitive in this wave).
// Mirrors the prototype's colorFor() name-hash but stays token-driven: the palette
// maps onto the chart/product CSS vars so both light + dark stay in parity.
const AVATAR_TINTS = [
  'var(--chart-1)',
  'var(--prod-hire)',
  'var(--prod-grow)',
  'var(--prod-fluence)',
  'var(--chart-2)',
  'var(--chart-3)',
] as const;

function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}

function OwnerAvatar({name}: {name: string}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  const tint = tintFor(name);
  return (
    <span
      className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-[10px] font-bold"
      style={{
        background: `color-mix(in srgb, ${tint} 16%, transparent)`,
        color: tint,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
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
      className="flex items-center gap-4 rounded-[var(--r-lg)] border border-[var(--ok-bd)] bg-[var(--ok-bg)] px-5 py-4"
    >
      <Check className="h-4 w-4 shrink-0 text-[var(--ok-fg)]" aria-hidden="true" />
      <p className="text-sm text-[var(--text-1)]">{message}</p>
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
          <div
            className="grid h-10 w-10 place-items-center rounded-[10px]"
            style={{
              background: `color-mix(in srgb, ${report.color} 14%, transparent)`,
              color: report.color,
            }}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-1)]">{report.title}</h2>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--text-3)]">
              {report.category}
            </p>
          </div>
        </div>
      </ModalHeader>
      <ModalBody className="space-y-6">
        <div>
          <span className="mb-4 block text-sm font-medium text-[var(--text-2)]">
            Export Format
          </span>
          <div className="grid grid-cols-3 gap-4">
            {formats.map((f) => {
              const FIcon = f.icon;
              const selected = format === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormat(f.value)}
                  aria-pressed={selected}
                  className={`relative flex flex-col items-center justify-center gap-2 rounded-[var(--r-control)] border p-4 transition-all active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
                    selected
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border)] hover:border-[var(--border-aura-strong)]'
                  }`}
                >
                  <FIcon
                    className={`h-5 w-5 ${selected ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'}`}
                    aria-hidden="true"
                  />
                  <div className="text-center">
                    <p className={`text-sm font-medium ${selected ? 'text-[var(--text-1)]' : 'text-[var(--text-2)]'}`}>
                      {f.label}
                    </p>
                    <p className="num text-[11px] tabular-nums text-[var(--text-3)]">{f.ext}</p>
                  </div>
                  {selected && (
                    <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {report.requiresDateRange && (
          <div>
            <span className="mb-4 block text-sm font-medium text-[var(--text-2)]">
              Date Range <span aria-hidden="true" className="text-[var(--err-fg)]">*</span>
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="report-date-from" className="mb-1 block text-[11px] text-[var(--text-3)]">From</label>
                <DateInput
                  id="report-date-from"
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
                <label htmlFor="report-date-to" className="mb-1 block text-[11px] text-[var(--text-3)]">To</label>
                <DateInput
                  id="report-date-to"
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
            className="flex items-center gap-4 rounded-[var(--r-lg)] border border-[var(--err-bd)] bg-[var(--err-bg)] px-4 py-4 text-sm text-[var(--err-fg)]"
          >
            {error}
          </div>
        )}
      </ModalBody>
      <ModalFooter className="gap-4">
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
