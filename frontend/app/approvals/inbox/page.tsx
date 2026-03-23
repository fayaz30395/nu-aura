'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmployeeSearchAutocomplete } from '@/components/ui/EmployeeSearchAutocomplete';
import {
  useApprovalInbox,
  useApprovalInboxCount,
  useApproveExecution,
  useRejectExecution,
  useCreateDelegation,
  useMyDelegations,
} from '@/lib/hooks/queries/useApprovals';
import type { ApprovalInboxItem, InboxFilterParams } from '@/lib/hooks/queries/useApprovals';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useWebSocket, Notification } from '@/lib/contexts/WebSocketContext';
import { createLogger } from '@/lib/utils/logger';
import { useQueryClient } from '@tanstack/react-query';
import { notifications as mNotifications } from '@mantine/notifications';
import { format } from 'date-fns';

const log = createLogger('ApprovalInbox');
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  RefreshCw,
  Search,
  XCircle,
  Zap,
} from 'lucide-react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';

// ── Delegation Form Schema ─────────────────────────────────────────
const delegationFormSchema = z.object({
  delegateId: z.string().min(1, 'Delegate is required'),
  delegateName: z.string(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().optional(),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

type DelegationFormData = z.infer<typeof delegationFormSchema>;

// ── Module tab configuration with colors ──────────────────────────────
interface ModuleTab {
  key: string;
  label: string;
  entityType?: string; // maps to WorkflowEntityType for API filter
  color: string; // Tailwind bg class for the badge
  textColor: string; // Tailwind text class for the badge
}

const MODULE_TABS: ModuleTab[] = [
  { key: 'ALL', label: 'All', color: 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]', textColor: 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)]200' },
  { key: 'LEAVE', label: 'Leave', entityType: 'LEAVE_REQUEST', color: 'bg-blue-100 dark:bg-blue-900/40', textColor: 'text-blue-700 dark:text-blue-300' },
  { key: 'EXPENSE', label: 'Expense', entityType: 'EXPENSE_CLAIM', color: 'bg-orange-100 dark:bg-orange-900/40', textColor: 'text-orange-700 dark:text-orange-300' },
  { key: 'ASSET', label: 'Asset', entityType: 'ASSET_REQUEST', color: 'bg-[var(--bg-surface)]', textColor: 'text-[var(--text-secondary)]' },
  { key: 'TRAVEL', label: 'Travel', entityType: 'TRAVEL_REQUEST', color: 'bg-emerald-100 dark:bg-emerald-900/40', textColor: 'text-emerald-700 dark:text-emerald-300' },
  { key: 'RECRUITMENT', label: 'Recruitment', entityType: 'RECRUITMENT_OFFER', color: 'bg-violet-100 dark:bg-violet-900/40', textColor: 'text-violet-700 dark:text-violet-300' },
  { key: 'OTHERS', label: 'Others', color: 'bg-purple-100 dark:bg-purple-900/40', textColor: 'text-purple-700 dark:text-purple-300' },
];

// Color lookup for module badges in the list
const MODULE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  Leave: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  Expense: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  Asset: { bg: 'bg-[var(--bg-surface)]', text: 'text-[var(--text-secondary)]' },
  Travel: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  Recruitment: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300' },
};

const DEFAULT_BADGE = { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' };

function getModuleBadgeColors(module: string) {
  return MODULE_BADGE_COLORS[module] ?? DEFAULT_BADGE;
}

function getInitials(name: string | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

type StatusFilter = 'PENDING' | 'ALL';

const PAGE_SIZE = 20;

export default function ApprovalInboxPage() {
  const { hasPermission, isReady } = usePermissions();
  const { onApprovalTaskAssigned, offApprovalTaskAssigned } = useWebSocket();
  const queryClient = useQueryClient();

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(0);

  // Delegation modal
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const createDelegationMutation = useCreateDelegation();
  const { data: myDelegations } = useMyDelegations();
  const activeDelegationsCount = myDelegations?.filter(d => d.isActive).length ?? 0;

  const delegationForm = useForm<DelegationFormData>({
    resolver: zodResolver(delegationFormSchema),
    defaultValues: {
      delegateId: '',
      delegateName: '',
      startDate: '',
      endDate: '',
      reason: '',
    },
  });

  const handleCreateDelegation = useCallback(async (data: DelegationFormData) => {
    try {
      await createDelegationMutation.mutateAsync({
        delegateId: data.delegateId,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason || undefined,
      });
      setShowDelegationModal(false);
      delegationForm.reset();
    } catch (error) {
      log.error('Error creating delegation:', error);
    }
  }, [createDelegationMutation, delegationForm]);

  // Derive the API module param from the active tab
  const moduleParam = useMemo(() => {
    const tab = MODULE_TABS.find((t) => t.key === activeTab);
    return tab?.entityType ?? undefined;
  }, [activeTab]);

  // Build filter params for the paginated inbox query
  const filterParams: InboxFilterParams = useMemo(
    () => ({
      status: statusFilter,
      module: moduleParam,
      search: debouncedSearch || undefined,
      page,
      size: PAGE_SIZE,
    }),
    [statusFilter, moduleParam, debouncedSearch, page]
  );

  const { data: inboxPage, isLoading, refetch } = useApprovalInbox(filterParams);
  const { data: counts } = useApprovalInboxCount();

  const items = inboxPage?.content ?? [];
  const totalPages = inboxPage?.totalPages ?? 0;
  const totalElements = inboxPage?.totalElements ?? 0;

  // Detail panel
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [comments, setComments] = useState('');

  const approveMutation = useApproveExecution();
  const rejectMutation = useRejectExecution();

  const canViewInbox =
    isReady &&
    (hasPermission(Permissions.WORKFLOW_VIEW) ||
      hasPermission(Permissions.WORKFLOW_EXECUTE));

  // Listen for new approval task assignments via WebSocket
  useEffect(() => {
    if (!onApprovalTaskAssigned) return;

    const handleApprovalNotification = (notification: Notification) => {
      // Show toast notification
      mNotifications.show({
        title: notification.title,
        message: notification.message,
        color: 'blue',
        icon: <Zap className="h-4 w-4" />,
        autoClose: 5000,
        onClick: () => {
          // Navigate to the notification's action URL if available
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
        },
      });

      // Invalidate approval inbox queries to refresh the data
      queryClient.invalidateQueries({
        queryKey: ['approvalInbox'],
      });

      // Invalidate approval counts to update the summary
      queryClient.invalidateQueries({
        queryKey: ['approvalInboxCount'],
      });

      log.debug('Refreshing approval inbox due to new task assignment');
    };

    onApprovalTaskAssigned(handleApprovalNotification);

    return () => {
      if (offApprovalTaskAssigned) {
        offApprovalTaskAssigned(handleApprovalNotification);
      }
    };
  }, [onApprovalTaskAssigned, offApprovalTaskAssigned, queryClient]);

  const handleApprove = useCallback(async () => {
    if (!selectedItem) return;
    await approveMutation.mutateAsync({ executionId: selectedItem.id, comments: comments || undefined });
    setComments('');
    setShowApproveModal(false);
    setSelectedId(null);
  }, [selectedItem, comments, approveMutation]);

  const handleReject = useCallback(async () => {
    if (!selectedItem || !comments.trim()) return;
    await rejectMutation.mutateAsync({ executionId: selectedItem.id, comments });
    setComments('');
    setShowRejectModal(false);
    setSelectedId(null);
  }, [selectedItem, comments, rejectMutation]);

  // Reset page when filters change
  const handleTabChange = useCallback((tabKey: string) => {
    setActiveTab(tabKey);
    setPage(0);
    setSelectedId(null);
  }, []);

  const handleStatusChange = useCallback((s: StatusFilter) => {
    setStatusFilter(s);
    setPage(0);
    setSelectedId(null);
  }, []);

  if (!canViewInbox) {
    return (
      <AppLayout activeMenuItem="approvals">
        <div className="flex h-full items-center justify-center p-8">
          <EmptyState
            title="Access denied"
            description="You do not have permission to view the approval inbox."
            icon={<XCircle className="h-12 w-12 text-red-500" />}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="approvals">
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
              Approval Inbox
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              View and act on all pending approval requests.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeDelegationsCount > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                <Zap className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                  {activeDelegationsCount} active {activeDelegationsCount === 1 ? 'delegation' : 'delegations'}
                </span>
              </div>
            )}
            <Button variant="outline" onClick={() => setShowDelegationModal(true)}>
              Delegate
            </Button>
            <Button variant="ghost" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Summary Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Pending"
            value={counts?.pending ?? 0}
            color="bg-amber-50 dark:bg-amber-900/20"
            textColor="text-amber-700 dark:text-amber-300"
            icon={<Clock className="h-5 w-5" />}
          />
          <SummaryCard
            label="Approved Today"
            value={counts?.approvedToday ?? 0}
            color="bg-green-50 dark:bg-green-900/20"
            textColor="text-green-700 dark:text-green-300"
            icon={<CheckCircle className="h-5 w-5" />}
          />
          <SummaryCard
            label="Rejected Today"
            value={counts?.rejectedToday ?? 0}
            color="bg-red-50 dark:bg-red-900/20"
            textColor="text-red-700 dark:text-red-300"
            icon={<XCircle className="h-5 w-5" />}
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-secondary)] p-4 dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)]900/40 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {/* Status toggle */}
            <div className="inline-flex rounded-full bg-[var(--bg-secondary)] p-1 text-xs dark:bg-[var(--bg-secondary)]">
              <button
                type="button"
                onClick={() => handleStatusChange('PENDING')}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  statusFilter === 'PENDING'
                    ? 'bg-primary-600 text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:text-[var(--text-muted)]'
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('ALL')}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-primary-600 text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:text-[var(--text-muted)]'
                }`}
              >
                All
              </button>
            </div>

            {/* Module tabs */}
            <div className="flex flex-wrap gap-1.5">
              {MODULE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    activeTab === tab.key
                      ? `${tab.color} ${tab.textColor} ring-2 ring-primary-400/50`
                      : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] dark:text-[var(--text-muted)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by title, requester…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="input-aura w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] shadow-sm placeholder:text-[var(--text-muted)] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="You're all caught up"
            description={
              statusFilter === 'PENDING'
                ? 'No pending approvals at the moment.'
                : 'No approvals match your current filters.'
            }
            icon={<Inbox className="h-12 w-12" />}
          />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              {/* List */}
              <div className="space-y-4">
                {items.map((item) => (
                  <InboxListItem
                    key={item.id}
                    item={item}
                    isSelected={selectedId === item.id}
                    onClick={() => setSelectedId(item.id)}
                  />
                ))}
              </div>

              {/* Details */}
              {selectedItem ? (
                <Card className="h-fit sticky top-6">
                  <CardHeader>
                    <CardTitle>Task Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <DetailRow label="Module" value={selectedItem.module} />
                    <DetailRow label="Title" value={selectedItem.title} />
                    <div className="grid grid-cols-2 gap-4">
                      <DetailRow label="Requester" value={selectedItem.requesterName ?? 'Unknown'} />
                      <DetailRow label="Current Step" value={selectedItem.currentStepName ?? 'Pending'} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailRow
                        label="Created"
                        value={selectedItem.submittedAt ? format(new Date(selectedItem.submittedAt), 'MMM d, yyyy HH:mm') : '—'}
                      />
                      <DetailRow
                        label="Due"
                        value={selectedItem.deadline ? format(new Date(selectedItem.deadline), 'MMM d, yyyy HH:mm') : '—'}
                      />
                    </div>
                    {selectedItem.referenceNumber && (
                      <DetailRow label="Reference" value={`#${selectedItem.referenceNumber}`} />
                    )}

                    {selectedItem.status === 'PENDING' && (
                      <div className="mt-4 flex gap-4">
                        <Button
                          variant="outline"
                          className="flex-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                          onClick={() => {
                            setComments('');
                            setShowRejectModal(true);
                          }}
                          disabled={rejectMutation.isPending || approveMutation.isPending}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          variant="primary"
                          className="flex-1"
                          onClick={() => {
                            setComments('');
                            setShowApproveModal(true);
                          }}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-[var(--border-main)] p-8 text-sm text-[var(--text-muted)] dark:border-[var(--border-main)] dark:text-[var(--text-muted)]">
                  Select a task from the left to view details.
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--border-main)] pt-4 dark:border-[var(--border-main)]">
                <p className="text-sm text-[var(--text-muted)]">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} of{' '}
                  {totalElements}
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

      {/* Approve modal */}
      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} size="md">
        <ModalHeader onClose={() => setShowApproveModal(false)}>
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            Approve request
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-[var(--text-secondary)]">
            Are you sure you want to approve this request from{' '}
            <strong>{selectedItem?.requesterName ?? 'Unknown'}</strong>?
          </p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              Comment (optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add an optional comment…"
              className="mt-1 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={3}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setShowApproveModal(false)}
            disabled={approveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleApprove}
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? 'Approving…' : 'Approve'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Reject modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} size="md">
        <ModalHeader onClose={() => setShowRejectModal(false)}>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <XCircle className="h-5 w-5" />
            Reject request
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-[var(--text-secondary)]">
            Please provide a reason for rejecting this request from{' '}
            <strong>{selectedItem?.requesterName ?? 'Unknown'}</strong>.
          </p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Explain why this request is being rejected…"
              className="mt-1 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={3}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setShowRejectModal(false)}
            disabled={rejectMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={handleReject}
            disabled={rejectMutation.isPending || !comments.trim()}
          >
            {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delegation modal */}
      <Modal isOpen={showDelegationModal} onClose={() => setShowDelegationModal(false)} size="md">
        <ModalHeader onClose={() => setShowDelegationModal(false)}>
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
            <Zap className="h-5 w-5" />
            Delegate approvals
          </div>
        </ModalHeader>
        <ModalBody>
          <form
            onSubmit={delegationForm.handleSubmit(handleCreateDelegation)}
            className="space-y-4"
          >
            {/* Delegate field */}
            <div>
              <EmployeeSearchAutocomplete
                value={delegationForm.watch('delegateId') ? { id: delegationForm.watch('delegateId'), name: delegationForm.watch('delegateName') } : null}
                onChange={(employee) => {
                  if (employee) {
                    delegationForm.setValue('delegateId', employee.id);
                    delegationForm.setValue('delegateName', employee.name);
                    delegationForm.clearErrors('delegateId');
                  }
                }}
                label="Delegate to"
                placeholder="Search for an employee…"
                required
              />
              {delegationForm.formState.errors.delegateId && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                  {delegationForm.formState.errors.delegateId.message}
                </p>
              )}
            </div>

            {/* Start date */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Start date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...delegationForm.register('startDate')}
                className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {delegationForm.formState.errors.startDate && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                  {delegationForm.formState.errors.startDate.message}
                </p>
              )}
            </div>

            {/* End date */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                End date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...delegationForm.register('endDate')}
                className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {delegationForm.formState.errors.endDate && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                  {delegationForm.formState.errors.endDate.message}
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Reason (optional)
              </label>
              <textarea
                {...delegationForm.register('reason')}
                placeholder="Explain why you're delegating approvals…"
                className="w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows={3}
              />
            </div>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setShowDelegationModal(false);
              delegationForm.reset();
            }}
            disabled={createDelegationMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={delegationForm.handleSubmit(handleCreateDelegation)}
            disabled={createDelegationMutation.isPending}
          >
            {createDelegationMutation.isPending ? 'Creating delegation…' : 'Delegate'}
          </Button>
        </ModalFooter>
      </Modal>
    </AppLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  color,
  textColor,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  textColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-4 rounded-xl p-4 skeuo-card ${color}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${textColor} bg-[var(--bg-surface)]`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        <p className={`text-xs font-medium ${textColor}`}>{label}</p>
      </div>
    </div>
  );
}

function InboxListItem({
  item,
  isSelected,
  onClick,
}: {
  item: ApprovalInboxItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const badgeColors = getModuleBadgeColors(item.module);

  return (
    <Card
      className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary-500' : ''}`}
      onClick={onClick}
    >
      <CardContent className="flex items-start gap-4 p-4">
        {/* Avatar */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
          {getInitials(item.requesterName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColors.bg} ${badgeColors.text}`}>
              {item.module}
            </span>
            {item.referenceNumber && (
              <span className="text-xs font-mono text-[var(--text-muted)]">#{item.referenceNumber}</span>
            )}
          </div>
          <h3 className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
            {item.title}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {item.requesterName ?? 'Unknown'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 text-xs flex-shrink-0">
          {item.deadline && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Clock className="h-3 w-3" />
              {format(new Date(item.deadline), 'MMM d')}
            </span>
          )}
          <span className="text-xs text-[var(--text-muted)]">
            {item.submittedAt ? format(new Date(item.submittedAt), 'MMM d, HH:mm') : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
