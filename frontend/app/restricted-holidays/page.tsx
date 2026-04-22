'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {AppLayout} from '@/components/layout/AppLayout';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {SkeletonCard, SkeletonForm, SkeletonTable} from '@/components/ui/Skeleton';
import {EmptyState} from '@/components/ui/EmptyState';
import {motion} from 'framer-motion';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  Ban,
  Calendar,
  CalendarDays,
  CheckCircle,
  Clock,
  Edit3,
  Plus,
  Settings,
  Star,
  Trash2,
  XCircle,
} from 'lucide-react';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {
  useApproveSelection,
  useAvailableRestrictedHolidays,
  useCancelSelection,
  useCreateRestrictedHoliday,
  useDeleteRestrictedHoliday,
  useMyRestrictedHolidaySelections,
  useMyRestrictedHolidaySummary,
  useRejectSelection,
  useRestrictedHolidayPolicy,
  useRestrictedHolidays,
  useSaveRestrictedHolidayPolicy,
  useSelectionsByStatus,
  useSelectRestrictedHoliday,
  useUpdateRestrictedHoliday,
} from '@/lib/hooks/queries/useRestrictedHolidays';
import type {
  HolidayCategory,
  PolicyRequest,
  RestrictedHoliday,
  RestrictedHolidayRequest,
  RestrictedHolidaySelection,
  SelectionStatus,
} from '@/lib/types/hrms/restricted-holiday';

// ─── Zod Schemas ────────────────────────────────────────────────

const holidayFormSchema = z.object({
  holidayName: z.string().min(1, 'Holiday name is required'),
  holidayDate: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
  category: z.enum(['RELIGIOUS', 'REGIONAL', 'CULTURAL', 'NATIONAL', 'OTHER']).optional(),
  applicableRegions: z.string().optional(),
  applicableDepartments: z.string().optional(),
  isActive: z.boolean().optional(),
});

type HolidayFormValues = z.infer<typeof holidayFormSchema>;

const policyFormSchema = z.object({
  maxSelectionsPerYear: z.number().min(1, 'Must allow at least 1 selection'),
  requiresApproval: z.boolean(),
  year: z.number(),
  minDaysBeforeSelection: z.number().min(0).optional(),
});

type PolicyFormValues = z.infer<typeof policyFormSchema>;

// ─── Tab Types ──────────────────────────────────────────────────

type TabView = 'browse' | 'my-selections' | 'manage' | 'approvals' | 'policy';

// ─── Status Config ──────────────────────────────────────────────

const statusConfig: Record<SelectionStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof CheckCircle
}> = {
  PENDING: {label: 'Pending', color: "text-status-warning-text", bgColor: "bg-status-warning-bg border-status-warning-border", icon: Clock},
  APPROVED: {
    label: 'Approved',
    color: "text-status-success-text",
    bgColor: "bg-status-success-bg border-status-success-border",
    icon: CheckCircle
  },
  REJECTED: {label: 'Rejected', color: "text-status-danger-text", bgColor: "bg-status-danger-bg border-status-danger-border", icon: XCircle},
  CANCELLED: {label: 'Cancelled', color: "text-muted", bgColor: "bg-base border-subtle", icon: Ban},
};

const categoryLabels: Record<HolidayCategory, string> = {
  RELIGIOUS: 'Religious',
  REGIONAL: 'Regional',
  CULTURAL: 'Cultural',
  NATIONAL: 'National',
  OTHER: 'Other',
};

const categoryColors: Record<HolidayCategory, string> = {
  RELIGIOUS: "bg-accent-subtle text-accent",
  REGIONAL: "bg-accent-subtle text-accent",
  CULTURAL: "bg-accent-subtle text-accent",
  NATIONAL: "bg-status-success-bg text-status-success-text",
  OTHER: "bg-surface text-secondary",
};

// ═══════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════

