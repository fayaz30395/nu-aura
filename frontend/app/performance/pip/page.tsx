'use client';
import { AppLayout } from '@/components/layout';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  FileText,
  TrendingUp,
  Users,
  BookOpen,
} from 'lucide-react';
import type {
  PIPResponse,
  CreatePIPRequest,
  PIPStatus,
  PIPCheckInRequest,
} from '@/lib/types/performance';

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
  ACTIVE: { label: 'Active', color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' },
  COMPLETED: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200' },
  EXTENDED: { label: 'Extended', color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-200' },
  TERMINATED: { label: 'Terminated', color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' },
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

  const res = await fetch(`/api/v1/performance/pip?${params}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load PIPs');
  return res.json();
}

async function createPIP(data: CreatePIPRequest): Promise<PIPResponse> {
  const res = await fetch('/api/v1/performance/pip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create PIP');
  return res.json();
}

async function fetchPIPById(id: string): Promise<PIPResponse> {
  const res = await fetch(`/api/v1/performance/pip/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load PIP');
  return res.json();
}

async function addCheckIn(pipId: string, data: PIPCheckInRequest): Promise<PIPResponse> {
  const res = await fetch(`/api/v1/performance/pip/${pipId}/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add check-in');
  return res.json();
}

async function closePIP(
  pipId: string,
  status: 'COMPLETED' | 'EXTENDED' | 'TERMINATED',
  notes?: string
): Promise<PIPResponse> {
  const res = await fetch(`/api/v1/performance/pip/${pipId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok) throw new Error('Failed to update PIP status');
  return res.json();
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
  const [formData, setFormData] = useState<CreatePIPRequest>({
    employeeId: '',
    managerId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reason: '',
    goals: '',
    checkInFrequency: 'WEEKLY',
  });

  const createMutation = useMutation({
    mutationFn: createPIP,
    onSuccess: () => {
      onSuccess();
      setFormData({
        employeeId: '',
        managerId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reason: '',
        goals: '',
        checkInFrequency: 'WEEKLY',
      });
    },
  });

  if (!open) return null;

  const setDuration = (days: number) => {
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setFormData(prev => ({
      ...prev,
      endDate: endDate.toISOString().split('T')[0],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-surface-900 dark:text-white">Create Performance Improvement Plan</h2>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={e => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="p-6 space-y-4"
        >
          {/* Employee & Manager */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Employee
              </label>
              <input
                type="text"
                placeholder="Employee name or ID"
                value={formData.employeeId}
                onChange={e => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Manager
              </label>
              <input
                type="text"
                placeholder="Manager name or ID"
                value={formData.managerId}
                onChange={e => setFormData(prev => ({ ...prev, managerId: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Reason
            </label>
            <select
              value={formData.reason || ''}
              onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="">Select a reason</option>
              {PIP_REASONS.map(reason => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Duration
            </label>
            <div className="flex gap-2 mb-3">
              {DURATION_PRESETS.map(preset => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => setDuration(preset.days)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-surface-300 dark:border-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-surface-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Goals */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Goals & Objectives
            </label>
            <textarea
              value={formData.goals || ''}
              onChange={e => setFormData(prev => ({ ...prev, goals: e.target.value }))}
              placeholder="Describe the specific goals and success criteria..."
              rows={4}
              className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {/* Check-in Frequency */}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Check-in Frequency
            </label>
            <select
              value={formData.checkInFrequency || 'WEEKLY'}
              onChange={e => setFormData(prev => ({ ...prev, checkInFrequency: e.target.value as any }))}
              className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Bi-weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create PIP
                </>
              )}
            </button>
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
  const [checkInNotes, setCheckInNotes] = useState('');
  const [managerComments, setManagerComments] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [closingStatus, setClosingStatus] = useState<'COMPLETED' | 'EXTENDED' | 'TERMINATED'>('COMPLETED');

  const addCheckInMutation = useMutation({
    mutationFn: (data: PIPCheckInRequest) => addCheckIn(pip!.id, data),
    onSuccess: () => {
      setCheckInNotes('');
      setManagerComments('');
      onUpdated();
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => closePIP(pip!.id, closingStatus, closingNotes),
    onSuccess: () => {
      setClosingNotes('');
      onUpdated();
    },
  });

  if (!open || !pip) return null;

  const daysRemaining = calculateDaysRemaining(pip.endDate);
  const progress = calculateProgress(pip.startDate, pip.endDate);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">PIP Details</h2>
            <p className="text-sm text-surface-500 mt-0.5">{pip.employeeName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-surface-500 mb-1">Employee</p>
              <p className="font-semibold text-surface-900 dark:text-white">{pip.employeeName}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 mb-1">Manager</p>
              <p className="font-semibold text-surface-900 dark:text-white">{pip.managerName}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 mb-1">Period</p>
              <p className="font-semibold text-surface-900 dark:text-white">
                {formatDate(pip.startDate)} → {formatDate(pip.endDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-500 mb-1">Status</p>
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
                <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Progress</p>
                <span className="text-sm text-surface-500">{progress}% • {daysRemaining} days remaining</span>
              </div>
              <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Reason & Goals */}
          {pip.reason && (
            <div>
              <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Reason</p>
              <p className="text-surface-600 dark:text-surface-400">{pip.reason}</p>
            </div>
          )}

          {pip.goals && (
            <div>
              <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Goals & Objectives</p>
              <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-3 text-sm text-surface-700 dark:text-surface-300">
                {pip.goals}
              </div>
            </div>
          )}

          {/* Check-ins */}
          <div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-3">Check-ins</h3>
            {pip.checkIns && pip.checkIns.length > 0 ? (
              <div className="space-y-3 mb-4">
                {pip.checkIns.map((checkIn, idx) => (
                  <div
                    key={checkIn.id || idx}
                    className="border border-surface-200 dark:border-surface-700 rounded-lg p-3 bg-surface-50 dark:bg-surface-700/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-surface-900 dark:text-white">
                        {formatDate(checkIn.checkInDate)}
                      </p>
                    </div>
                    {checkIn.progressNotes && (
                      <p className="text-sm text-surface-700 dark:text-surface-300 mb-1">
                        <span className="text-surface-500">Progress: </span>{checkIn.progressNotes}
                      </p>
                    )}
                    {checkIn.managerComments && (
                      <p className="text-sm text-surface-700 dark:text-surface-300">
                        <span className="text-surface-500">Manager: </span>{checkIn.managerComments}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-500 mb-4">No check-ins yet</p>
            )}

            {pip.status === 'ACTIVE' && (
              <div className="space-y-3 border-t border-surface-200 dark:border-surface-700 pt-4">
                <textarea
                  value={checkInNotes}
                  onChange={e => setCheckInNotes(e.target.value)}
                  placeholder="Employee progress notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
                <textarea
                  value={managerComments}
                  onChange={e => setManagerComments(e.target.value)}
                  placeholder="Manager comments..."
                  rows={2}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
                <button
                  onClick={() =>
                    addCheckInMutation.mutate({
                      checkInDate: new Date().toISOString().split('T')[0],
                      progressNotes: checkInNotes,
                      managerComments,
                    })
                  }
                  disabled={addCheckInMutation.isPending}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Clock size={16} />
                  Add Check-in
                </button>
              </div>
            )}
          </div>

          {/* Status Actions */}
          {pip.status === 'ACTIVE' && (
            <div className="border-t border-surface-200 dark:border-surface-700 pt-4 space-y-3">
              <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Update Status</p>
              <select
                value={closingStatus}
                onChange={e => setClosingStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="COMPLETED">Mark Complete</option>
                <option value="EXTENDED">Extend PIP</option>
                <option value="TERMINATED">Terminate</option>
              </select>
              <textarea
                value={closingNotes}
                onChange={e => setClosingNotes(e.target.value)}
                placeholder="Closing notes..."
                rows={2}
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
              <button
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Update Status
              </button>
            </div>
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
    <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-surface-900 dark:text-white">{pip.employeeName}</h3>
          <p className="text-sm text-surface-500">{pip.reason || 'General'}</p>
        </div>
        <div
          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}
        >
          {statusConfig.label}
        </div>
      </div>

      <div className="space-y-2 mb-4 text-sm text-surface-600 dark:text-surface-400">
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
            <span className="text-xs font-medium text-surface-600 dark:text-surface-400">Progress</span>
            <span className="text-xs text-surface-500">{progress}%</span>
          </div>
          <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
            <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-surface-500 mt-1.5">{daysRemaining} days remaining</p>
        </div>
      )}

      <button
        onClick={onView}
        className="w-full px-3 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
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
  const [filterDepartment, setFilterDepartment] = useState('');

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
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-3">
        <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
        <div>
          <p className="font-medium text-red-900 dark:text-red-200">Failed to load PIPs</p>
          <p className="text-sm text-red-700 dark:text-red-300">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-white">Performance Improvement Plans</h1>
            <p className="text-surface-500 mt-1">Manage and track employee PIPs</p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 font-medium"
          >
            <Plus size={18} />
            Create PIP
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-surface-500">Active PIPs</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-surface-500">Completed</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.completed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Calendar className="text-purple-600 dark:text-purple-400" size={20} />
              </div>
              <div>
                <p className="text-sm text-surface-500">Avg Duration</p>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.avgDuration} days</p>
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
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'
                }`}
              >
                {tab === 'ACTIVE' && 'Active'}
                {tab === 'COMPLETED' && 'Completed'}
                {tab === 'CANCELLED' && 'Cancelled'}
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={16} />
              <input
                type="text"
                placeholder="Search by employee name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <button className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors flex items-center gap-2">
              <Filter size={16} />
              Filter
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : pips.length === 0 ? (
          <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-12 text-center">
            <FileText className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
            <p className="text-surface-600 dark:text-surface-400 font-medium">No PIPs found</p>
            <p className="text-surface-500 text-sm mt-1">Create your first PIP to get started</p>
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
