'use client';

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {motion} from 'framer-motion';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {AppLayout} from '@/components/layout';
import {Card} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Tabs, type TabItem} from '@/components/ui/Tabs';
import {Segmented} from '@/components/ui/Segmented';

import {Skeleton} from '@/components/ui/Skeleton';
import {EmptyState} from '@/components/ui/EmptyState';
import {EmployeeSearchAutocomplete} from '@/components/ui/EmployeeSearchAutocomplete';
import type {ApprovalInboxItem, InboxFilterParams} from '@/lib/hooks/queries/useApprovals';
import {
  useApprovalInbox,
  useApprovalInboxCount,
  useApproveExecution,
  useCreateDelegation,
  useMyDelegations,
  useRejectExecution,
  useReturnForModification,
} from '@/lib/hooks/queries/useApprovals';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useDebounce} from '@/lib/hooks/useDebounce';
import {Notification, useWebSocket} from '@/lib/contexts/WebSocketContext';
import {createLogger} from '@/lib/utils/logger';
import {useQueryClient} from '@tanstack/react-query';
import {notifications as mNotifications} from '@mantine/notifications';
import {
  Check,
  CheckCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CornerUpRight,
  FileSignature,
  Inbox,
  Package,
  Palmtree,
  Plane,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  XCircle,
  Zap,
} from 'lucide-react';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {formatDateShort, formatDateTime, formatRelative} from '@/lib/utils/format/date';
import {RequesterAvatar} from './_components/RequesterAvatar';

const log = createLogger('ApprovalInbox');

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

// ── Module tab configuration ───────────────────────────────────────
interface ModuleTab {
  key: string;
  label: string;
  entityType?: string; // maps to WorkflowEntityType for API filter
}

const MODULE_TABS: ModuleTab[] = [
  {key: 'ALL', label: 'All'},
  {key: 'LEAVE', label: 'Leave', entityType: 'LEAVE_REQUEST'},
  {key: 'EXPENSE', label: 'Expense', entityType: 'EXPENSE_CLAIM'},
  {key: 'ASSET', label: 'Asset', entityType: 'ASSET_REQUEST'},
  {key: 'TRAVEL', label: 'Travel', entityType: 'TRAVEL_REQUEST'},
  {key: 'RECRUITMENT', label: 'Offers', entityType: 'RECRUITMENT_OFFER'},
  {key: 'OTHERS', label: 'Others'},
];

// Type-icon tile mapping (Aura spec: Leave→palmtree, Expense→receipt, Offer→file-signature, Asset→package)
const MODULE_ICON: Record<string, React.ComponentType<{className?: string}>> = {
  Leave: Palmtree,
  Expense: Receipt,
  Recruitment: FileSignature,
  Asset: Package,
  Travel: Plane,
};

function getModuleIcon(module: string): React.ComponentType<{className?: string}> {
  return MODULE_ICON[module] ?? Inbox;
}

type StatusFilter = 'PENDING' | 'ALL';

const PAGE_SIZE = 20;

