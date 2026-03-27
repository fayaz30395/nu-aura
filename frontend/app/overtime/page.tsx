'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { NuAuraLoader } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useEmployeeOvertimeRecords,
  usePendingOvertimeRecords,
  useAllOvertimeRecords,
  useCreateOvertimeRecord,
  useApproveOrRejectOvertime,
} from '@/lib/hooks/queries/useOvertime';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Clock,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Timer,
  TrendingUp,
  CalendarDays,
} from 'lucide-react';
import type { OvertimeRecordResponse } from '@/lib/types/overtime';

// ── Zod schema for overtime request form ─────────────────────
const overtimeFormSchema = z.object({
  overtimeDate: z.string().min(1, 'Date is required'),
  regularHours: z.coerce.number().min(0, 'Must be >= 0'),
  actualHours: z.coerce.number().min(0, 'Must be >= 0'),
  overtimeHours: z.coerce.number().min(0.5, 'Must be at least 0.5 hours'),
  overtimeType: z.enum(['REGULAR', 'WEEKEND', 'HOLIDAY', 'EMERGENCY']),
  notes: z.string().optional(),
});

type OvertimeFormValues = z.infer<typeof overtimeFormSchema>;

// ── Status config ────────────────────────────────────────────
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Approved' };
    case 'PENDING':
      return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Pending' };
    case 'REJECTED':
      return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Rejected' };
    case 'CANCELLED':
      return { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-400', label: 'Cancelled' };
    default:
      return { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400', label: status };
  }
};

const OVERTIME_TYPE_LABELS: Record<string, string> = {
  REGULAR: 'Regular',
  WEEKEND: 'Weekend',
  HOLIDAY: 'Holiday',
  EMERGENCY: 'Emergency',
};

type TabKey = 'my-overtime' | 'request' | 'team' | 'all';

