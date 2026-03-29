'use client';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { notifications } from '@mantine/notifications';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  FileText,
  TrendingUp,
  Users,
} from 'lucide-react';
import type {
  PIPResponse,
  CreatePIPRequest,
  PIPStatus,
  PIPCheckInRequest,
} from '@/lib/types/performance';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createPIPSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  managerId: z.string().min(1, 'Manager is required'),
  reason: z.string().min(1, 'Reason is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  goals: z.string().min(1, 'Goals & Objectives are required'),
  checkInFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']),
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

type CreatePIPFormData = z.infer<typeof createPIPSchema>;

const checkInSchema = z.object({
  progressNotes: z.string().min(1, 'Progress notes are required'),
  managerComments: z.string().min(1, 'Manager comments are required'),
});

type CheckInFormData = z.infer<typeof checkInSchema>;

const closePIPSchema = z.object({
  status: z.enum(['COMPLETED', 'EXTENDED', 'TERMINATED']),
  notes: z.string().optional(),
});

type ClosePIPFormData = z.infer<typeof closePIPSchema>;

// ─── Types & Constants ────────────────────────────────────────────────────────

interface PIPFilter {
  departmentId?: string;
  status?: PIPStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

type PIPTab = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

const STATUS_CONFIG: Record<PIPStatus, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE: { label: 'Active', color: 'text-accent-700', bg: 'bg-accent-100', border: 'border-accent-200' },
  COMPLETED: { label: 'Completed', color: 'text-success-700', bg: 'bg-success-100', border: 'border-success-200' },
  EXTENDED: { label: 'Extended', color: 'text-warning-700', bg: 'bg-warning-100', border: 'border-warning-200' },
  TERMINATED: { label: 'Terminated', color: 'text-danger-700', bg: 'bg-danger-100', border: 'border-danger-200' },
};

const PIP_REASONS = [
  'Performance',
  'Behavior',
  'Attendance',
  'Quality',
  'Communication',
  'Teamwork',
  'Other',
];

const DURATION_PRESETS = [
  { label: '30 Days', days: 30 },
  { label: '60 Days', days: 60 },
  { label: '90 Days', days: 90 },
];

// ─── API Functions ────────────────────────────────────────────────────────────

async function fetchPIPs(filters?: PIPFilter): Promise<PIPResponse[]> {
  const params = new URLSearchParams();
  if (filters?.departmentId) params.append('departmentId', filters.departmentId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);
  if (filters?.search) params.append('search', filters.search);

  const res = await apiClient.get<PIPResponse[]>(`/performance/pip?${params}`);
  return res.data;
}

async function createPIP(data: CreatePIPRequest): Promise<PIPResponse> {
  const res = await apiClient.post<PIPResponse>('/performance/pip', data);
  return res.data;
}

async function addCheckIn(pipId: string, data: PIPCheckInRequest): Promise<PIPResponse> {
  const res = await apiClient.post<PIPResponse>(`/performance/pip/${pipId}/check-in`, data);
  return res.data;
}

async function closePIP(
  pipId: string,
  status: 'COMPLETED' | 'EXTENDED' | 'TERMINATED',
  notes?: string
): Promise<PIPResponse> {
  const res = await apiClient.patch<PIPResponse>(`/performance/pip/${pipId}/status`, { status, notes });
  return res.data;
}

// ─── Utility Functions ────────────────────────────────────────────────────────

function calculateDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const today = new Date();
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function calculateProgress(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  const total = end.getTime() - start.getTime();
  const elapsed = today.getTime() - start.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── Components ────────────────────────────────────────────────────────────────

function CreatePIPModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreatePIPFormData>({
    resolver: zodResolver(createPIPSchema),
    defaultValues: {
      employeeId: '',
      managerId: '',
      reason: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      goals: '',
      checkInFrequency: 'WEEKLY',
    },
  });

  const endDate = watch('endDate');

  const createMutation = useMutation({
    mutationFn: (data: CreatePIPFormData) => createPIP(data as CreatePIPRequest),
    onSuccess: () => {
      onSuccess();
      reset();
    },
  });

  if (!open) return null;

  const setDuration = (days: number) => {
    const newEndDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const dateInput = document.querySelector('input[type="date"][value*="' + endDate + '"]') as HTMLInputElement;
    if (dateInput) {
      dateInput.value = newEndDate.toISOString().split('T')[0];
      dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-input)] rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg-input)] border-b border-[var(--border-main)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Create Performance Improvement Plan</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(data => createMutation.mutate(data))} className="p-6 space-y-4">
          {/* Employee & Manager */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Employee
              </label>
              <input
                type="text"
                placeholder="Employee name or ID"
                {...register('employeeId')}
                className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
              />
              {errors.employeeId && (
                <p className="text-danger-500 text-sm mt-1">{errors.employeeId.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Manager
              </label>
              <input
                type="text"
                placeholder="Manager name or ID"
                {...register('managerId')}
                className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
              />
              {errors.managerId && (
                <p className="text-danger-500 text-sm mt-1">{errors.managerId.message}</p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Reason
            </label>
            <select
              {...register('reason')}
              className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
            >
              <option value="">Select a reason</option>
              {PIP_REASONS.map(reason => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
            {errors.reason && (
              <p className="text-danger-500 text-sm mt-1">{errors.reason.message}</p>
            )}
          </div>

          {/* Dates */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Duration
            </label>
            <div className="flex gap-2 mb-3">
              {DURATION_PRESETS.map(preset => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => setDuration(preset.days)}
                  className="px-4 py-1.5 text-sm rounded-lg border border-[var(--border-main)] dark:border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Start Date</label>
                <input
                  type="date"
                  {...register('startDate')}
                  className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                />
                {errors.startDate && (
                  <p className="text-danger-500 text-sm mt-1">{errors.startDate.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">End Date</label>
                <input
                  type="date"
                  {...register('endDate')}
                  className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                />
                {errors.endDate && (
                  <p className="text-danger-500 text-sm mt-1">{errors.endDate.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Goals */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Goals & Objectives
            </label>
            <textarea
              placeholder="Describe the specific goals and success criteria..."
              rows={4}
              {...register('goals')}
              className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
            />
            {errors.goals && (
              <p className="text-danger-500 text-sm mt-1">{errors.goals.message}</p>
            )}
          </div>

          {/* Check-in Frequency */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Check-in Frequency
            </label>
            <select
              {...register('checkInFrequency')}
              className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
            >
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Bi-weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
            {errors.checkInFrequency && (
              <p className="text-danger-500 text-sm mt-1">{errors.checkInFrequency.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-[var(--border-main)]">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="primary"
              isLoading={isSubmitting}
              loadingText="Creating..."
              leftIcon={<Plus size={16} />}
            >
              Create PIP
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PIPDetailModal({
  pip,
  open,
  onClose,
  onUpdated,
}: {
  pip: PIPResponse | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const {
    register: registerCheckIn,
    handleSubmit: handleCheckInSubmit,
    reset: resetCheckIn,
    formState: { errors: checkInErrors, isSubmitting: checkInSubmitting },
  } = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      progressNotes: '',
      managerComments: '',
    },
  });

  const {
    register: registerClose,
    handleSubmit: handleCloseSubmit,
    formState: { errors: closeErrors, isSubmitting: closeSubmitting },
  } = useForm<ClosePIPFormData>({
    resolver: zodResolver(closePIPSchema),
    defaultValues: {
      status: 'COMPLETED',
      notes: '',
    },
  });

  const addCheckInMutation = useMutation({
    mutationFn: (data: CheckInFormData) => addCheckIn(pip!.id, {
      checkInDate: new Date().toISOString().split('T')[0],
      progressNotes: data.progressNotes,
      managerComments: data.managerComments,
    }),
    onSuccess: () => {
      resetCheckIn();
      onUpdated();
    },
    onError: () => notifications.show({ title: 'Error', message: 'Failed to add check-in', color: 'red' }),
  });

  const closeMutation = useMutation({
    mutationFn: (data: ClosePIPFormData) => closePIP(pip!.id, data.status, data.notes),
    onSuccess: () => {
      onUpdated();
    },
  });

  if (!open || !pip) return null;

  const daysRemaining = calculateDaysRemaining(pip.endDate);
  const progress = calculateProgress(pip.startDate, pip.endDate);

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-input)] rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg-input)] border-b border-[var(--border-main)] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">PIP Details</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">{pip.employeeName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Employee</p>
              <p className="font-semibold text-[var(--text-primary)]">{pip.employeeName}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Manager</p>
              <p className="font-semibold text-[var(--text-primary)]">{pip.managerName}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Period</p>
              <p className="font-semibold text-[var(--text-primary)]">
                {formatDate(pip.startDate)} → {formatDate(pip.endDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Status</p>
              <div
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  STATUS_CONFIG[pip.status].bg
                } ${STATUS_CONFIG[pip.status].color} border ${STATUS_CONFIG[pip.status].border}`}
              >
                {STATUS_CONFIG[pip.status].label}
              </div>
            </div>
          </div>

          {/* Progress */}
          {pip.status === 'ACTIVE' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-[var(--text-secondary)]">Progress</p>
                <span className="text-sm text-[var(--text-muted)]">{progress}% • {daysRemaining} days remaining</span>
              </div>
              <div className="w-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full h-2">
                <div
                  className="bg-accent-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Reason & Goals */}
          {pip.reason && (
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-1.5">Reason</p>
              <p className="text-[var(--text-secondary)]">{pip.reason}</p>
            </div>
          )}

          {pip.goals && (
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-1.5">Goals & Objectives</p>
              <div className="bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-lg p-4 text-sm text-[var(--text-secondary)]">
                {pip.goals}
              </div>
            </div>
          )}

          {/* Check-ins */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Check-ins</h3>
            {pip.checkIns && pip.checkIns.length > 0 ? (
              <div className="space-y-4 mb-4">
                {pip.checkIns.map((checkIn, idx) => (
                  <div
                    key={checkIn.id || idx}
                    className="border border-[var(--border-main)] rounded-lg p-4 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {formatDate(checkIn.checkInDate)}
                      </p>
                    </div>
                    {checkIn.progressNotes && (
                      <p className="text-sm text-[var(--text-secondary)] mb-1">
                        <span className="text-[var(--text-muted)]">Progress: </span>{checkIn.progressNotes}
                      </p>
                    )}
                    {checkIn.managerComments && (
                      <p className="text-sm text-[var(--text-secondary)]">
                        <span className="text-[var(--text-muted)]">Manager: </span>{checkIn.managerComments}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] mb-4">No check-ins yet</p>
            )}

            {pip.status === 'ACTIVE' && (
              <form onSubmit={handleCheckInSubmit(data => addCheckInMutation.mutate(data))} className="space-y-4 border-t border-[var(--border-main)] pt-4">
                <textarea
                  placeholder="Employee progress notes..."
                  rows={2}
                  {...registerCheckIn('progressNotes')}
                  className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                />
                {checkInErrors.progressNotes && (
                  <p className="text-danger-500 text-sm">{checkInErrors.progressNotes.message}</p>
                )}
                <textarea
                  placeholder="Manager comments..."
                  rows={2}
                  {...registerCheckIn('managerComments')}
                  className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                />
                {checkInErrors.managerComments && (
                  <p className="text-danger-500 text-sm">{checkInErrors.managerComments.message}</p>
                )}
                <Button
                  type="submit"
                  disabled={checkInSubmitting}
                  variant="primary"
                  className="w-full"
                  leftIcon={<Clock size={16} />}
                >
                  Add Check-in
                </Button>
              </form>
            )}
          </div>

          {/* Status Actions */}
          {pip.status === 'ACTIVE' && (
            <form onSubmit={handleCloseSubmit(data => closeMutation.mutate(data))} className="border-t border-[var(--border-main)] pt-4 space-y-4">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Update Status</p>
              <select
                {...registerClose('status')}
                className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
              >
                <option value="COMPLETED">Mark Complete</option>
                <option value="EXTENDED">Extend PIP</option>
                <option value="TERMINATED">Terminate</option>
              </select>
              {closeErrors.status && (
                <p className="text-danger-500 text-sm">{closeErrors.status.message}</p>
              )}
              <textarea
                placeholder="Closing notes..."
                rows={2}
                {...registerClose('notes')}
                className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
              />
              {closeErrors.notes && (
                <p className="text-danger-500 text-sm">{closeErrors.notes.message}</p>
              )}
              <button
                type="submit"
                disabled={closeSubmitting}
                className="w-full px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Update Status
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function PIPCard({ pip, onView }: { pip: PIPResponse; onView: () => void }) {
  const daysRemaining = calculateDaysRemaining(pip.endDate);
  const progress = calculateProgress(pip.startDate, pip.endDate);
  const statusConfig = STATUS_CONFIG[pip.status];

  return (
    <div className="bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--text-primary)]">{pip.employeeName}</h3>
          <p className="text-sm text-[var(--text-muted)]">{pip.reason || 'General'}</p>
        </div>
        <div
          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}
        >
          {statusConfig.label}
        </div>
      </div>

      <div className="space-y-2 mb-4 text-sm text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <Calendar size={14} />
          <span>
            {formatDate(pip.startDate)} → {formatDate(pip.endDate)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={14} />
          <span>Manager: {pip.managerName}</span>
        </div>
      </div>

      {pip.status === 'ACTIVE' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Progress</span>
            <span className="text-xs text-[var(--text-muted)]">{progress}%</span>
          </div>
          <div className="w-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full h-2">
            <div className="bg-accent-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">{daysRemaining} days remaining</p>
        </div>
      )}

      <button
        onClick={onView}
        className="w-full px-4 py-2 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-400 rounded-lg hover:bg-accent-100 dark:hover:bg-accent-900/40 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Eye size={14} />
        View Details
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PIPPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PIPTab>('ACTIVE');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPIP, setSelectedPIP] = useState<PIPResponse | null>(null);
  const [search, setSearch] = useState('');
  const [filterDepartment] = useState('');

  const filters: PIPFilter = useMemo(() => {
    const statusMap: Record<PIPTab, PIPStatus | undefined> = {
      ACTIVE: 'ACTIVE',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'TERMINATED',
    };
    return {
      status: statusMap[activeTab],
      search,
      departmentId: filterDepartment || undefined,
    };
  }, [activeTab, search, filterDepartment]);

  const { data: pips = [], isLoading, error } = useQuery({
    queryKey: ['pips', filters],
    queryFn: () => fetchPIPs(filters),
  });

  const handleCreateSuccess = () => {
    setCreateOpen(false);
    queryClient.invalidateQueries({ queryKey: ['pips'] });
  };

  const handlePIPUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['pips'] });
    setSelectedPIP(null);
  };

  // Stats
  const stats = useMemo(() => {
    return {
      active: pips.filter(p => p.status === 'ACTIVE').length,
      completed: pips.filter(p => p.status === 'COMPLETED').length,
      avgDuration: pips.length > 0
        ? Math.round(
            pips.reduce((sum, p) => {
              const start = new Date(p.startDate);
              const end = new Date(p.endDate);
              return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
            }, 0) / pips.length
          )
        : 0,
    };
  }, [pips]);

  if (error) {
    return (
      <div className="p-6 bg-danger-50 dark:bg-danger-900/20 rounded-lg border border-danger-200 dark:border-danger-800 flex items-center gap-4">
        <AlertCircle size={20} className="text-danger-600 dark:text-danger-400" />
        <div>
          <p className="font-medium text-danger-900 dark:text-danger-200">Failed to load PIPs</p>
          <p className="text-sm text-danger-700 dark:text-danger-300">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold skeuo-emboss">Performance Improvement Plans</h1>
            <p className="text-[var(--text-muted)] mt-1">Manage and track employee PIPs</p>
          </div>
          <PermissionGate permission={Permissions.PIP_CREATE}>
            <Button
              onClick={() => setCreateOpen(true)}
              variant="primary"
              leftIcon={<Plus size={18} />}
            >
              Create PIP
            </Button>
          </PermissionGate>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)] p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                <TrendingUp className="text-accent-600 dark:text-accent-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Active PIPs</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)] p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                <CheckCircle2 className="text-success-600 dark:text-success-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Completed</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.completed}</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)] p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent-300 dark:bg-accent-900/30 flex items-center justify-center">
                <Calendar className="text-accent-800 dark:text-accent-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Avg Duration</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.avgDuration} days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs & Filters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {(['ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-accent-700 text-white'
                    : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-main)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {tab === 'ACTIVE' && 'Active'}
                {tab === 'COMPLETED' && 'Completed'}
                {tab === 'CANCELLED' && 'Cancelled'}
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
              <input
                type="text"
                placeholder="Search by employee name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
              />
            </div>
            <button className="px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-2">
              <Filter size={16} />
              Filter
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-accent-200 border-t-accent-700 rounded-full animate-spin" />
          </div>
        ) : pips.length === 0 ? (
          <div className="bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)] p-12 text-center">
            <FileText className="w-12 h-12 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)] font-medium">No PIPs found</p>
            <p className="text-[var(--text-muted)] text-sm mt-1">Create your first PIP to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pips.map(pip => (
              <PIPCard
                key={pip.id}
                pip={pip}
                onView={() => setSelectedPIP(pip)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreatePIPModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={handleCreateSuccess} />
      <PIPDetailModal
        pip={selectedPIP}
        open={!!selectedPIP}
        onClose={() => setSelectedPIP(null)}
        onUpdated={handlePIPUpdated}
      />
      </div>
    </AppLayout>
  );
}
