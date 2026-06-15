'use client';

import React, {useCallback, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {AppLayout} from '@/components/layout';
import {Button} from '@/components/ui/Button';
import {Skeleton} from '@/components/ui/Skeleton';
import {EmptyState} from '@/components/ui/EmptyState';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useDeactivateWorkflowDefinition, useWorkflowDefinitions,} from '@/lib/hooks/queries/useWorkflows';
import type {WorkflowDefinitionResponse, WorkflowEntityType} from '@/lib/types/core/workflow';
import {format} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  GitBranch,
  MoreVertical,
  Plus,
  Power,
  Search,
  Shield,
  Trash2,
  XCircle,
} from 'lucide-react';
import {useDebounce} from '@/lib/hooks/useDebounce';
import {PageTransition, Reveal, Stagger} from '@/components/motion';

// ── Entity Type Labels & Colors ──────────────────────────────────────────────

const ENTITY_TYPE_CONFIG: Record<
  WorkflowEntityType,
  { label: string; bg: string; text: string }
> = {
  LEAVE_REQUEST: {
    label: 'Leave',
    bg: 'bg-[var(--accent-soft)]',
    text: 'text-[var(--accent-text)]'
  },
  EXPENSE_CLAIM: {
    label: 'Expense',
    bg: 'bg-[var(--warn-bg)]',
    text: 'text-[var(--warn-fg)]'
  },
  TRAVEL_REQUEST: {
    label: 'Travel',
    bg: 'bg-[var(--ok-bg)]',
    text: 'text-[var(--ok-fg)]'
  },
  LOAN_REQUEST: {
    label: 'Loan',
    bg: 'bg-[var(--warn-bg)]',
    text: 'text-[var(--warn-fg)]'
  },
  ASSET_REQUEST: {
    label: 'Asset',
    bg: 'bg-[var(--surface-hover)]',
    text: 'text-[var(--text-2)]'
  },
  TIMESHEET: {
    label: 'Timesheet',
    bg: 'bg-[var(--accent-soft)]',
    text: 'text-[var(--accent-text)]'
  },
  RESIGNATION: {
    label: 'Resignation',
    bg: 'bg-[var(--err-bg)]',
    text: 'text-[var(--err-fg)]'
  },
  SALARY_REVISION: {
    label: 'Salary Revision',
    bg: 'bg-[var(--accent-soft)]',
    text: 'text-[var(--accent-text)]'
  },
  PROMOTION: {
    label: 'Promotion',
    bg: 'bg-[var(--ok-bg)]',
    text: 'text-[var(--ok-fg)]'
  },
  TRANSFER: {
    label: 'Transfer',
    bg: 'bg-[var(--accent-soft)]',
    text: 'text-[var(--accent-text)]'
  },
  ONBOARDING: {
    label: 'Onboarding',
    bg: 'bg-[var(--ok-bg)]',
    text: 'text-[var(--ok-fg)]'
  },
  OFFBOARDING: {
    label: 'Offboarding',
    bg: 'bg-[var(--err-bg)]',
    text: 'text-[var(--err-fg)]'
  },
  DOCUMENT_REQUEST: {
    label: 'Document',
    bg: 'bg-[var(--accent-soft)]',
    text: 'text-[var(--accent-text)]'
  },
  POLICY_ACKNOWLEDGMENT: {
    label: 'Policy',
    bg: 'bg-accent-300 dark:bg-accent-900/30',
    text: 'text-accent-900 dark:text-accent-500'
  },
  TRAINING_REQUEST: {
    label: 'Training',
    bg: 'bg-success-100 dark:bg-success-900/30',
    text: 'text-success-700 dark:text-success-300'
  },
  REIMBURSEMENT: {
    label: 'Reimbursement',
    bg: 'bg-warning-100 dark:bg-warning-900/30',
    text: 'text-warning-700 dark:text-warning-300'
  },
  OVERTIME: {
    label: 'Overtime',
    bg: 'bg-[var(--status-neutral-bg)]',
    text: 'text-[var(--status-neutral-text)]'
  },
  SHIFT_CHANGE: {
    label: 'Shift Change',
    bg: 'bg-accent-300 dark:bg-accent-900/30',
    text: 'text-accent-900 dark:text-accent-500'
  },
  WORK_FROM_HOME: {
    label: 'WFH',
    bg: 'bg-success-100 dark:bg-success-900/30',
    text: 'text-success-700 dark:text-success-300'
  },
  RECRUITMENT_OFFER: {
    label: 'Recruitment',
    bg: 'bg-accent-100 dark:bg-accent-900/30',
    text: 'text-accent-700 dark:text-accent-300'
  },
  CUSTOM: {
    label: 'Custom',
    bg: 'bg-surface-100 dark:bg-surface-800/30',
    text: 'text-surface-700 dark:text-surface-300'
  },
};

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const PAGE_SIZE = 20;