export default function ApprovalInboxPage() {
  const {hasPermission, isAdmin, isReady} = usePermissions();
  const {onApprovalTaskAssigned, offApprovalTaskAssigned} = useWebSocket();
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
  const {data: myDelegations} = useMyDelegations();
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

  const {data: inboxPage, isLoading, refetch} = useApprovalInbox(filterParams);
  const {data: counts} = useApprovalInboxCount();

  const items = inboxPage?.content ?? [];
  const totalPages = inboxPage?.totalPages ?? 0;
  const totalElements = inboxPage?.totalElements ?? 0;

  // Detail panel
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [comments, setComments] = useState('');

  const approveMutation = useApproveExecution();
  const rejectMutation = useRejectExecution();
  const returnMutation = useReturnForModification();

  // Per-tab counts for the Aura tab strip (derived from the inbox summary).
  // The summary endpoint surfaces a single pending total; the "All" tab shows it,
  // and we only annotate module tabs when the active filter narrows to them.
  const pendingTotal = counts?.pending ?? totalElements;

  // SuperAdmin / TenantAdmin bypasses all permission checks (mirrors backend SecurityConfig).
  // hasPermission already checks isAdmin internally, but we keep the explicit isAdmin check
  // for clarity and to ensure the loading guard below never shows "Access denied" for admins.
  const canViewInbox =
    isAdmin ||
    hasPermission(Permissions.WORKFLOW_VIEW) ||
    hasPermission(Permissions.WORKFLOW_EXECUTE);

  // Listen for new approval task assignments via WebSocket
  useEffect(() => {
    if (!onApprovalTaskAssigned) return;

    const handleApprovalNotification = (notification: Notification) => {
      // Show toast notification
      mNotifications.show({
        title: notification.title,
        message: notification.message,
        color: 'blue',
        icon: <Zap className="h-4 w-4"/>,
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
    await approveMutation.mutateAsync({executionId: selectedItem.id, comments: comments || undefined});
    mNotifications.show({
      title: 'Request approved',
      message: `${selectedItem.module} · ${selectedItem.requesterName} has been notified.`,
      color: 'green',
      icon: <CheckCircle className="h-4 w-4"/>,
      autoClose: 5000,
    });
    setComments('');
    setShowApproveModal(false);
    setSelectedId(null);
  }, [selectedItem, comments, approveMutation]);

  const handleReject = useCallback(async () => {
    if (!selectedItem || !comments.trim()) return;
    await rejectMutation.mutateAsync({executionId: selectedItem.id, comments});
    mNotifications.show({
      title: 'Request declined',
      message: `${selectedItem.module} · ${selectedItem.requesterName} has been notified.`,
      color: 'red',
      icon: <XCircle className="h-4 w-4"/>,
      autoClose: 5000,
    });
    setComments('');
    setShowRejectModal(false);
    setSelectedId(null);
  }, [selectedItem, comments, rejectMutation]);

  const handleReturn = useCallback(async () => {
    if (!selectedItem || !comments.trim()) return;
    await returnMutation.mutateAsync({executionId: selectedItem.id, comments});
    mNotifications.show({
      title: 'Request returned',
      message: `${selectedItem.module} · ${selectedItem.requesterName} has been notified.`,
      color: 'yellow',
      icon: <RotateCcw className="h-4 w-4"/>,
      autoClose: 5000,
    });
    setComments('');
    setShowReturnModal(false);
    setSelectedId(null);
  }, [selectedItem, comments, returnMutation]);

  const handleApproveAllLeave = useCallback(async () => {
    const leaveRequests = items.filter((item) => item.module === 'Leave');
    if (leaveRequests.length === 0) return;

    for (const item of leaveRequests) {
      await approveMutation.mutateAsync({executionId: item.id, comments: undefined});
    }

    mNotifications.show({
      title: 'All leave approved',
      message: `${leaveRequests.length} leave request${leaveRequests.length === 1 ? '' : 's'} approved.`,
      color: 'green',
      icon: <CheckCircle className="h-4 w-4"/>,
      autoClose: 5000,
    });

    queryClient.invalidateQueries({queryKey: ['approvalInbox']});
  }, [items, approveMutation, queryClient]);

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

  // Aura underline tab strip — counts the "All" tab against pending total.
  const tabItems: ReadonlyArray<TabItem> = useMemo(
    () =>
      MODULE_TABS.map((t) => ({
        id: t.key,
        label: t.label,
        count: t.key === 'ALL' ? pendingTotal : undefined,
      })),
    [pendingTotal]
  );

  // Show a loading spinner while auth is hydrating to avoid flashing "Access denied"
  // before the user's roles have been restored from the session.
  if (!isReady) {
    return (
      <AppLayout activeMenuItem="approvals">
        <div className="flex h-full items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent"/>
        </div>
      </AppLayout>
    );
  }

  if (!canViewInbox) {
    return (
      <AppLayout activeMenuItem="approvals">
        <div className="flex h-full items-center justify-center p-8">
          <EmptyState
            title="Access denied"
            description="You do not have permission to view the approval inbox."
            icon={<XCircle
              className="h-12 w-12 text-[var(--err-fg)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="approvals">
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.25, ease: 'easeOut'}}
        className="space-y-5 p-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-aura-title text-[var(--text-1)]">
              Approvals
            </h1>
            <p className="mt-1 text-sm text-[var(--text-3)]">
              <span className="tnum">{pendingTotal}</span> request{pendingTotal === 1 ? '' : 's'} awaiting your
              decision
              {activeDelegationsCount > 0 && (
                <>
                  {' · '}
                  <span className="tnum">{activeDelegationsCount}</span> active{' '}
                  {activeDelegationsCount === 1 ? 'delegation' : 'delegations'}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" leftIcon={<CheckCheck className="h-4 w-4"/>}
                    onClick={handleApproveAllLeave}>
              Approve all leave
            </Button>
            <Button variant="ghost" size="md" leftIcon={<SlidersHorizontal className="h-4 w-4"/>}
                    onClick={() => handleStatusChange(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}>
              {statusFilter === 'PENDING' ? 'Show all' : 'Pending only'}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Refresh inbox" onClick={() => refetch()}
                    disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}/>
            </Button>
          </div>
        </div>

        {/* Tabs + secondary filters */}
        <div className="space-y-3">
          <Tabs
            aria-label="Approval type"
            tabs={tabItems}
            value={activeTab}
            onChange={handleTabChange}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Segmented
              aria-label="Approval status"
              value={statusFilter}
              onChange={(v) => handleStatusChange(v as StatusFilter)}
              options={[
                {value: 'PENDING', label: 'Pending'},
                {value: 'ALL', label: 'All'},
              ]}
            />
            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-3)]"/>
              <input
                type="text"
                placeholder="Search by title, requester…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="w-full rounded-[var(--r-control)] border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-4 text-sm text-[var(--text-1)] shadow-[var(--inset-input)] outline-none transition-[border-color,box-shadow] duration-[var(--t-fast)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:shadow-[var(--sh-focus)]"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="space-y-2.5">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-[88px] rounded-[var(--r-lg)]"/>
              ))}
            </div>
            <Skeleton className="h-[420px] rounded-[var(--r-lg)]"/>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="You're all caught up"
            description={
              statusFilter === 'PENDING'
                ? 'No pending approvals at the moment.'
                : 'No approvals match your current filters.'
            }
            icon={<Inbox className="h-12 w-12"/>}
          />
        ) : (
          <>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              {/* List */}
              <div className="flex flex-col gap-2.5">
                {items.map((item) => (
                  <InboxListItem
                    key={item.id}
                    item={item}
                    isSelected={selectedId === item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                      setComments('');
                    }}
                  />
                ))}
              </div>

              {/* Details */}
              {selectedItem ? (
                <DetailPane
                  item={selectedItem}
                  comments={comments}
                  onCommentsChange={setComments}
                  isBusy={approveMutation.isPending || rejectMutation.isPending || returnMutation.isPending}
                  onApprove={() => setShowApproveModal(true)}
                  onReject={() => {
                    setComments('');
                    setShowRejectModal(true);
                  }}
                  onReturn={() => {
                    setComments('');
                    setShowReturnModal(true);
                  }}
                  onDelegate={() => setShowDelegationModal(true)}
                />
              ) : (
                <div
                  className="flex min-h-[280px] items-center justify-center rounded-[var(--r-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-sm text-[var(--text-3)]">
                  Select a request from the left to review and decide.
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
                <p className="text-sm text-[var(--text-3)]">
                  Showing <span className="tnum">{page * PAGE_SIZE + 1}</span>–
                  <span className="tnum">{Math.min((page + 1) * PAGE_SIZE, totalElements)}</span> of{' '}
                  <span className="tnum">{totalElements}</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ChevronLeft className="h-4 w-4"/>}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    rightIcon={<ChevronRight className="h-4 w-4"/>}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
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
          <div
            className="flex items-center gap-2 text-[var(--ok-fg)]">
            <CheckCircle className="h-5 w-5"/>
            Approve request
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-[var(--text-2)]">
            Are you sure you want to approve this request from{' '}
            <strong className="text-[var(--text-1)]">{selectedItem?.requesterName ?? 'Unknown'}</strong>?
          </p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-[var(--text-2)]">
              Comment (optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add an optional comment…"
              className="mt-1 w-full resize-none rounded-[var(--r-control)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-1)] shadow-[var(--inset-input)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--sh-focus)]"
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
            variant="success"
            isLoading={approveMutation.isPending}
            loadingText="Approving…"
            onClick={handleApprove}
            disabled={approveMutation.isPending}
          >
            Approve
          </Button>
        </ModalFooter>
      </Modal>

      {/* Reject modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} size="md">
        <ModalHeader onClose={() => setShowRejectModal(false)}>
          <div
            className="flex items-center gap-2 text-[var(--err-fg)]">
            <XCircle className="h-5 w-5"/>
            Decline request
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-[var(--text-2)]">
            Please provide a reason for declining this request from{' '}
            <strong className="text-[var(--text-1)]">{selectedItem?.requesterName ?? 'Unknown'}</strong>.
          </p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-[var(--text-2)]">
              Reason <span aria-hidden="true" className="text-[var(--err-fg)]">*</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Explain why this request is being declined…"
              className="mt-1 w-full resize-none rounded-[var(--r-control)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-1)] shadow-[var(--inset-input)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--sh-focus)]"
              rows={3}
              aria-required="true"
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
            variant="danger"
            isLoading={rejectMutation.isPending}
            loadingText="Declining…"
            onClick={handleReject}
            disabled={rejectMutation.isPending || !comments.trim()}
          >
            Decline
          </Button>
        </ModalFooter>
      </Modal>

      {/* Return for Modification modal (DEF-44) */}
      <Modal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} size="md">
        <ModalHeader onClose={() => setShowReturnModal(false)}>
          <div
            className="flex items-center gap-2 text-[var(--warn-fg)]">
            <RotateCcw className="h-5 w-5"/>
            Return for modification
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-[var(--text-2)]">
            Return this request to{' '}
            <strong className="text-[var(--text-1)]">{selectedItem?.requesterName ?? 'Unknown'}</strong> for
            corrections. The requester will be able to revise and resubmit.
          </p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-[var(--text-2)]">
              Reason <span aria-hidden="true" className="text-[var(--err-fg)]">*</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Explain what needs to be corrected…"
              className="mt-1 w-full resize-none rounded-[var(--r-control)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-1)] shadow-[var(--inset-input)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--sh-focus)]"
              rows={3}
              aria-required="true"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setShowReturnModal(false)}
            disabled={returnMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="warning"
            isLoading={returnMutation.isPending}
            loadingText="Returning…"
            onClick={handleReturn}
            disabled={returnMutation.isPending || !comments.trim()}
          >
            Return for Modification
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delegation modal */}
      <Modal isOpen={showDelegationModal} onClose={() => setShowDelegationModal(false)} size="md">
        <ModalHeader onClose={() => setShowDelegationModal(false)}>
          <div
            className="flex items-center gap-2 text-[var(--accent-text)]">
            <Zap className="h-5 w-5"/>
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
                value={delegationForm.watch('delegateId') ? {
                  id: delegationForm.watch('delegateId'),
                  name: delegationForm.watch('delegateName')
                } : null}
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
                <p className="mt-1.5 text-sm text-[var(--err-fg)]">
                  {delegationForm.formState.errors.delegateId.message}
                </p>
              )}
            </div>

            {/* Start date */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-2)]">
                Start date <span aria-hidden="true" className="text-[var(--err-fg)]">*</span>
              </label>
              <input
                type="date"
                {...delegationForm.register('startDate')}
                aria-required="true"
                className="w-full rounded-[var(--r-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] shadow-[var(--inset-input)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--sh-focus)]"
              />
              {delegationForm.formState.errors.startDate && (
                <p className="mt-1.5 text-sm text-[var(--err-fg)]">
                  {delegationForm.formState.errors.startDate.message}
                </p>
              )}
            </div>

            {/* End date */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-2)]">
                End date <span aria-hidden="true" className="text-[var(--err-fg)]">*</span>
              </label>
              <input
                type="date"
                {...delegationForm.register('endDate')}
                aria-required="true"
                className="w-full rounded-[var(--r-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] shadow-[var(--inset-input)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--sh-focus)]"
              />
              {delegationForm.formState.errors.endDate && (
                <p className="mt-1.5 text-sm text-[var(--err-fg)]">
                  {delegationForm.formState.errors.endDate.message}
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-2)]">
                Reason (optional)
              </label>
              <textarea
                {...delegationForm.register('reason')}
                placeholder="Explain why you're delegating approvals…"
                className="w-full resize-none rounded-[var(--r-control)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-1)] shadow-[var(--inset-input)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--sh-focus)]"
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
            isLoading={createDelegationMutation.isPending}
            loadingText="Creating delegation…"
            onClick={delegationForm.handleSubmit(handleCreateDelegation)}
            disabled={createDelegationMutation.isPending}
          >
            Delegate
          </Button>
        </ModalFooter>
      </Modal>
    </AppLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