export default function OvertimePage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('my-overtime');
  const [myPage, setMyPage] = useState(0);
  const [teamPage, setTeamPage] = useState(0);
  const [allPage, setAllPage] = useState(0);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const employeeId = user?.employeeId ?? '';

  // Queries
  const { data: myRecords, isLoading: isMyLoading } = useEmployeeOvertimeRecords(
    employeeId,
    myPage,
    10,
    !!employeeId
  );
  const { data: pendingRecords, isLoading: isPendingLoading } = usePendingOvertimeRecords(
    teamPage,
    10
  );
  const { data: allRecords, isLoading: isAllLoading } = useAllOvertimeRecords(allPage, 10);

  // Mutations
  const createOvertime = useCreateOvertimeRecord();
  const approveReject = useApproveOrRejectOvertime();

  // Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OvertimeFormValues>({
    resolver: zodResolver(overtimeFormSchema),
    defaultValues: {
      overtimeType: 'REGULAR',
      regularHours: 8,
      actualHours: 10,
      overtimeHours: 2,
    },
  });

  const onSubmitOvertime = useCallback(
    async (data: OvertimeFormValues) => {
      if (!employeeId) return;
      try {
        await createOvertime.mutateAsync({
          employeeId,
          overtimeDate: data.overtimeDate,
          regularHours: data.regularHours,
          actualHours: data.actualHours,
          overtimeHours: data.overtimeHours,
          overtimeType: data.overtimeType,
          notes: data.notes,
        });
        setSubmitSuccess(true);
        reset();
        setTimeout(() => {
          setSubmitSuccess(false);
          setActiveTab('my-overtime');
        }, 2000);
      } catch {
        // Error handled by React Query
      }
    },
    [createOvertime, reset, employeeId]
  );

  const handleApproval = useCallback(
    (recordId: string, action: 'APPROVE' | 'REJECT') => {
      if (!user?.employeeId) return;
      approveReject.mutate({
        recordId,
        approverId: user.employeeId,
        data: {
          action,
          rejectionReason: action === 'REJECT' ? 'Rejected by manager' : undefined,
        },
      });
    },
    [approveReject, user?.employeeId]
  );

  if (!hasHydrated) return null;
  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  const tabs: { key: TabKey; label: string; permission?: string }[] = [
    { key: 'my-overtime', label: 'My Overtime' },
    { key: 'request', label: 'Request Overtime' },
    { key: 'team', label: 'Team Overtime', permission: Permissions.ATTENDANCE_APPROVE },
    { key: 'all', label: 'All Records', permission: Permissions.ATTENDANCE_VIEW_ALL },
  ];

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ── Reusable overtime table ────────────────────────────────
  const renderOvertimeTable = (
    records: OvertimeRecordResponse[],
    showEmployee = false,
    showActions = false
  ) => (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] overflow-hidden skeuo-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-main)] bg-[var(--bg-secondary)]">
              {showEmployee && (
                <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                  Employee
                </th>
              )}
              <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                Date
              </th>
              <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                Hours
              </th>
              <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                Type
              </th>
              <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                Multiplier
              </th>
              <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                Status
              </th>
              {showActions && (
                <th className="text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-main)]">
            {records.map((record) => {
              const statusConfig = getStatusConfig(record.status);
              return (
                <tr
                  key={record.id}
                  className="hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  {showEmployee && (
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {record.employeeName}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {record.employeeCode}
                        </p>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {formatDate(record.overtimeDate)}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {record.overtimeHours}h overtime
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {record.regularHours}h reg / {record.actualHours}h actual
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {OVERTIME_TYPE_LABELS[record.overtimeType] || record.overtimeType}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {record.multiplier ? `${record.multiplier}x` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                    >
                      {statusConfig.label}
                    </span>
                  </td>
                  {showActions && record.status === 'PENDING' && (
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproval(record.id, 'APPROVE')}
                          disabled={approveReject.isPending}
                          className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(record.id, 'REJECT')}
                          disabled={approveReject.isPending}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  )}
                  {showActions && record.status !== 'PENDING' && (
                    <td className="px-6 py-4 text-xs text-[var(--text-muted)]">-</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPagination = (
    data: { number: number; totalPages: number; totalElements: number } | undefined,
    page: number,
    setPage: (fn: (p: number) => number) => void
  ) => {
    if (!data || data.totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-[var(--text-muted)]">
          Page {data.number + 1} of {data.totalPages} ({data.totalElements} total)
        </p>
        <div className="flex gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-3 py-1.5 text-sm border border-[var(--border-main)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] disabled:opacity-50 transition-colors"
          >
            Previous
          </button>
          <button
            disabled={page >= data.totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-[var(--border-main)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <AppLayout activeMenuItem="overtime">
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Overtime Management
            </h1>
            <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">
              Track and manage overtime hours and approvals
            </p>
          </div>
          <button
            onClick={() => setActiveTab('request')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-sky-700 hover:from-sky-700 hover:to-sky-700 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-sky-500/30 skeuo-button"
          >
            <Plus className="h-5 w-5" />
            Request Overtime
          </button>
        </div>

        {/* Summary Cards */}
        {myRecords && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(() => {
              const records = myRecords.content || [];
              const totalHours = records.reduce((sum: number, r: OvertimeRecordResponse) => sum + (r.overtimeHours || 0), 0);
              const pendingCount = records.filter((r: OvertimeRecordResponse) => r.status === 'PENDING').length;
              const approvedCount = records.filter((r: OvertimeRecordResponse) => r.status === 'APPROVED').length;
              return [
                { label: 'Total OT Hours', value: `${totalHours.toFixed(1)}h`, icon: Clock, gradient: 'from-sky-500 to-sky-700' },
                { label: 'Pending', value: pendingCount, icon: Timer, gradient: 'from-amber-500 to-amber-600' },
                { label: 'Approved', value: approvedCount, icon: CheckCircle, gradient: 'from-emerald-500 to-emerald-600' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-4 hover:shadow-lg transition-all duration-200 skeuo-card"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">{stat.label}</p>
                      <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-[var(--border-main)]">
          <nav className="flex gap-6 -mb-px">
            {tabs.map((tab) => {
              const tabButton = (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-sky-700 text-sky-700 dark:text-sky-400'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-main)]'
                  }`}
                >
                  {tab.label}
                </button>
              );
              if (tab.permission) {
                return (
                  <PermissionGate key={tab.key} permission={tab.permission}>
                    {tabButton}
                  </PermissionGate>
                );
              }
              return tabButton;
            })}
          </nav>
        </div>

        {/* ── My Overtime ── */}
        {activeTab === 'my-overtime' && (
          <div>
            {isMyLoading ? (
              <NuAuraLoader message="Loading your overtime records..." />
            ) : !myRecords || myRecords.content.length === 0 ? (
              <EmptyState
                title="No overtime records"
                description="Your overtime requests will appear here."
                icon={<Clock className="h-12 w-12 text-[var(--text-muted)]" />}
              />
            ) : (
              <>
                {renderOvertimeTable(myRecords.content)}
                {renderPagination(myRecords, myPage, setMyPage)}
              </>
            )}
          </div>
        )}

        {/* ── Request Overtime Form ── */}
        {activeTab === 'request' && (
          <div className="max-w-2xl">
            {submitSuccess ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 text-center">
                <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                  Overtime Request Submitted!
                </h3>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                  Your manager will review the request shortly.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmitOvertime)}
                className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] p-6 space-y-5 skeuo-card"
              >
                <h2 className="text-lg font-semibold text-[var(--text-primary)] skeuo-emboss">
                  Request Overtime
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Date *
                    </label>
                    <input
                      {...register('overtimeDate')}
                      type="date"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2"
                    />
                    {errors.overtimeDate && (
                      <p className="text-xs text-red-500 mt-1">{errors.overtimeDate.message}</p>
                    )}
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Overtime Type *
                    </label>
                    <select
                      {...register('overtimeType')}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2"
                    >
                      {Object.entries(OVERTIME_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Regular Hours */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Regular Hours *
                    </label>
                    <input
                      {...register('regularHours')}
                      type="number"
                      step="0.5"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2"
                    />
                    {errors.regularHours && (
                      <p className="text-xs text-red-500 mt-1">{errors.regularHours.message}</p>
                    )}
                  </div>

                  {/* Actual Hours */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Actual Hours Worked *
                    </label>
                    <input
                      {...register('actualHours')}
                      type="number"
                      step="0.5"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2"
                    />
                    {errors.actualHours && (
                      <p className="text-xs text-red-500 mt-1">{errors.actualHours.message}</p>
                    )}
                  </div>

                  {/* Overtime Hours */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Overtime Hours *
                    </label>
                    <input
                      {...register('overtimeHours')}
                      type="number"
                      step="0.5"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2"
                    />
                    {errors.overtimeHours && (
                      <p className="text-xs text-red-500 mt-1">{errors.overtimeHours.message}</p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Reason / Notes
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 resize-none"
                    placeholder="Describe the reason for overtime..."
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setActiveTab('my-overtime');
                    }}
                    className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl hover:bg-[var(--bg-card-hover)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || createOvertime.isPending}
                    className="px-5 py-2 text-sm font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-xl shadow-lg shadow-sky-700/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createOvertime.isPending ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>

                {createOvertime.isError && (
                  <p className="text-sm text-red-500 mt-2">
                    Failed to submit overtime request. Please try again.
                  </p>
                )}
              </form>
            )}
          </div>
        )}

        {/* ── Team Overtime (Pending Approvals) ── */}
        {activeTab === 'team' && (
          <PermissionGate permission={Permissions.ATTENDANCE_APPROVE}>
            <div>
              {isPendingLoading ? (
                <NuAuraLoader message="Loading pending approvals..." />
              ) : !pendingRecords || pendingRecords.content.length === 0 ? (
                <EmptyState
                  title="No pending approvals"
                  description="All overtime requests have been processed."
                  icon={<CheckCircle className="h-12 w-12 text-[var(--text-muted)]" />}
                />
              ) : (
                <>
                  {renderOvertimeTable(pendingRecords.content, true, true)}
                  {renderPagination(pendingRecords, teamPage, setTeamPage)}
                </>
              )}
            </div>
          </PermissionGate>
        )}

        {/* ── All Records (Admin) ── */}
        {activeTab === 'all' && (
          <PermissionGate permission={Permissions.ATTENDANCE_VIEW_ALL}>
            <div>
              {isAllLoading ? (
                <NuAuraLoader message="Loading all records..." />
              ) : !allRecords || allRecords.content.length === 0 ? (
                <EmptyState
                  title="No overtime records"
                  description="Overtime records will appear here."
                  icon={<Clock className="h-12 w-12 text-[var(--text-muted)]" />}
                />
              ) : (
                <>
                  {renderOvertimeTable(allRecords.content, true)}
                  {renderPagination(allRecords, allPage, setAllPage)}
                </>
              )}
            </div>
          </PermissionGate>
        )}
      </motion.div>
    </AppLayout>
  );
}
