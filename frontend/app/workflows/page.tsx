'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import {
  useWorkflowDefinitions,
  useDeactivateWorkflowDefinition,
} from '@/lib/hooks/queries/useWorkflows';
import type { WorkflowDefinitionResponse, WorkflowEntityType } from '@/lib/types/workflow';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  GitBranch,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Power,
  Copy,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Shield,
} from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';

// ── Entity Type Labels & Colors ──────────────────────────────────────────────

const ENTITY_TYPE_CONFIG: Record<
  WorkflowEntityType,
  { label: string; bg: string; text: string }
> = {
  LEAVE_REQUEST: { label: 'Leave', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  EXPENSE_CLAIM: { label: 'Expense', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  TRAVEL_REQUEST: { label: 'Travel', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  LOAN_REQUEST: { label: 'Loan', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  ASSET_REQUEST: { label: 'Asset', bg: 'bg-slate-100 dark:bg-slate-800/30', text: 'text-slate-700 dark:text-slate-300' },
  TIMESHEET: { label: 'Timesheet', bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300' },
  RESIGNATION: { label: 'Resignation', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  SALARY_REVISION: { label: 'Salary Revision', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300' },
  PROMOTION: { label: 'Promotion', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  TRANSFER: { label: 'Transfer', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
  ONBOARDING: { label: 'Onboarding', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300' },
  OFFBOARDING: { label: 'Offboarding', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' },
  DOCUMENT_REQUEST: { label: 'Document', bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300' },
  POLICY_ACKNOWLEDGMENT: { label: 'Policy', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  TRAINING_REQUEST: { label: 'Training', bg: 'bg-lime-100 dark:bg-lime-900/30', text: 'text-lime-700 dark:text-lime-300' },
  REIMBURSEMENT: { label: 'Reimbursement', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  OVERTIME: { label: 'Overtime', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', text: 'text-fuchsia-700 dark:text-fuchsia-300' },
  SHIFT_CHANGE: { label: 'Shift Change', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300' },
  WORK_FROM_HOME: { label: 'WFH', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300' },
  RECRUITMENT_OFFER: { label: 'Recruitment', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300' },
  CUSTOM: { label: 'Custom', bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-700 dark:text-gray-300' },
};

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const PAGE_SIZE = 20;

export default function WorkflowListPage() {
  const router = useRouter();
  const { hasPermission, isReady } = usePermissions();
  const canManage = isReady && hasPermission(Permissions.WORKFLOW_MANAGE);
  const canView = isReady && (hasPermission(Permissions.WORKFLOW_VIEW) || canManage);

  // Filters
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [entityTypeFilter, setEntityTypeFilter] = useState<WorkflowEntityType | 'ALL'>('ALL');
  const [page, setPage] = useState(0);

  // Context menu
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<WorkflowDefinitionResponse | null>(null);
  const deactivateMutation = useDeactivateWorkflowDefinition();

  const { data: workflowPage, isLoading } = useWorkflowDefinitions({ page, size: PAGE_SIZE });

  // Client-side filtering (status + entity type + search) on top of the paginated response
  const filteredItems = useMemo(() => {
    const items = workflowPage?.content ?? [];
    return items.filter((wf) => {
      // Status filter
      if (statusFilter === 'ACTIVE' && !wf.isActive) return false;
      if (statusFilter === 'INACTIVE' && wf.isActive) return false;

      // Entity type filter
      if (entityTypeFilter !== 'ALL' && wf.entityType !== entityTypeFilter) return false;

      // Search
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const nameMatch = wf.name.toLowerCase().includes(q);
        const descMatch = wf.description?.toLowerCase().includes(q) ?? false;
        if (!nameMatch && !descMatch) return false;
      }

      return true;
    });
  }, [workflowPage, statusFilter, entityTypeFilter, debouncedSearch]);

  const totalPages = workflowPage?.totalPages ?? 0;
  const totalElements = workflowPage?.totalElements ?? 0;

  const handleDeactivate = useCallback(async () => {
    if (!deleteTarget) return;
    await deactivateMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
    setMenuOpenId(null);
  }, [deleteTarget, deactivateMutation]);

  if (!canView) {
    return (
      <AppLayout activeMenuItem="workflows">
        <div className="flex h-full items-center justify-center p-8">
          <EmptyState
            title="Access denied"
            description="You do not have permission to view workflow definitions."
            icon={<XCircle className="h-12 w-12 text-red-500" />}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="workflows">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="space-y-6 p-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Workflow Builder
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Create and manage approval workflow definitions.
            </p>
          </div>
          {canManage && (
            <Button
              variant="primary"
              onClick={() => router.push('/workflows/new')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Workflow
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4 dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)]/40 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {/* Status toggle */}
            <div className="inline-flex rounded-full bg-[var(--bg-secondary)] p-1 text-xs dark:bg-[var(--bg-secondary)]">
              {(['ALL', 'ACTIVE', 'INACTIVE'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatusFilter(s); setPage(0); }}
                  className={`rounded-full px-3 py-1 font-medium transition-colors ${
                    statusFilter === s
                      ? 'bg-sky-700 text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] dark:text-[var(--text-muted)]'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s === 'ACTIVE' ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>

            {/* Entity type filter */}
            <select
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value as WorkflowEntityType | 'ALL');
                setPage(0);
              }}
              className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">All types</option>
              {Object.entries(ENTITY_TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="input-aura w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] shadow-sm placeholder:text-[var(--text-muted)] focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="No workflows found"
            description={
              search || statusFilter !== 'ALL' || entityTypeFilter !== 'ALL'
                ? 'Try adjusting your filters.'
                : 'Create your first approval workflow to get started.'
            }
            icon={<GitBranch className="h-12 w-12" />}
          />
        ) : (
          <>
            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-main)] bg-[var(--bg-secondary)]/50">
                    <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">Name</th>
                    <th className="hidden px-4 py-3 font-medium text-[var(--text-secondary)] sm:table-cell">Type</th>
                    <th className="hidden px-4 py-3 font-medium text-[var(--text-secondary)] md:table-cell">Workflow Type</th>
                    <th className="px-4 py-3 font-medium text-[var(--text-secondary)]">Status</th>
                    <th className="hidden px-4 py-3 font-medium text-[var(--text-secondary)] lg:table-cell">Steps</th>
                    <th className="hidden px-4 py-3 font-medium text-[var(--text-secondary)] lg:table-cell">Created</th>
                    <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-main)]">
                  {filteredItems.map((wf) => {
                    const typeConfig = ENTITY_TYPE_CONFIG[wf.entityType] ?? ENTITY_TYPE_CONFIG.CUSTOM;
                    return (
                      <tr
                        key={wf.id}
                        className="cursor-pointer transition-colors hover:bg-[var(--bg-secondary)]/30"
                        onClick={() => router.push(`/workflows/${wf.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">{wf.name}</p>
                            {wf.description && (
                              <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate max-w-[250px]">
                                {wf.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${typeConfig.bg} ${typeConfig.text}`}>
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <span className="text-xs text-[var(--text-secondary)] capitalize">
                            {wf.workflowType.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              wf.isActive
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${wf.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {wf.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {wf.isDefault && (
                            <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                              <Shield className="h-3 w-3" />
                              Default
                            </span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          <span className="text-sm text-[var(--text-secondary)]">
                            {wf.totalSteps} {wf.totalSteps === 1 ? 'step' : 'steps'}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          <span className="text-xs text-[var(--text-muted)]">
                            {wf.createdAt ? format(new Date(wf.createdAt), 'MMM d, yyyy') : '--'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(menuOpenId === wf.id ? null : wf.id);
                              }}
                              className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {menuOpenId === wf.id && (
                              <div
                                className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] py-1 shadow-lg"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                                  onClick={() => {
                                    router.push(`/workflows/${wf.id}`);
                                    setMenuOpenId(null);
                                  }}
                                >
                                  <Eye className="h-4 w-4" /> View
                                </button>
                                {canManage && (
                                  <>
                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                                      onClick={() => {
                                        router.push(`/workflows/${wf.id}?edit=true`);
                                        setMenuOpenId(null);
                                      }}
                                    >
                                      <Edit className="h-4 w-4" /> Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                      onClick={() => {
                                        setDeleteTarget(wf);
                                        setMenuOpenId(null);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" /> Deactivate
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--border-main)] pt-4 dark:border-[var(--border-main)]">
                <p className="text-sm text-[var(--text-muted)]">
                  Showing {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Click outside to close menu */}
      {menuOpenId && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
      )}

      {/* Deactivate Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="md">
        <ModalHeader onClose={() => setDeleteTarget(null)}>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Power className="h-5 w-5" />
            Deactivate Workflow
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-[var(--text-secondary)]">
            Are you sure you want to deactivate the workflow{' '}
            <strong>{deleteTarget?.name}</strong>? Existing approval instances
            using this workflow will continue, but no new instances can be started.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deactivateMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={handleDeactivate}
            disabled={deactivateMutation.isPending}
          >
            {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
          </Button>
        </ModalFooter>
      </Modal>
    </AppLayout>
  );
}
