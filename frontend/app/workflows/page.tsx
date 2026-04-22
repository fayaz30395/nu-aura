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

// ── Entity Type Labels & Colors ──────────────────────────────────────────────

const ENTITY_TYPE_CONFIG: Record<
  WorkflowEntityType,
  { label: string; bg: string; text: string }
> = {
  LEAVE_REQUEST: {
    label: 'Leave',
    bg: "bg-accent-subtle",
    text: "text-accent"
  },
  EXPENSE_CLAIM: {
    label: 'Expense',
    bg: "bg-status-warning-bg",
    text: "text-status-warning-text"
  },
  TRAVEL_REQUEST: {
    label: 'Travel',
    bg: "bg-status-success-bg",
    text: "text-status-success-text"
  },
  LOAN_REQUEST: {
    label: 'Loan',
    bg: "bg-status-warning-bg",
    text: "text-status-warning-text"
  },
  ASSET_REQUEST: {
    label: 'Asset',
    bg: "bg-surface",
    text: "text-secondary"
  },
  TIMESHEET: {
    label: 'Timesheet',
    bg: "bg-accent-subtle",
    text: "text-accent"
  },
  RESIGNATION: {
    label: 'Resignation',
    bg: "bg-status-danger-bg",
    text: "text-status-danger-text"
  },
  SALARY_REVISION: {
    label: 'Salary Revision',
    bg: "bg-accent-subtle",
    text: "text-accent"
  },
  PROMOTION: {
    label: 'Promotion',
    bg: "bg-status-success-bg",
    text: "text-status-success-text"
  },
  TRANSFER: {
    label: 'Transfer',
    bg: "bg-accent-subtle",
    text: "text-accent"
  },
  ONBOARDING: {
    label: 'Onboarding',
    bg: "bg-status-success-bg",
    text: "text-status-success-text"
  },
  OFFBOARDING: {
    label: 'Offboarding',
    bg: "bg-status-danger-bg",
    text: "text-status-danger-text"
  },
  DOCUMENT_REQUEST: {
    label: 'Document',
    bg: "bg-accent-subtle",
    text: "text-accent"
  },
  POLICY_ACKNOWLEDGMENT: {
    label: 'Policy',
    bg: "bg-accent-subtle",
    text: "text-accent"
  },
  TRAINING_REQUEST: {
    label: 'Training',
    bg: "bg-status-success-bg",
    text: "text-status-success-text"
  },
  REIMBURSEMENT: {
    label: 'Reimbursement',
    bg: "bg-status-warning-bg",
    text: "text-status-warning-text"
  },
  OVERTIME: {
    label: 'Overtime',
    bg: "bg-nu-purple-100",
    text: "text-nu-purple-700"
  },
  SHIFT_CHANGE: {
    label: 'Shift Change',
    bg: "bg-accent-subtle",
    text: "text-accent"
  },
  WORK_FROM_HOME: {
    label: 'WFH',
    bg: "bg-status-success-bg",
    text: "text-status-success-text"
  },
  RECRUITMENT_OFFER: {
    label: 'Recruitment',
    bg: "bg-accent-subtle",
    text: "text-accent"
  },
  CUSTOM: {
    label: 'Custom',
    bg: "bg-surface",
    text: "text-secondary"
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
        <div className="flex h-full items-center justify-center p-8">
          <EmptyState
            title="Access denied"
            description="You do not have permission to view workflow definitions."
            icon={<XCircle className='h-12 w-12 text-status-danger-text'/>}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="workflows">
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.25, ease: 'easeOut'}}
        className="space-y-6 p-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Workflow Builder
            </h1>
            <p className="mt-1 text-body-muted">
              Create and manage approval workflow definitions.
            </p>
          </div>
          {canManage && (
            <Button
              variant="primary"
              onClick={() => router.push('/workflows/new')}
            >
              <Plus className="mr-2 h-4 w-4"/>
              Create Workflow
            </Button>
          )}
        </div>

        {/* Filters */}
        <div
          className="flex flex-col gap-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4 dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)]/40 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {/* Status toggle */}
            <div
              className="inline-flex rounded-full bg-[var(--bg-secondary)] p-1 text-xs dark:bg-[var(--bg-secondary)]">
              {(['ALL', 'ACTIVE', 'INACTIVE'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(0);
                  }}
                  className={`rounded-full px-4 py-1 font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                    statusFilter === s
                      ? "bg-accent text-inverse"
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
              className='rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-accent-500'
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
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]"/>
            <input
              type="text"
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className='input-aura w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] shadow-[var(--shadow-card)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-accent-500'
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl"/>
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
            icon={<GitBranch className="h-12 w-12"/>}
          />
        ) : (
          <>
            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)]">
              <table className="w-full text-left text-sm">
                <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-secondary)]/50">
                  <th className="px-4 py-2 font-medium text-[var(--text-secondary)]">Name</th>
                  <th className="hidden px-4 py-2 font-medium text-[var(--text-secondary)] sm:table-cell">Type</th>
                  <th className="hidden px-4 py-2 font-medium text-[var(--text-secondary)] md:table-cell">Workflow
                    Type
                  </th>
                  <th className="px-4 py-2 text-center font-medium text-[var(--text-secondary)]">Status</th>
                  <th
                    className="hidden px-4 py-2 text-right font-medium text-[var(--text-secondary)] lg:table-cell">Steps
                  </th>
                  <th className="hidden px-4 py-2 font-medium text-[var(--text-secondary)] lg:table-cell">Created</th>
                  <th className="px-4 py-2 text-right font-medium text-[var(--text-secondary)]">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-main)]">
                {filteredItems.map((wf) => {
                  const typeConfig = ENTITY_TYPE_CONFIG[wf.entityType] ?? ENTITY_TYPE_CONFIG.CUSTOM;
                  return (
                    <tr
                      key={wf.id}
                      className="h-11 cursor-pointer transition-colors hover:bg-[var(--bg-secondary)]/30"
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
                                ? "bg-status-success-bg text-status-success-text"
                                : "bg-surface text-secondary"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${wf.isActive ? "bg-status-success-bg" : "bg-card"}`}/>
                            {wf.isActive ? 'Active' : 'Inactive'}
                          </span>
                        {wf.isDefault && (
                          <span
                            className='ml-1.5 inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-semibold text-accent'>
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
                                    className='flex w-full items-center gap-2 px-4 py-2 text-sm text-status-danger-text hover:bg-status-danger-bg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
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
              <div className="row-between border-t border-[var(--border-main)] pt-4 dark:border-[var(--border-main)]">
                <p className="text-body-muted">
                  Showing {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4"/>
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4"/>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
      {/* Click outside to close menu */}
      {menuOpenId && (
        <div className="fixed inset-0 z-40 cursor-pointer" onClick={() => setMenuOpenId(null)}/>
      )}
      {/* Deactivate Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="md">
        <ModalHeader onClose={() => setDeleteTarget(null)}>
          <div className='flex items-center gap-2 text-status-danger-text'>
            <Power className="h-5 w-5"/>
            Deactivate Workflow
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-body-secondary">
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
            className='bg-status-danger-bg hover:bg-status-danger-bg'
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
