'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout';
import {
  Clock,
  CheckCircle,
  XCircle,
  User,
  Briefcase,
  AlertTriangle,
  RefreshCw,
  Filter,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmployeeCapacityDisplay } from '@/components/resource-management';
import {
  AllocationApprovalRequest,
  formatAllocationPercentage,
} from '@/lib/types/resource-management';
import {
  useMyPendingApprovals,
  useEmployeeCapacity,
  useApproveAllocationRequest,
  useRejectAllocationRequest,
} from '@/lib/hooks/queries/useResources';
import { format, parseISO } from 'date-fns';

type TabKey = 'pending' | 'approved' | 'rejected';

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [selectedRequest, setSelectedRequest] = useState<AllocationApprovalRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');

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
        },
      }
    );
  };

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
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Allocation Approvals
            </h1>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              Review and approve over-allocation requests
            </p>
          </div>
          <Button variant="ghost" onClick={() => refetchRequests()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-surface-200 dark:border-surface-700">
          <nav className="-mb-px flex gap-6">
            {[
              { key: 'pending', label: 'Pending', count: pendingRequests.length, color: 'amber' },
              { key: 'approved', label: 'Approved', count: approvedRequests.length, color: 'green' },
              { key: 'rejected', label: 'Rejected', count: rejectedRequests.length, color: 'red' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                    : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                      tab.key === 'pending'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : tab.key === 'approved'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
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
            <div className="space-y-3">
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
                  <div className="space-y-3 border-t border-surface-200 pt-4 dark:border-surface-700">
                    <h4 className="font-medium text-surface-900 dark:text-surface-50">
                      Requested Assignment
                    </h4>
                    <div className="rounded-lg bg-surface-50 p-4 dark:bg-surface-800">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-surface-400" />
                        <div>
                          <p className="font-medium text-surface-900 dark:text-surface-50">
                            {selectedRequest.projectName}
                          </p>
                          <p className="text-sm text-surface-500">
                            {selectedRequest.role} • {selectedRequest.projectCode}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                        <div>
                          <p className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                            +{formatAllocationPercentage(selectedRequest.requestedAllocation)}
                          </p>
                          <p className="text-xs text-surface-500">Requested</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                            {formatAllocationPercentage(selectedRequest.resultingAllocation)}
                          </p>
                          <p className="text-xs text-surface-500">Resulting Total</p>
                        </div>
                      </div>
                    </div>

                    {selectedRequest.requestReason && (
                      <div>
                        <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                          Reason
                        </p>
                        <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
                          {selectedRequest.requestReason}
                        </p>
                      </div>
                    )}

                    <div className="text-sm text-surface-500 dark:text-surface-400">
                      Requested by {selectedRequest.requestedByName} on{' '}
                      {format(parseISO(selectedRequest.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedRequest.status === 'PENDING' && (
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
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
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            Approve Over-Allocation
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to approve this over-allocation request for{' '}
            <strong>{selectedRequest?.employeeName}</strong>?
          </p>
          <p className="mt-2 text-sm text-surface-500">
            This will allow them to be allocated at{' '}
            <strong className="text-red-600">
              {selectedRequest && formatAllocationPercentage(selectedRequest.resultingAllocation)}
            </strong>{' '}
            total capacity.
          </p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
              Comment (optional)
            </label>
            <textarea
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder="Add a comment for the requester..."
              className="mt-1 w-full rounded-lg border border-surface-200 bg-white p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-700 dark:bg-surface-800"
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
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <XCircle className="h-5 w-5" />
            Reject Over-Allocation
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-surface-600 dark:text-surface-400">
            Please provide a reason for rejecting this over-allocation request for{' '}
            <strong>{selectedRequest?.employeeName}</strong>.
          </p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this request is being rejected..."
              className="mt-1 w-full rounded-lg border border-surface-200 bg-white p-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-700 dark:bg-surface-800"
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
            className="bg-red-600 hover:bg-red-700"
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
    PENDING: 'border-amber-200 dark:border-amber-800',
    APPROVED: 'border-green-200 dark:border-green-800',
    REJECTED: 'border-red-200 dark:border-red-800',
  };

  return (
    <Card
      className={`cursor-pointer transition-all ${statusColors[request.status]} ${
        isSelected ? 'ring-2 ring-primary-500' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
              <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="font-medium text-surface-900 dark:text-surface-50">
                {request.employeeName}
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                {request.projectName}
              </p>
            </div>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-surface-500 dark:text-surface-400">
            +{formatAllocationPercentage(request.requestedAllocation)} → {' '}
            <span className="font-medium text-red-600 dark:text-red-400">
              {formatAllocationPercentage(request.resultingAllocation)} total
            </span>
          </span>
          <span className="text-xs text-surface-400">
            {format(parseISO(request.createdAt), 'MMM d')}
          </span>
        </div>

        {request.status === 'PENDING' && onApprove && onReject && (
          <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="flex-1 text-red-600" onClick={onReject}>
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
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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
