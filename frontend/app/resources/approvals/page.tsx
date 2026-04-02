'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import {
  Clock,
  CheckCircle,
  XCircle,
  User,
  Briefcase,
  RefreshCw,
} from 'lucide-react';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmployeeCapacityDisplay } from '@/components/resource-management';
import {
  AllocationApprovalRequest,
  formatAllocationPercentage,
} from '@/lib/types/hrms/resource-management';
import {
  useMyPendingApprovals,
  useEmployeeCapacity,
  useApproveAllocationRequest,
  useRejectAllocationRequest,
} from '@/lib/hooks/queries/useResources';
import { useToast } from '@/components/notifications/ToastProvider';
import { format, parseISO } from 'date-fns';

type TabKey = 'pending' | 'approved' | 'rejected';

export default function ApprovalsPage() {
  const router = useRouter();
  const { hasAnyPermission, isReady: permissionsReady } = usePermissions();
  const hasAccess = hasAnyPermission(Permissions.ALLOCATION_APPROVE, Permissions.RESOURCE_VIEW, Permissions.RESOURCE_MANAGE);

  useEffect(() => {
    if (permissionsReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [permissionsReady, hasAccess, router]);

  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [selectedRequest, setSelectedRequest] = useState<AllocationApprovalRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const toast = useToast();

  // React Query hooks
  const { data: pendingData, isLoading, refetch: refetchRequests } = useMyPendingApprovals(0, 50);
  const { data: employeeCapacity } = useEmployeeCapacity(selectedRequest?.employeeId ?? '');
  const approveMutation = useApproveAllocationRequest();
  const rejectMutation = useRejectAllocationRequest();

  const requests = pendingData?.content ?? [];

  const handleSelectRequest = (request: AllocationApprovalRequest) => {
    setSelectedRequest(request);
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    approveMutation.mutate(
      {
        requestId: selectedRequest.id,
        data: {
          comment: approveComment || undefined,
        },
      },
      {
        onSuccess: () => {
          setShowApproveModal(false);
          setApproveComment('');
          setSelectedRequest(null);
          refetchRequests();
          toast.success('Request Approved', 'Over-allocation request has been approved');
        },
        onError: (error: Error) => {
          toast.error('Approval Failed', error.message || 'Failed to approve the request');
        },
      }
    );
  };

  const handleReject = () => {
    if (!selectedRequest || !rejectReason.trim()) return;
    rejectMutation.mutate(
      {
        requestId: selectedRequest.id,
        data: { reason: rejectReason },
      },
      {
        onSuccess: () => {
          setShowRejectModal(false);
          setRejectReason('');
          setSelectedRequest(null);
          refetchRequests();
          toast.info('Request Rejected', 'Over-allocation request has been rejected');
        },
        onError: (error: Error) => {
          toast.error('Rejection Failed', error.message || 'Failed to reject the request');
        },
      }
    );
  };

  if (!permissionsReady || !hasAccess) return null;

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const approvedRequests = requests.filter((r) => r.status === 'APPROVED');
  const rejectedRequests = requests.filter((r) => r.status === 'REJECTED');

  const displayedRequests =
    activeTab === 'pending'
      ? pendingRequests
      : activeTab === 'approved'
        ? approvedRequests
        : rejectedRequests;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Allocation Approvals
            </h1>
            <p className="mt-1 text-body-muted">
              Review and approve over-allocation requests
            </p>
          </div>
          <Button variant="ghost" onClick={() => refetchRequests()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-[var(--border-main)]">
          <nav className="-mb-px flex gap-6">
            {[
              { key: 'pending', label: 'Pending', count: pendingRequests.length },
              { key: 'approved', label: 'Approved', count: approvedRequests.length },
              { key: 'rejected', label: 'Rejected', count: rejectedRequests.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-accent-700 text-accent-700 dark:border-accent-400 dark:text-accent-400'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:text-[var(--text-muted)]'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                      tab.key === 'pending'
                        ? 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400'
                        : tab.key === 'approved'
                          ? 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                          : 'bg-danger-50 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : displayedRequests.length === 0 ? (
          <EmptyState
            title={`No ${activeTab} requests`}
            description={
              activeTab === 'pending'
                ? 'All allocation requests have been processed'
                : `No ${activeTab} requests to display`
            }
            icon={<Clock className="h-12 w-12" />}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Request list */}
            <div className="space-y-4">
              {displayedRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  isSelected={selectedRequest?.id === request.id}
                  onClick={() => handleSelectRequest(request)}
                  onApprove={() => {
                    setSelectedRequest(request);
                    setShowApproveModal(true);
                  }}
                  onReject={() => {
                    setSelectedRequest(request);
                    setShowRejectModal(true);
                  }}
                />
              ))}
            </div>

            {/* Detail panel */}
            {selectedRequest && (
              <Card className="sticky top-6 h-fit">
                <CardHeader>
                  <CardTitle>Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Employee capacity */}
                  {employeeCapacity ? (
                    <EmployeeCapacityDisplay capacity={employeeCapacity} showBreakdown />
                  ) : (
                    <Skeleton className="h-48" />
                  )}

                  {/* Request info */}
                  <div className="space-y-4 border-t border-[var(--border-main)] pt-4 dark:border-[var(--border-main)]">
                    <h4 className="font-medium text-[var(--text-primary)]">
                      Requested Assignment
                    </h4>
                    <div className="rounded-lg bg-[var(--bg-secondary)] p-4 dark:bg-[var(--bg-secondary)]">
                      <div className="flex items-center gap-4">
                        <Briefcase className="h-5 w-5 text-[var(--text-muted)]" />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {selectedRequest.projectName}
                          </p>
                          <p className="text-body-muted">
                            {selectedRequest.role} • {selectedRequest.projectCode}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-lg font-semibold text-accent-700 dark:text-accent-400">
                            +{formatAllocationPercentage(selectedRequest.requestedAllocation)}
                          </p>
                          <p className="text-caption">Requested</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-danger-600 dark:text-danger-400">
                            {formatAllocationPercentage(selectedRequest.resultingAllocation)}
                          </p>
                          <p className="text-caption">Resulting Total</p>
                        </div>
                      </div>
                    </div>

                    {selectedRequest.requestReason && (
                      <div>
                        <p className="text-sm font-medium text-[var(--text-secondary)]">
                          Reason
                        </p>
                        <p className="mt-1 text-body-secondary">
                          {selectedRequest.requestReason}
                        </p>
                      </div>
                    )}

                    <div className="text-body-muted">
                      Requested by {selectedRequest.requestedByName} on{' '}
                      {format(parseISO(selectedRequest.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedRequest.status === 'PENDING' && (
                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        className="flex-1 border-danger-300 text-danger-700 hover:bg-danger-50 dark:border-danger-700 dark:text-danger-400"
                        onClick={() => setShowRejectModal(true)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={() => setShowApproveModal(true)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} size="md">
        <ModalHeader onClose={() => setShowApproveModal(false)}>
          <div className="flex items-center gap-2 text-success-600 dark:text-success-400">
            <CheckCircle className="h-5 w-5" />
            Approve Over-Allocation
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-[var(--text-secondary)]">
            Are you sure you want to approve this over-allocation request for{' '}
            <strong>{selectedRequest?.employeeName}</strong>?
          </p>
          <p className="mt-2 text-body-muted">
            This will allow them to be allocated at{' '}
            <strong className="text-danger-600">
              {selectedRequest && formatAllocationPercentage(selectedRequest.resultingAllocation)}
            </strong>{' '}
            total capacity.
          </p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              Comment (optional)
            </label>
            <textarea
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder="Add a comment for the requester..."
              className="mt-1 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)]"
              rows={3}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowApproveModal(false)} disabled={approveMutation.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleApprove} disabled={approveMutation.isPending}>
            {approveMutation.isPending ? 'Approving...' : 'Approve'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} size="md">
        <ModalHeader onClose={() => setShowRejectModal(false)}>
          <div className="flex items-center gap-2 text-danger-600 dark:text-danger-400">
            <XCircle className="h-5 w-5" />
            Reject Over-Allocation
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-[var(--text-secondary)]">
            Please provide a reason for rejecting this over-allocation request for{' '}
            <strong>{selectedRequest?.employeeName}</strong>.
          </p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              Reason <span className="text-danger-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this request is being rejected..."
              className="mt-1 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-[var(--border-main)] dark:bg-[var(--bg-secondary)]"
              rows={3}
              required
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowRejectModal(false)} disabled={rejectMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-danger-600 hover:bg-danger-700"
            onClick={handleReject}
            disabled={rejectMutation.isPending || !rejectReason.trim()}
          >
            {rejectMutation.isPending ? 'Rejecting...' : 'Reject Request'}
          </Button>
        </ModalFooter>
      </Modal>
    </AppLayout>
  );
}

function RequestCard({
  request,
  isSelected,
  onClick,
  onApprove,
  onReject,
}: {
  request: AllocationApprovalRequest;
  isSelected: boolean;
  onClick: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const statusColors = {
    PENDING: 'border-warning-200 dark:border-warning-800',
    APPROVED: 'border-success-200 dark:border-success-800',
    REJECTED: 'border-danger-200 dark:border-danger-800',
  };

  return (
    <Card
      className={`cursor-pointer transition-all ${statusColors[request.status]} ${
        isSelected ? 'ring-2 ring-accent-500' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900/30">
              <User className="h-5 w-5 text-accent-700 dark:text-accent-400" />
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                {request.employeeName}
              </p>
              <p className="text-body-muted">
                {request.projectName}
              </p>
            </div>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <div className="mt-3 row-between text-sm">
          <span className="text-[var(--text-muted)]">
            +{formatAllocationPercentage(request.requestedAllocation)} → {' '}
            <span className="font-medium text-danger-600 dark:text-danger-400">
              {formatAllocationPercentage(request.resultingAllocation)} total
            </span>
          </span>
          <span className="text-caption">
            {format(parseISO(request.createdAt), 'MMM d')}
          </span>
        </div>

        {request.status === 'PENDING' && onApprove && onReject && (
          <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="flex-1 text-danger-600" onClick={onReject}>
              Reject
            </Button>
            <Button variant="primary" size="sm" className="flex-1" onClick={onApprove}>
              Approve
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: AllocationApprovalRequest['status'] }) {
  const styles = {
    PENDING: 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
    APPROVED: 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400',
    REJECTED: 'bg-danger-50 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
  };

  const icons = {
    PENDING: Clock,
    APPROVED: CheckCircle,
    REJECTED: XCircle,
  };

  const Icon = icons[status];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      <Icon className="h-3 w-3" />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
