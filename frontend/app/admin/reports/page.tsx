'use client';

import {useState} from 'react';
import {AdminPageContent} from '@/components/layout';
import {
  useActiveScheduledReports,
  useDownloadAttendanceReport,
  useDownloadDepartmentReport,
  useDownloadEmployeeReport,
  useDownloadLeaveReport,
  useDownloadPayrollReport,
  useDownloadPerformanceReport,
} from '@/lib/hooks/queries/useReports';
import {
  Banknote,
  BarChart2,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  Download,
  FileText,
  PieChart,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import type {ReportType} from '@/lib/types/core/analytics';
import {REPORT_TYPE_LABELS} from '@/lib/types/core/analytics';
import type {ReportRequest} from '@/lib/services/core/report.service';

// ─── Report download definitions ─────────────────────────────────────────────

type DownloadReport = {
  key: ReportType;
  label: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  bg: string;
  hookKey: string;
};

const REPORTS: DownloadReport[] = [
  {
    key: 'EMPLOYEE_DIRECTORY',
    label: 'Employee Directory',
    description: 'Full employee list with departments and roles',
    icon: Users,
    accent: 'text-accent-500',
    bg: 'bg-accent-50 dark:bg-accent-950/20',
    hookKey: 'employee',
  },
  {
    key: 'ATTENDANCE',
    label: 'Attendance Report',
    description: 'Monthly attendance, late arrivals, and absenteeism',
    icon: Clock,
    accent: 'text-warning-500',
    bg: 'bg-warning-50 dark:bg-warning-950/20',
    hookKey: 'attendance',
  },
  {
    key: 'LEAVE',
    label: 'Leave Report',
    description: 'Leave balances, utilization, and patterns',
    icon: Calendar,
    accent: 'text-info-500',
    bg: 'bg-info-50 dark:bg-info-950/20',
    hookKey: 'leave',
  },
  {
    key: 'PAYROLL',
    label: 'Payroll Report',
    description: 'Gross pay, deductions, and net salary breakdown',
    icon: Banknote,
    accent: 'text-success-500',
    bg: 'bg-success-50 dark:bg-success-950/20',
    hookKey: 'payroll',
  },
  {
    key: 'DEPARTMENT_HEADCOUNT',
    label: 'Department Headcount',
    description: 'Headcount distribution across departments',
    icon: Building2,
    accent: 'text-accent-500',
    bg: 'bg-accent-50 dark:bg-accent-950/20',
    hookKey: 'department',
  },
  {
    key: 'PERFORMANCE',
    label: 'Performance Report',
    description: 'Review scores, ratings, and goal completion',
    icon: TrendingUp,
    accent: 'text-danger-500',
    bg: 'bg-danger-50 dark:bg-danger-950/20',
    hookKey: 'performance',
  },
];

// ─── Report links ─────────────────────────────────────────────────────────────

const REPORT_LINKS = [
  {href: '/reports', label: 'All Reports', icon: FileText},
  {href: '/reports/headcount', label: 'Headcount Analytics', icon: Users},
  {href: '/reports/attrition', label: 'Attrition Report', icon: TrendingUp},
  {href: '/reports/leave', label: 'Leave Analytics', icon: Calendar},
  {href: '/reports/payroll', label: 'Payroll Analytics', icon: Banknote},
  {href: '/reports/performance', label: 'Performance Analytics', icon: BarChart2},
  {href: '/reports/utilization', label: 'Resource Utilization', icon: PieChart},
  {href: '/reports/scheduled', label: 'Scheduled Reports', icon: RefreshCw},
  {href: '/reports/builder', label: 'Report Builder', icon: FileText},
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const {data: scheduledReports, isLoading: scheduledLoading} = useActiveScheduledReports();
  const activeScheduled = scheduledReports ?? [];

  const downloadEmployee = useDownloadEmployeeReport();
  const downloadAttendance = useDownloadAttendanceReport();
  const downloadLeave = useDownloadLeaveReport();
  const downloadPayroll = useDownloadPayrollReport();
  const downloadDepartment = useDownloadDepartmentReport();
  const downloadPerformance = useDownloadPerformanceReport();

  const [downloading, setDownloading] = useState<string | null>(null);

  const defaultRequest: ReportRequest = {format: 'EXCEL'};

  const downloadMap: Record<string, ReturnType<typeof useDownloadEmployeeReport>> = {
    employee: downloadEmployee,
    attendance: downloadAttendance,
    leave: downloadLeave,
    payroll: downloadPayroll,
    department: downloadDepartment,
    performance: downloadPerformance,
  };

  function handleDownload(report: DownloadReport) {
    setDownloading(report.hookKey);
    const hook = downloadMap[report.hookKey];
    hook.mutate(defaultRequest, {onSettled: () => setDownloading(null)});
  }

  function frequencyLabel(freq: string): string {
    return freq.charAt(0) + freq.slice(1).toLowerCase();
  }

  return (
    <AdminPageContent className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
          Admin Reports
        </h1>
        <p className="mt-1 text-body-secondary">
          Platform-wide reporting, analytics, and data exports
        </p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Download reports grid */}
        <div className="xl:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Quick Downloads</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {REPORTS.map((report) => {
              const isDownloading = downloading === report.hookKey;
              return (
                <div
                  key={report.key}
                  className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)] flex items-start gap-2"
                >
                  <div className={`shrink-0 rounded-lg p-2 ${report.bg}`}>
                    <report.icon className={`h-4 w-4 ${report.accent}`}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{report.label}</p>
                    <p className="text-caption mt-0.5">{report.description}</p>
                  </div>
                  <button
                    onClick={() => handleDownload(report)}
                    disabled={isDownloading}
                    aria-label={`Download ${report.label}`}
                    className='shrink-0 p-1.5 rounded-lg border border-[var(--border-main)] text-[var(--text-muted)] hover:text-accent hover:border-[var(--accent-primary)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {isDownloading ? (
                      <RefreshCw className="h-4 w-4 animate-spin"/>
                    ) : (
                      <Download className="h-4 w-4"/>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Scheduled reports */}
          <div
            className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="row-between px-4 py-2 divider-b">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Active Scheduled Reports
              </h2>
              <Link
                href="/reports/scheduled"
                className='text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer'
              >
                Manage <ChevronRight className="h-3 w-3"/>
              </Link>
            </div>
            {scheduledLoading ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {Array.from({length: 3}).map((_, i) => (
                  <div key={i} className="px-4 py-2 flex items-center gap-2">
                    <div className="h-4 flex-1 rounded bg-[var(--skeleton-base)] animate-pulse"/>
                    <div className="h-4 w-24 rounded bg-[var(--skeleton-base)] animate-pulse"/>
                  </div>
                ))}
              </div>
            ) : activeScheduled.length === 0 ? (
              <div className="py-10 text-center">
                <RefreshCw className="h-7 w-7 text-[var(--text-muted)] mx-auto mb-2"/>
                <p className="text-body-muted">No scheduled reports configured</p>
                <Link
                  href="/reports/scheduled"
                  className='mt-1 inline-block text-xs text-accent hover:underline cursor-pointer'
                >
                  Set up a schedule →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {activeScheduled.slice(0, 8).map((sr) => (
                  <div key={sr.id} className="flex items-center gap-2 px-4 py-2">
                    <RefreshCw className='h-4 w-4 text-accent shrink-0'/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {sr.scheduleName}
                      </p>
                      <p className="text-caption">
                        {REPORT_TYPE_LABELS[sr.reportType]} · {frequencyLabel(sr.frequency)}
                        {sr.nextRunAt ? ` · Next: ${new Date(sr.nextRunAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-caption">
                      {sr.recipients.length} recipient{sr.recipients.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Report links */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Report Sections</h2>
          <div className="space-y-2">
            {REPORT_LINKS.map(({href, label, icon: Icon}) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 hover:bg-[var(--surface-hover)] transition-colors shadow-[var(--shadow-card)] cursor-pointer group"
              >
                <div className='shrink-0 rounded-lg p-2 bg-accent-subtle'>
                  <Icon className='h-4 w-4 text-accent'/>
                </div>
                <p className="flex-1 text-sm font-medium text-[var(--text-primary)] truncate">
                  {label}
                </p>
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