export default function WorkflowListPage() {
  const router = useRouter();
  const {hasPermission, isAdmin, isReady} = usePermissions();
  const canManage = isReady && (isAdmin || hasPermission(Permissions.WORKFLOW_MANAGE));
  const canView = isReady && (isAdmin || hasPermission(Permissions.WORKFLOW_VIEW) || canManage);

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

  const {data: workflowPage, isLoading} = useWorkflowDefinitions({page, size: PAGE_SIZE});

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
        <PageTransition>
          <div className="flex h-full items-center justify-center p-8">
            <EmptyState
              title="Access denied"
              description="You do not have permission to view workflow definitions."
              icon={<XCircle className="h-12 w-12 text-[var(--err-fg)]"/>}
            />
          </div>
        </PageTransition>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="workflows">
      <PageTransition>
        <div className="space-y-6 p-4 sm:p-6">
          {/* Header */}
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-aura-title text-[var(--text-1)]">
                  Workflow Builder
                </h1>
                <p className="mt-1 text-[var(--text-2)]">
                  Create and manage approval workflow definitions.
                </p>
              </div>
              {canManage && (
                <Button
                  variant="primary"
                  onClick={() => router.push('/workflows/new')}
                  className="hover-lift focus-visible"
                >
                  <Plus className="mr-2 h-4 w-4"/>
                  Create Workflow
                </Button>
              )}
            </div>
          </Reveal>

        {/* Filters */}
        <Reveal>
          <div className="flex flex-col gap-4 rounded-[var(--r-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4 md:flex-row md:items-center md:gap-6">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status toggle */}
              <div className="inline-flex rounded-full bg-[var(--surface-hover)] p-1 text-xs">
                {(['ALL', 'ACTIVE', 'INACTIVE'] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setStatusFilter(s);
                      setPage(0);
                    }}
                    className={`rounded-full px-3 py-1.5 font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      statusFilter === s
                        ? 'bg-[var(--accent)] text-white shadow-[var(--sh-sm)]'
                        : 'text-[var(--text-2)] hover:bg-[var(--surface-2)]'
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
                className="rounded-[var(--r-control)] border border-[var(--border-soft)] bg-[var(--bg-app)] px-3 py-1.5 text-sm text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
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
            <div className="relative flex-1 md:w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--text-3)]"/>
              <input
                type="text"
                placeholder="Search workflows..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="w-full rounded-[var(--r-control)] border border-[var(--border-soft)] bg-[var(--bg-app)] py-2 pl-9 pr-4 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 transition-all"
              />
            </div>
          </div>
        </Reveal>

        {/* Content */}
        {isLoading ? (
          <Stagger>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <motion.div key={i}>
                  <Skeleton className="h-16 rounded-[var(--r-lg)]"/>
                </motion.div>
              ))}
            </div>
          </Stagger>
        ) : filteredItems.length === 0 ? (
          <Reveal>
            <EmptyState
              title="No workflows found"
              description={
                search || statusFilter !== 'ALL' || entityTypeFilter !== 'ALL'
                  ? 'Try adjusting your filters.'
                  : 'Create your first approval workflow to get started.'
              }
              icon={<GitBranch className="h-12 w-12"/>}
            />
          </Reveal>
        ) : (
          <Reveal>
            {/* Table */}
            <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--border-soft)] bg-[var(--surface)]">
              <table className="w-full text-left text-sm">
                <thead>
                <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-hover)]">
                  <th className="px-4 py-3 font-medium text-aura-micro text-[var(--text-2)]">Name</th>
                  <th className="hidden px-4 py-3 font-medium text-aura-micro text-[var(--text-2)] sm:table-cell">Type</th>
                  <th className="hidden px-4 py-3 font-medium text-aura-micro text-[var(--text-2)] md:table-cell">Workflow Type</th>
                  <th className="px-4 py-3 text-center font-medium text-aura-micro text-[var(--text-2)]">Status</th>
                  <th className="hidden px-4 py-3 text-right font-medium text-aura-micro text-[var(--text-2)] lg:table-cell">Steps</th>
                  <th className="hidden px-4 py-3 font-medium text-aura-micro text-[var(--text-2)] lg:table-cell">Created</th>
                  <th className="px-4 py-3 text-right font-medium text-aura-micro text-[var(--text-2)]">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredItems.map((wf) => {
                  const typeConfig = ENTITY_TYPE_CONFIG[wf.entityType] ?? ENTITY_TYPE_CONFIG.CUSTOM;
                  return (
                    <tr
                      key={wf.id}
                      className="h-14 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      onClick={() => router.push(`/workflows/${wf.id}`)}
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{wf.name}</p>
                          {wf.description && (
                            <p className="mt-0.5 text-caption truncate max-w-[250px]">
                              {wf.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-4 py-4 sm:table-cell">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${typeConfig.bg} ${typeConfig.text}`}>
                            {typeConfig.label}
                          </span>
                      </td>
                      <td className="hidden px-4 py-4 md:table-cell">
                          <span className="text-xs text-[var(--text-secondary)] capitalize">
                            {wf.workflowType.toLowerCase()}
                          </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold justify-center ${
                              wf.isActive
                                ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                                : 'bg-surface-100 text-surface-600 dark:bg-surface-800/30 dark:text-surface-400'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${wf.isActive ? 'bg-success-500' : 'bg-surface-400'}`}/>
                            {wf.isActive ? 'Active' : 'Inactive'}
                          </span>
                        {wf.isDefault && (
                          <span
                            className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                              <Shield className="h-3 w-3"/>
                              Default
                            </span>
                        )}
                      </td>
                      <td className="hidden px-4 py-4 text-right lg:table-cell">
                          <span className="text-body-secondary">
                            {wf.totalSteps} {wf.totalSteps === 1 ? 'step' : 'steps'}
                          </span>
                      </td>
                      <td className="hidden px-4 py-4 lg:table-cell">
                          <span className="text-caption">
                            {wf.createdAt ? format(new Date(wf.createdAt), 'MMM d, yyyy') : '--'}
                          </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(menuOpenId === wf.id ? null : wf.id);
                            }}
                            aria-label="Actions menu"
                            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                          >
                            <MoreVertical className="h-4 w-4"/>
                          </button>
                          {menuOpenId === wf.id && (
                            <div
                              role="menu"
                              className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] py-1 shadow-[var(--shadow-dropdown)]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                                onClick={() => {
                                  router.push(`/workflows/${wf.id}`);
                                  setMenuOpenId(null);
                                }}
                              >
                                <Eye className="h-4 w-4"/> View
                              </button>
                              {canManage && (
                                <>
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                                    onClick={() => {
                                      router.push(`/workflows/${wf.id}?edit=true`);
                                      setMenuOpenId(null);
                                    }}
                                  >
                                    <Edit className="h-4 w-4"/> Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                                    onClick={() => {
                                      setDeleteTarget(wf);
                                      setMenuOpenId(null);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4"/> Deactivate
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
              <div className="flex items-center justify-between border-t border-[var(--border-soft)] pt-4">
                <p className="text-sm text-[var(--text-3)]">
                  Showing <span className="num">{page * PAGE_SIZE + 1}</span>–<span className="num">{Math.min((page + 1) * PAGE_SIZE, totalElements)}</span> of <span className="num">{totalElements}</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="focus-visible"
                  >
                    <ChevronLeft className="h-4 w-4"/>
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="focus-visible"
                  >
                    Next
                    <ChevronRight className="h-4 w-4"/>
                  </Button>
                </div>
              </div>
            )}
          </Reveal>
        )}
      </div>
    </PageTransition>

      {/* Click outside to close menu */}
      {menuOpenId && (
        <div
          className="fixed inset-0 z-40 cursor-pointer"
          onClick={() => setMenuOpenId(null)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); setMenuOpenId(null); } }}
          role="button"
          tabIndex={0}
          aria-label="Close actions menu"
        />
      )}

      {/* Deactivate Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="md">
        <ModalHeader onClose={() => setDeleteTarget(null)}>
          <div className="flex items-center gap-2 text-[var(--err-fg)]">
            <Power className="h-5 w-5"/>
            Deactivate Workflow
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-[var(--text-2)]">
            Are you sure you want to deactivate the workflow{' '}
            <strong className="text-[var(--text-1)]">{deleteTarget?.name}</strong>? Existing approval instances
            using this workflow will continue, but no new instances can be started.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deactivateMutation.isPending} className="focus-visible">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDeactivate}
            disabled={deactivateMutation.isPending}
            className="bg-[var(--err-fg)] hover:bg-[var(--err-fg)]/90 focus-visible"
          >
            {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
          </Button>
        </ModalFooter>
      </Modal>
    </AppLayout>
  );
}