export default function RestrictedHolidaysPage() {
  const router = useRouter();
  const {isAuthenticated, hasHydrated} = useAuth();
  const [activeTab, setActiveTab] = useState<TabView>('browse');
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<RestrictedHoliday | null>(null);
  const [_showPolicyForm, _setShowPolicyForm] = useState(false);
  const [deleteHolidayId, setDeleteHolidayId] = useState<string | null>(null);

  const year = new Date().getFullYear();

  // ─── Queries ────────────────────────────────────────────────
  const {data: availableHolidays = [], isLoading: isAvailableLoading} =
    useAvailableRestrictedHolidays(year, isAuthenticated);

  const {data: mySelections = [], isLoading: isSelectionsLoading} =
    useMyRestrictedHolidaySelections(year, isAuthenticated);

  const {data: summary, isLoading: _isSummaryLoading} =
    useMyRestrictedHolidaySummary(year, isAuthenticated);

  const {data: pendingSelections, isLoading: isPendingLoading} =
    useSelectionsByStatus('PENDING', 0, 50, isAuthenticated && activeTab === 'approvals');

  const {data: allHolidays, isLoading: isAllLoading} =
    useRestrictedHolidays(0, 50, year, isAuthenticated && activeTab === 'manage');

  const {data: policy, isLoading: isPolicyLoading} =
    useRestrictedHolidayPolicy(year, isAuthenticated);

  // ─── Mutations ──────────────────────────────────────────────
  const selectHoliday = useSelectRestrictedHoliday();
  const cancelSelection = useCancelSelection();
  const approveSelection = useApproveSelection();
  const rejectSelection = useRejectSelection();
  const createHoliday = useCreateRestrictedHoliday();
  const updateHoliday = useUpdateRestrictedHoliday();
  const deleteHoliday = useDeleteRestrictedHoliday();
  const savePolicy = useSaveRestrictedHolidayPolicy();

  // ─── Derived state ─────────────────────────────────────────
  const selectedHolidayIds = useMemo(
    () => new Set(mySelections.filter(s => s.status !== 'CANCELLED' && s.status !== 'REJECTED').map(s => s.restrictedHolidayId)),
    [mySelections]
  );

  if (!hasHydrated) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div
            className='h-8 w-8 border-4 border-[var(--accent-primary)] border-t-accent-500 rounded-full animate-spin'/>
        </div>
      </AppLayout>
    );
  }
  if (!isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  // ─── Tab definitions ───────────────────────────────────────
  const tabs: { id: TabView; label: string; icon: typeof Calendar; permission?: string }[] = [
    {id: 'browse', label: 'Browse Holidays', icon: Calendar},
    {id: 'my-selections', label: 'My Selections', icon: Star},
    {id: 'approvals', label: 'Approvals', icon: CheckCircle, permission: Permissions.LEAVE_APPROVE},
    {id: 'manage', label: 'Manage Holidays', icon: Settings, permission: Permissions.LEAVE_MANAGE},
    {id: 'policy', label: 'Policy', icon: Settings, permission: Permissions.LEAVE_MANAGE},
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* ─── Header ─────────────────────────────────────────── */}
        <div className="row-between">
          <div>
            <h1 className='text-2xl font-bold text-primary'>
              Restricted Holidays
            </h1>
            <p className='text-sm text-muted mt-1'>
              Choose from optional holidays within your annual quota
            </p>
          </div>
          {summary && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className='text-xs text-muted uppercase tracking-wider'>
                  Quota {year}
                </p>
                <p className='text-lg font-semibold text-primary'>
                  <span className='text-accent'>{summary.usedSelections}</span>
                  <span className='text-muted mx-1'>/</span>
                  {summary.maxSelections}
                </p>
              </div>
              <div className='w-20 h-2 bg-elevated rounded-full overflow-hidden'>
                <div
                  className='h-full bg-accent rounded-full transition-all'
                  style={{
                    width: `${Math.min(100, (summary.usedSelections / summary.maxSelections) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ─── Tabs ───────────────────────────────────────────── */}
        <div className='border-b border-subtle'>
          <nav className="flex gap-1 -mb-px" aria-label="Tabs">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const content = (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                    activeTab === tab.id
                      ? "border-[var(--accent-primary)] text-accent"
                      : "border-transparent text-muted hover:text-secondary hover:border-subtle"
                  }`}
                >
                  <TabIcon className="w-4 h-4"/>
                  {tab.label}
                </button>
              );
              if (tab.permission) {
                return (
                  <PermissionGate key={tab.id} permission={tab.permission}>
                    {content}
                  </PermissionGate>
                );
              }
              return <span key={tab.id}>{content}</span>;
            })}
          </nav>
        </div>

        {/* ─── Tab Content ────────────────────────────────────── */}
        {activeTab === 'browse' && (
          <BrowseTab
            holidays={availableHolidays}
            isLoading={isAvailableLoading}
            selectedIds={selectedHolidayIds}
            onSelect={(id) => selectHoliday.mutate(id)}
            isSelecting={selectHoliday.isPending}
            summary={summary ?? null}
          />
        )}

        {activeTab === 'my-selections' && (
          <MySelectionsTab
            selections={mySelections}
            isLoading={isSelectionsLoading}
            onCancel={(id) => cancelSelection.mutate(id)}
            isCancelling={cancelSelection.isPending}
          />
        )}

        {activeTab === 'approvals' && (
          <ApprovalsTab
            selections={pendingSelections?.content ?? []}
            isLoading={isPendingLoading}
            onApprove={(id) => approveSelection.mutate(id)}
            onReject={(id, reason) =>
              rejectSelection.mutate({selectionId: id, data: {rejectionReason: reason}})
            }
            isActing={approveSelection.isPending || rejectSelection.isPending}
          />
        )}

        {activeTab === 'manage' && (
          <ManageTab
            holidays={allHolidays?.content ?? []}
            isLoading={isAllLoading}
            onAdd={() => {
              setEditingHoliday(null);
              setShowHolidayForm(true);
            }}
            onEdit={(h) => {
              setEditingHoliday(h);
              setShowHolidayForm(true);
            }}
            onDelete={(id) => setDeleteHolidayId(id)}
          />
        )}

        {activeTab === 'policy' && (
          <PolicyTab
            policy={policy ?? null}
            isLoading={isPolicyLoading}
            year={year}
            onSave={(data) => savePolicy.mutate(data)}
            isSaving={savePolicy.isPending}
          />
        )}

        {/* ─── Delete Holiday Confirm Dialog ──────────────────── */}
        <ConfirmDialog
          isOpen={deleteHolidayId !== null}
          onClose={() => setDeleteHolidayId(null)}
          onConfirm={() => {
            if (deleteHolidayId) {
              deleteHoliday.mutate(deleteHolidayId, {
                onSuccess: () => setDeleteHolidayId(null),
                onError: () => setDeleteHolidayId(null),
              });
            }
          }}
          title="Delete Holiday"
          message="Are you sure you want to delete this restricted holiday? This action cannot be undone."
          confirmText="Delete"
          type="danger"
          loading={deleteHoliday.isPending}
        />

        {/* ─── Holiday Form Modal ─────────────────────────────── */}
        {showHolidayForm && (
          <HolidayFormModal
            holiday={editingHoliday}
            onClose={() => {
              setShowHolidayForm(false);
              setEditingHoliday(null);
            }}
            onSubmit={(data) => {
              if (editingHoliday) {
                updateHoliday.mutate(
                  {id: editingHoliday.id, data},
                  {
                    onSuccess: () => {
                      setShowHolidayForm(false);
                      setEditingHoliday(null);
                    }
                  }
                );
              } else {
                createHoliday.mutate(data, {
                  onSuccess: () => {
                    setShowHolidayForm(false);
                  },
                });
              }
            }}
            isSubmitting={createHoliday.isPending || updateHoliday.isPending}
          />
        )}
      </div>
    </AppLayout>
  );
}