/** Aura request card: type-icon tile, requester + module/ref badge, relative time, title. */
function InboxListItem({
                         item,
                         isSelected,
                         onClick,
                       }: {
  item: ApprovalInboxItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const TypeIcon = getModuleIcon(item.module);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={`group flex w-full items-start gap-3 rounded-[var(--r-lg)] border bg-[var(--surface)] p-3.5 text-left shadow-[var(--sh-sm)] outline-none transition-[transform,box-shadow,border-color] duration-[var(--t-fast)] ease-[var(--ease)] hover-lift focus-visible:shadow-[var(--sh-focus)] ${
        isSelected
          ? 'border-[var(--accent)] shadow-[0_0_0_1px_var(--accent),var(--sh-sm)]'
          : 'border-[var(--border)] hover:border-[var(--border-aura-strong)]'
      }`}
    >
      {/* Type icon tile */}
      <span
        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent-text)]">
        <TypeIcon className="h-[17px] w-[17px]"/>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 truncate text-[13px] font-bold text-[var(--text-1)]">
            {item.requesterName ?? 'Unknown'}
          </span>
          {item.submittedAt && (
            <span className="num ml-auto flex-shrink-0 text-[11px] text-[var(--text-3)]">
              {formatRelative(item.submittedAt)}
            </span>
          )}
        </div>
        <div className="mt-[3px] truncate text-[12.5px] text-[var(--text-2)]">
          {item.title}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="default" size="sm">
            <span>{item.module}</span>
            {item.referenceNumber && (
              <span className="num text-[var(--text-3)]"> · #{item.referenceNumber}</span>
            )}
          </Badge>
          {item.deadline && (
            <Badge variant="warning" size="sm" icon={<Clock className="h-3 w-3"/>}>
              <span className="num">{formatDateShort(item.deadline)}</span>
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

/** Aura detail pane: requester header, key-values, approval-chain timeline, note, actions. */
function DetailPane({
                      item,
                      comments,
                      onCommentsChange,
                      isBusy,
                      onApprove,
                      onReject,
                      onReturn,
                      onDelegate,
                    }: {
  item: ApprovalInboxItem;
  comments: string;
  onCommentsChange: (v: string) => void;
  isBusy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onReturn: () => void;
  onDelegate: () => void;
}) {
  const isPending = item.status === 'PENDING';

  // Key-value detail rows derived from the real inbox item.
  const detail: Array<[string, string]> = [
    ['Module', item.module],
    ['Title', item.title],
    ['Requester', item.requesterName ?? 'Unknown'],
    ['Current step', item.currentStepName ?? 'Pending'],
    ['Created', item.submittedAt ? formatDateTime(item.submittedAt) : '—'],
    ['Due', item.deadline ? formatDateTime(item.deadline) : '—'],
  ];
  if (item.referenceNumber) {
    detail.push(['Reference', `#${item.referenceNumber}`]);
  }

  return (
    <Card className="h-fit overflow-hidden p-0 lg:sticky lg:top-6">
      {/* Requester header */}
      <div className="flex items-center gap-3.5 border-b border-[var(--border)] px-6 py-5">
        <RequesterAvatar name={item.requesterName} size={48}/>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base font-bold text-[var(--text-1)]">
            {item.requesterName ?? 'Unknown'}
          </div>
          <div className="truncate text-[13px] text-[var(--text-3)]">
            {item.currentStepName ?? 'Pending review'}
          </div>
        </div>
        <div className="text-right">
          <Badge variant="primary" size="sm" dot dotColor="info">{item.module}</Badge>
          {item.referenceNumber && (
            <div className="num mt-1.5 text-[11.5px] text-[var(--text-3)]">#{item.referenceNumber}</div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-bold leading-tight text-[var(--text-1)]">Request details</h3>
          <Badge variant={isPending ? 'warning' : 'default'} size="sm" dot dotColor={isPending ? 'warning' : 'default'}>
            {isPending ? 'Pending' : item.status}
          </Badge>
        </div>

        <dl className="divide-y divide-[var(--border-soft)]">
          {detail.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 py-2.5">
              <dt className="text-[13px] text-[var(--text-3)]">{k}</dt>
              <dd className="max-w-[60%] text-right text-[13px] font-medium text-[var(--text-1)]">{v}</dd>
            </div>
          ))}
        </dl>

        {/* Approval chain */}
        <div className="text-aura-micro mb-3 mt-6 text-[var(--text-3)]">Approval chain</div>
        <ol className="relative space-y-4 pl-7">
          <span aria-hidden="true"
                className="absolute left-[10px] top-1.5 bottom-1.5 w-px bg-[var(--border)]"/>
          <li className="relative">
            <span
              className="absolute -left-7 top-0 grid h-5 w-5 place-items-center rounded-full bg-[var(--ok-fg)] text-white ring-2 ring-[var(--surface)]">
              <Check className="h-2.5 w-2.5"/>
            </span>
            <div className="text-[13px] font-semibold text-[var(--text-1)]">
              {item.requesterName ?? 'Requester'} submitted
            </div>
            {item.submittedAt && (
              <div className="num text-[11.5px] text-[var(--text-3)]">{formatRelative(item.submittedAt)}</div>
            )}
          </li>
          <li className="relative">
            <span
              className="absolute -left-7 top-0 grid h-5 w-5 place-items-center rounded-full bg-[var(--ok-fg)] text-white ring-2 ring-[var(--surface)]">
              <Check className="h-2.5 w-2.5"/>
            </span>
            <div className="text-[13px] font-semibold text-[var(--text-1)]">Manager endorsed</div>
            <div className="text-[11.5px] text-[var(--text-3)]">Auto-routed</div>
          </li>
          <li className="relative">
            <span
              className="absolute -left-7 top-0 grid h-5 w-5 place-items-center rounded-full bg-[var(--accent)] text-white ring-2 ring-[var(--surface)]">
              <Clock className="h-2.5 w-2.5"/>
            </span>
            <div className="text-[13px] font-semibold text-[var(--text-1)]">
              Your approval{' '}
              <span className="font-normal text-[var(--text-3)]">
                · {isPending ? 'pending' : item.status.toLowerCase()}
              </span>
            </div>
          </li>
        </ol>

        {/* Note */}
        <div className="mt-6">
          <label htmlFor="approval-note" className="sr-only">Add a note</label>
          <textarea
            id="approval-note"
            rows={2}
            value={comments}
            onChange={(e) => onCommentsChange(e.target.value)}
            placeholder="Add a note (optional)…"
            disabled={!isPending}
            className="w-full resize-none rounded-[var(--r-control)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-1)] shadow-[var(--inset-input)] outline-none transition-[border-color,box-shadow] duration-[var(--t-fast)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:shadow-[var(--sh-focus)] disabled:opacity-60"
          />
        </div>

        {/* Actions */}
        {isPending ? (
          <div className="mt-4 flex gap-2.5">
            <Button
              variant="success"
              size="md"
              className="flex-1"
              leftIcon={<Check className="h-4 w-4"/>}
              onClick={onApprove}
              disabled={isBusy}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              leftIcon={<XCircle className="h-4 w-4"/>}
              onClick={onReject}
              disabled={isBusy}
            >
              Decline
            </Button>
            <Button
              variant="ghost"
              size="md"
              leftIcon={<RotateCcw className="h-4 w-4"/>}
              onClick={onReturn}
              disabled={isBusy}
              aria-label="Return for modification"
            >
              Return
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelegate}
              disabled={isBusy}
              aria-label="Delegate"
            >
              <CornerUpRight className="h-4 w-4"/>
            </Button>
          </div>
        ) : (
          <div className="mt-4">
            <Badge variant="default" size="md" dot>Request {item.status.toLowerCase()}</Badge>
          </div>
        )}
      </div>
    </Card>
  );
}