// ═══════════════════════════════════════════════════════════════
// Browse Tab - Employee views available holidays and selects
// ═══════════════════════════════════════════════════════════════

interface BrowseTabProps {
  holidays: RestrictedHoliday[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  isSelecting: boolean;
  summary: { remainingSelections: number; requiresApproval: boolean } | null;
}

function BrowseTab({holidays, isLoading, selectedIds, onSelect, isSelecting, summary}: BrowseTabProps) {
  if (isLoading) return <div
    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length: 6}).map((_, i) =>
    <SkeletonCard key={i}/>)}</div>;
  if (holidays.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className='w-12 h-12 text-muted'/>}
        title="No restricted holidays available"
        description="Your organization has not published any restricted holidays for this year yet."
      />
    );
  }

  const quotaExhausted = summary !== null && summary.remainingSelections <= 0;

  return (
    <div className="space-y-4">
      {summary && (
        <div
          className='rounded-lg border border-[var(--accent-primary)] bg-accent-subtle p-4'>
          <p className='text-sm text-accent'>
            You have <strong>{summary.remainingSelections}</strong> selection(s) remaining.
            {summary.requiresApproval && ' Selections require manager approval.'}
          </p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {holidays.map((holiday) => {
          const isSelected = selectedIds.has(holiday.id);
          const isPast = new Date(holiday.holidayDate) < new Date();
          return (
            <motion.div
              key={holiday.id}
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              className={`rounded-xl border p-6 transition-shadow hover:shadow-[var(--shadow-elevated)] ${
                isSelected
                  ? "border-[var(--accent-primary)] bg-accent-subtle"
                  : "border-subtle bg-[var(--bg-card)]"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className='font-semibold text-primary'>
                    {holiday.holidayName}
                  </h3>
                  <p className='text-sm text-muted mt-0.5'>
                    {new Date(holiday.holidayDate).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${categoryColors[holiday.category]}`}>
                  {categoryLabels[holiday.category]}
                </span>
              </div>
              {holiday.description && (
                <p className='text-sm text-secondary mb-4'>
                  {holiday.description}
                </p>
              )}
              <div className="mt-auto">
                {isSelected ? (
                  <span
                    className='inline-flex items-center gap-1.5 text-sm font-medium text-accent'>
                    <CheckCircle className="w-4 h-4"/>
                    Selected
                  </span>
                ) : isPast ? (
                  <span className='text-sm text-muted'>Past holiday</span>
                ) : (
                  <button
                    onClick={() => onSelect(holiday.id)}
                    disabled={isSelecting || quotaExhausted}
                    className='inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg\n                      bg-accent text-inverse hover:bg-accent-hover disabled:opacity-50\n                      disabled:cursor-not-allowed transition-colors\n                      focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2'
                  >
                    <Plus className="w-4 h-4"/>
                    Select
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// My Selections Tab
// ═══════════════════════════════════════════════════════════════

interface MySelectionsTabProps {
  selections: RestrictedHolidaySelection[];
  isLoading: boolean;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}

function MySelectionsTab({selections, isLoading, onCancel, isCancelling}: MySelectionsTabProps) {
  if (isLoading) return <SkeletonTable rows={4} columns={4}/>;
  if (selections.length === 0) {
    return (
      <EmptyState
        icon={<Star className='w-12 h-12 text-muted'/>}
        title="No selections yet"
        description="Browse available restricted holidays and select the ones you'd like to take."
      />
    );
  }

  return (
    <div className="space-y-4">
      {selections.map((selection) => {
        const config = statusConfig[selection.status];
        const StatusIcon = config.icon;
        const canCancel = selection.status === 'PENDING' || selection.status === 'APPROVED';

        return (
          <motion.div
            key={selection.id}
            initial={{opacity: 0, x: -10}}
            animate={{opacity: 1, x: 0}}
            className={`row-between rounded-lg border p-4 ${config.bgColor}`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${config.color} bg-[var(--bg-card)]`}>
                <CalendarDays className="w-5 h-5"/>
              </div>
              <div>
                <h4 className='font-medium text-primary'>
                  {selection.holidayName ?? 'Unknown Holiday'}
                </h4>
                <p className='text-sm text-muted'>
                  {selection.holidayDate
                    ? new Date(selection.holidayDate).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                    : 'Date N/A'}
                </p>
                {selection.rejectionReason && (
                  <p className='text-xs text-status-danger-text mt-1'>
                    Reason: {selection.rejectionReason}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${config.color}`}>
                <StatusIcon className="w-4 h-4"/>
                {config.label}
              </span>
              {canCancel && (
                <button
                  onClick={() => onCancel(selection.id)}
                  disabled={isCancelling}
                  className='text-sm text-muted hover:text-status-danger-text transition-colors\n                    focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2 rounded px-2 py-1'
                >
                  Cancel
                </button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Approvals Tab (Manager)
// ═══════════════════════════════════════════════════════════════

interface ApprovalsTabProps {
  selections: RestrictedHolidaySelection[];
  isLoading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  isActing: boolean;
}

function ApprovalsTab({selections, isLoading, onApprove, onReject, isActing}: ApprovalsTabProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (isLoading) return <SkeletonTable rows={4} columns={5}/>;
  if (selections.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle className='w-12 h-12 text-muted'/>}
        title="No pending approvals"
        description="There are no restricted holiday selections waiting for approval."
      />
    );
  }

  return (
    <div className="space-y-4">
      {selections.map((selection) => (
        <div
          key={selection.id}
          className='row-between rounded-lg border border-status-warning-border bg-status-warning-bg p-4'
        >
          <div>
            <h4 className='font-medium text-primary'>
              {selection.holidayName ?? 'Unknown Holiday'}
            </h4>
            <p className='text-sm text-muted'>
              Employee: {selection.employeeId.slice(0, 8)}...
              {' | '}
              {selection.holidayDate
                ? new Date(selection.holidayDate).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
                : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {rejectingId === selection.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  className='text-sm border rounded-lg px-4 py-1.5 w-48 focus:outline-none\n                    focus:ring-2 focus:ring-accent-700 border-subtle'
                />
                <button
                  onClick={() => {
                    onReject(selection.id, rejectReason);
                    setRejectingId(null);
                    setRejectReason('');
                  }}
                  disabled={isActing}
                  className='px-4 py-1.5 text-sm bg-status-danger-bg text-inverse rounded-lg hover:bg-status-danger-bg disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason('');
                  }}
                  className='px-4 py-1.5 text-sm text-secondary hover:text-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onApprove(selection.id)}
                  disabled={isActing}
                  className='inline-flex items-center gap-1 px-4 py-1.5 text-sm font-medium\n                    bg-status-success-bg text-inverse rounded-lg hover:bg-status-success-bg\n                    disabled:opacity-50 transition-colors\n                    focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2'
                >
                  <CheckCircle className="w-3.5 h-3.5"/>
                  Approve
                </button>
                <button
                  onClick={() => setRejectingId(selection.id)}
                  disabled={isActing}
                  className='inline-flex items-center gap-1 px-4 py-1.5 text-sm font-medium\n                    bg-[var(--bg-card)] text-status-danger-text border border-status-danger-border rounded-lg hover:bg-status-danger-bg\n                    disabled:opacity-50 transition-colors\n                    focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2'
                >
                  <XCircle className="w-3.5 h-3.5"/>
                  Reject
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Manage Tab (Admin)
// ═══════════════════════════════════════════════════════════════

interface ManageTabProps {
  holidays: RestrictedHoliday[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (h: RestrictedHoliday) => void;
  onDelete: (id: string) => void;
}

function ManageTab({holidays, isLoading, onAdd, onEdit, onDelete}: ManageTabProps) {
  if (isLoading) return <SkeletonTable rows={5} columns={4}/>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onAdd}
          className='inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium\n            bg-accent text-inverse rounded-lg hover:bg-accent-hover transition-colors\n            focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2'
        >
          <Plus className="w-4 h-4"/>
          Add Restricted Holiday
        </button>
      </div>
      {holidays.length === 0 ? (
        <EmptyState
          icon={<Calendar className='w-12 h-12 text-muted'/>}
          title="No restricted holidays"
          description="Add restricted holidays that employees can opt into."
        />
      ) : (
        <div className='overflow-hidden rounded-xl border border-subtle'>
          <table className="w-full text-sm">
            <thead className='bg-base'>
            <tr>
              <th className='text-left px-4 py-2 font-medium text-secondary'>Holiday</th>
              <th className='text-left px-4 py-2 font-medium text-secondary'>Date</th>
              <th className='text-left px-4 py-2 font-medium text-secondary'>Category</th>
              <th className='text-left px-4 py-2 font-medium text-secondary'>Status</th>
              <th className='text-right px-4 py-2 font-medium text-secondary'>Actions</th>
            </tr>
            </thead>
            <tbody className='divide-y divide-surface-100'>
            {holidays.map((holiday) => (
              <tr key={holiday.id} className='bg-[var(--bg-card)] hover:bg-base'>
                <td className="px-4 py-4">
                  <div>
                    <p className='font-medium text-primary'>{holiday.holidayName}</p>
                    {holiday.description && (
                      <p className='text-xs text-muted mt-0.5 truncate max-w-xs'>{holiday.description}</p>
                    )}
                  </div>
                </td>
                <td className='px-4 py-4 text-secondary'>
                  {new Date(holiday.holidayDate).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${categoryColors[holiday.category]}`}>
                      {categoryLabels[holiday.category]}
                    </span>
                </td>
                <td className="px-4 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      holiday.isActive
                        ? "bg-status-success-bg text-status-success-text"
                        : "bg-surface text-muted"
                    }`}>
                      {holiday.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(holiday)}
                      className='p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent-subtle\n                          transition-colors focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2'
                      aria-label={`Edit ${holiday.holidayName}`}
                    >
                      <Edit3 className="w-4 h-4"/>
                    </button>
                    <button
                      onClick={() => onDelete(holiday.id)}
                      className='p-1.5 rounded-lg text-muted hover:text-status-danger-text hover:bg-status-danger-bg\n                          transition-colors focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2'
                      aria-label={`Delete ${holiday.holidayName}`}
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Policy Tab (Admin)
// ═══════════════════════════════════════════════════════════════

interface PolicyTabProps {
  policy: {
    maxSelectionsPerYear: number;
    requiresApproval: boolean;
    minDaysBeforeSelection: number;
    year?: number
  } | null;
  isLoading: boolean;
  year: number;
  onSave: (data: PolicyRequest) => void;
  isSaving: boolean;
}

function PolicyTab({policy, isLoading, year, onSave, isSaving}: PolicyTabProps) {
  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: {
      maxSelectionsPerYear: policy?.maxSelectionsPerYear ?? 3,
      requiresApproval: policy?.requiresApproval ?? true,
      year,
      minDaysBeforeSelection: policy?.minDaysBeforeSelection ?? 7,
    },
  });

  if (isLoading) return <SkeletonForm fields={4}/>;

  const onSubmit = (values: PolicyFormValues) => {
    onSave({
      maxSelectionsPerYear: values.maxSelectionsPerYear,
      requiresApproval: values.requiresApproval,
      year: values.year,
      minDaysBeforeSelection: values.minDaysBeforeSelection,
    });
  };

  return (
    <div className="max-w-lg">
      <div className='rounded-xl border border-subtle bg-[var(--bg-card)] p-6'>
        <h3 className='text-xl font-semibold text-primary mb-6'>
          Restricted Holiday Policy ({year})
        </h3>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className='block text-sm font-medium text-secondary mb-1.5'>
              Max Selections Per Year
            </label>
            <input
              type="number"
              {...form.register('maxSelectionsPerYear', {valueAsNumber: true})}
              min={1}
              className='w-full rounded-lg border border-subtle px-4 py-2\n                text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:border-[var(--accent-primary)]'
            />
            {form.formState.errors.maxSelectionsPerYear && (
              <p className='text-xs text-status-danger-text mt-1'>
                {form.formState.errors.maxSelectionsPerYear.message}
              </p>
            )}
          </div>

          <div>
            <label className='block text-sm font-medium text-secondary mb-1.5'>
              Min Days Before Selection
            </label>
            <input
              type="number"
              {...form.register('minDaysBeforeSelection', {valueAsNumber: true})}
              min={0}
              className='w-full rounded-lg border border-subtle px-4 py-2\n                text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:border-[var(--accent-primary)]'
            />
          </div>

          <div className="flex items-center gap-4">
            <Controller
              name="requiresApproval"
              control={form.control}
              render={({field}) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    field.value ? "bg-accent" : "bg-card"
                  }`}
                  role="switch"
                  aria-checked={field.value}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-[var(--bg-card)] transition-transform ${
                      field.value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              )}
            />
            <span className='text-sm text-secondary'>
              Require manager approval
            </span>
          </div>

          <input type="hidden" {...form.register('year', {valueAsNumber: true})} />

          <button
            type="submit"
            disabled={isSaving}
            className='w-full px-4 py-2.5 text-sm font-medium bg-accent text-inverse rounded-lg\n              hover:bg-accent-hover disabled:opacity-50 transition-colors\n              focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2'
          >
            {isSaving ? 'Saving...' : 'Save Policy'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Holiday Form Modal
// ═══════════════════════════════════════════════════════════════

interface HolidayFormModalProps {
  holiday: RestrictedHoliday | null;
  onClose: () => void;
  onSubmit: (data: RestrictedHolidayRequest) => void;
  isSubmitting: boolean;
}

function HolidayFormModal({holiday, onClose, onSubmit, isSubmitting}: HolidayFormModalProps) {
  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      holidayName: holiday?.holidayName ?? '',
      holidayDate: holiday?.holidayDate ?? '',
      description: holiday?.description ?? '',
      category: (holiday?.category ?? 'RELIGIOUS') as HolidayCategory,
      applicableRegions: holiday?.applicableRegions ?? '',
      applicableDepartments: holiday?.applicableDepartments ?? '',
      isActive: holiday?.isActive ?? true,
    },
  });

  const handleSubmit = (values: HolidayFormValues) => {
    onSubmit({
      holidayName: values.holidayName,
      holidayDate: values.holidayDate,
      description: values.description || undefined,
      category: values.category as HolidayCategory | undefined,
      applicableRegions: values.applicableRegions || undefined,
      applicableDepartments: values.applicableDepartments || undefined,
      isActive: values.isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 cursor-pointer" onClick={onClose}/>
      <motion.div
        initial={{opacity: 0, scale: 0.95}}
        animate={{opacity: 1, scale: 1}}
        className='relative w-full max-w-lg rounded-lg bg-[var(--bg-elevated)]\n          shadow-[var(--shadow-dropdown)] border border-subtle p-6 mx-4'
      >
        <h3 className='text-xl font-semibold text-primary mb-6'>
          {holiday ? 'Edit Restricted Holiday' : 'Add Restricted Holiday'}
        </h3>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <label className='block text-sm font-medium text-secondary mb-1'>
              Holiday Name *
            </label>
            <input
              {...form.register('holidayName')}
              className='w-full rounded-lg border border-subtle px-4 py-2\n                text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:border-[var(--accent-primary)]'
              placeholder="e.g., Pongal"
            />
            {form.formState.errors.holidayName && (
              <p className='text-xs text-status-danger-text mt-1'>{form.formState.errors.holidayName.message}</p>
            )}
          </div>

          <div>
            <label className='block text-sm font-medium text-secondary mb-1'>
              Date *
            </label>
            <input
              type="date"
              {...form.register('holidayDate')}
              className='w-full rounded-lg border border-subtle px-4 py-2\n                text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:border-[var(--accent-primary)]'
            />
            {form.formState.errors.holidayDate && (
              <p className='text-xs text-status-danger-text mt-1'>{form.formState.errors.holidayDate.message}</p>
            )}
          </div>

          <div>
            <label className='block text-sm font-medium text-secondary mb-1'>
              Description
            </label>
            <textarea
              {...form.register('description')}
              rows={2}
              className='w-full rounded-lg border border-subtle px-4 py-2\n                text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:border-[var(--accent-primary)] resize-none'
              placeholder="Brief description of this holiday"
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-secondary mb-1'>
              Category
            </label>
            <select
              {...form.register('category')}
              className='w-full rounded-lg border border-subtle px-4 py-2\n                text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:border-[var(--accent-primary)]'
            >
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-secondary mb-1'>
              Applicable Regions (JSON)
            </label>
            <input
              {...form.register('applicableRegions')}
              className='w-full rounded-lg border border-subtle px-4 py-2\n                text-sm focus:outline-none focus:ring-2 focus:ring-accent-700 focus:border-[var(--accent-primary)]'
              placeholder='["IN-TN","IN-KA"] or leave blank for all'
            />
          </div>

          <div className="flex items-center gap-4">
            <Controller
              name="isActive"
              control={form.control}
              render={({field}) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    field.value ? "bg-accent" : "bg-card"
                  }`}
                  role="switch"
                  aria-checked={field.value}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-[var(--bg-card)] transition-transform ${
                      field.value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              )}
            />
            <span className='text-sm text-secondary'>Active</span>
          </div>

          <div className='flex justify-end gap-4 pt-4 border-t border-subtle'>
            <button
              type="button"
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-secondary\n                bg-[var(--bg-card)] border border-subtle\n                rounded-lg hover:bg-base transition-colors\n                focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2'
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className='px-4 py-2 text-sm font-medium bg-accent text-inverse rounded-lg\n                hover:bg-accent-hover disabled:opacity-50 transition-colors\n                focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2'
            >
              {isSubmitting ? 'Saving...' : holiday ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
