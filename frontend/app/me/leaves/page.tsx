'use client';

import {useEffect, useState} from 'react';
import {AlertCircle, Calendar, FileText, Filter, Plus} from 'lucide-react';
import {NativeSelect} from '@mantine/core';
import {AppLayout} from '@/components/layout';
import {PageTransition} from '@/components/motion';
import {Button} from '@/components/ui/Button';
import {Callout} from '@/components/ui/Callout';
import {Card} from '@/components/ui/Card';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {EmptyState} from '@/components/ui/EmptyState';
import {PageHeader} from '@/components/ui/PageHeader';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  useActiveLeaveTypes,
  useCancelLeaveRequest,
  useEmployeeBalances,
  useEmployeeLeaveRequests,
} from '@/lib/hooks/queries/useLeaves';
import type {LeaveBalance, LeaveRequest, LeaveRequestStatus} from '@/lib/types/hrms/leave';
import {formatDate} from '@/lib/utils/format/date';
import {createLogger} from '@/lib/utils/logger';
import {LeaveBalanceCard} from './_components/LeaveBalanceCard';
import {LeaveRequestItem} from './_components/LeaveRequestItem';
import {LeaveRequestModal} from './_components/LeaveRequestModal';
import {EncashModal} from './_components/EncashModal';

const log = createLogger('LeavesPage');

const TITLE = 'My Leaves';
const DESCRIPTION = 'Manage your leave requests and balances';
const BREADCRUMBS = [{label: 'My Space', href: '/me/dashboard'}, {label: 'Leaves'}];

const STATUS_OPTIONS = [
  {value: 'ALL', label: 'All Status'},
  {value: 'PENDING', label: 'Pending'},
  {value: 'APPROVED', label: 'Approved'},
  {value: 'REJECTED', label: 'Rejected'},
  {value: 'CANCELLED', label: 'Cancelled'},
];

export default function MyLeavesPage() {
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState<LeaveRequest | null>(null);
  const [encashBalance, setEncashBalance] = useState<LeaveBalance | null>(null);

  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | 'ALL'>('ALL');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('ALL');

  const {
    data: leaveRequestsData,
    isError: isLeaveRequestsError,
    error: leaveRequestsError
  } = useEmployeeLeaveRequests(user?.employeeId || '', 0, 100, Boolean(hasHydrated && user?.employeeId));
  const {data: balancesData = []} = useEmployeeBalances(user?.employeeId || '', Boolean(hasHydrated && user?.employeeId));
  const {data: leaveTypesData = []} = useActiveLeaveTypes(Boolean(hasHydrated && isAuthenticated));
  const cancelLeaveRequest = useCancelLeaveRequest();

  const leaveRequests = Array.isArray(leaveRequestsData?.content) ? leaveRequestsData.content : (Array.isArray(leaveRequestsData) ? leaveRequestsData : []);
  const leaveTypes = Array.isArray(leaveTypesData) ? leaveTypesData : [];
  const leaveBalances = Array.isArray(balancesData) ? balancesData : [];
  const isLoading = !leaveRequestsData && !isLeaveRequestsError;

  useEffect(() => {
    document.title = 'My Leaves | NU-AURA';
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(null), 3000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const getLeaveTypeName = (leaveTypeId: string) =>
    leaveTypes.find((lt) => lt.id === leaveTypeId)?.leaveName || 'Unknown';

  const filteredLeaveRequests = leaveRequests.filter((request) => {
    const statusMatch = statusFilter === 'ALL' || request.status === statusFilter;
    const typeMatch = leaveTypeFilter === 'ALL' || request.leaveTypeId === leaveTypeFilter;
    return statusMatch && typeMatch;
  });

  const clearFilters = () => {
    setStatusFilter('ALL');
    setLeaveTypeFilter('ALL');
  };

  const hasActiveFilters = statusFilter !== 'ALL' || leaveTypeFilter !== 'ALL';

  const confirmCancel = async (reason?: string) => {
    if (!cancellingRequest) return;
    try {
      await cancelLeaveRequest.mutateAsync({id: cancellingRequest.id, reason: reason ?? ''});
      setSuccessMessage('Leave request cancelled successfully!');
      setCancellingRequest(null);
    } catch (err: unknown) {
      log.error('Failed to cancel leave request:', err);
      setError((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to cancel leave request');
    }
  };

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="leaves">
        <ListPageSkeleton rows={5} columns={4}/>
      </AppLayout>
    );
  }

  if (isLeaveRequestsError) {
    const is403 = (leaveRequestsError as { response?: { status?: number } })?.response?.status === 403;
    return (
      <AppLayout activeMenuItem="leaves">
        <div className="flex flex-col gap-6">
          <PageHeader title={TITLE} breadcrumbs={BREADCRUMBS}/>
          <EmptyState
            icon={<AlertCircle className="h-8 w-8" aria-hidden="true"/>}
            title={is403 ? 'Access Restricted' : 'Unable to Load Leave Data'}
            description={is403
              ? 'You don\'t have permission to view leave requests. Please contact your administrator to grant leave management access.'
              : 'There was an error loading your leave data. Please try refreshing the page or contact support if the issue persists.'}
          />
        </div>
      </AppLayout>
    );
  }

  if (!user?.employeeId) {
    return (
      <AppLayout activeMenuItem="leaves">
        <PageTransition className="flex flex-col gap-6">
          <PageHeader title={TITLE} breadcrumbs={BREADCRUMBS}/>
          <EmptyState
            icon={<Calendar className="h-8 w-8" aria-hidden="true"/>}
            title="No Employee Profile Linked"
            description="Leave management requires an employee profile. Use the admin panels to manage employee leaves."
          />
        </PageTransition>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="leaves">
      <PageTransition className="flex flex-col gap-6">
        <PageHeader
          title={TITLE}
          description={DESCRIPTION}
          breadcrumbs={BREADCRUMBS}
          actions={
            <Button leftIcon={<Plus className="h-4 w-4" aria-hidden="true"/>} onClick={() => setShowApplyModal(true)}>
              Apply for Leave
            </Button>
          }
        />

        {successMessage && (
          <div role="status">
            <Callout tone="success">{successMessage}</Callout>
          </div>
        )}
        {error && (
          <div role="alert">
            <Callout tone="danger">{error}</Callout>
          </div>
        )}

        {leaveBalances.length > 0 && (
          <section aria-label="Leave balances" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {leaveBalances.map((balance) => (
              <LeaveBalanceCard
                key={balance.id}
                balance={balance}
                leaveType={leaveTypes.find((lt) => lt.id === balance.leaveTypeId)}
                onEncash={setEncashBalance}
              />
            ))}
          </section>
        )}

        <Card padding="sm">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-text-1">
                <FileText className="h-4 w-4 text-text-3" aria-hidden="true"/>
                Leave History
              </h2>
              <p className="mt-1 text-xs text-text-3">
                Your past and current leave requests
                {hasActiveFilters && (
                  <span className="ml-2 tabular-nums text-accent">
                    ({filteredLeaveRequests.length} of {leaveRequests.length})
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-text-3" aria-hidden="true"/>
              <NativeSelect
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.currentTarget.value as LeaveRequestStatus | 'ALL')}
                data={STATUS_OPTIONS}
              />
              <NativeSelect
                aria-label="Filter by leave type"
                value={leaveTypeFilter}
                onChange={(e) => setLeaveTypeFilter(e.currentTarget.value)}
                data={[
                  {value: 'ALL', label: 'All Leave Types'},
                  ...leaveTypes.map((type) => ({value: type.id, label: type.leaveName})),
                ]}
              />
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {leaveRequests.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-8 w-8" aria-hidden="true"/>}
              title="No Leave Requests"
              description="You haven't applied for any leaves yet"
            />
          ) : filteredLeaveRequests.length === 0 ? (
            <EmptyState
              icon={<Filter className="h-8 w-8" aria-hidden="true"/>}
              title="No Matching Requests"
              description="No leave requests match the selected filters"
              actionLabel="Clear Filters"
              onAction={clearFilters}
            />
          ) : (
            <div className="flex flex-col gap-4" role="list" aria-label="Leave requests">
              {filteredLeaveRequests.map((request) => (
                <LeaveRequestItem
                  key={request.id}
                  request={request}
                  leaveTypeName={getLeaveTypeName(request.leaveTypeId)}
                  onEdit={(r) => {
                    setEditingRequest(r);
                    setShowApplyModal(true);
                  }}
                  onCancel={setCancellingRequest}
                />
              ))}
            </div>
          )}
        </Card>
      </PageTransition>

      <LeaveRequestModal
        isOpen={showApplyModal}
        editingRequest={editingRequest}
        leaveTypes={leaveTypes}
        leaveBalances={leaveBalances}
        onClose={() => {
          setShowApplyModal(false);
          setEditingRequest(null);
        }}
        onSuccess={setSuccessMessage}
        onError={setError}
      />

      <ConfirmDialog
        isOpen={cancellingRequest !== null}
        onClose={() => setCancellingRequest(null)}
        onConfirm={confirmCancel}
        title="Cancel Leave Request"
        message={cancellingRequest
          ? `Are you sure you want to cancel your ${getLeaveTypeName(cancellingRequest.leaveTypeId)} request for ${formatDate(cancellingRequest.startDate)} - ${formatDate(cancellingRequest.endDate)}?`
          : ''}
        confirmText="Cancel Request"
        cancelText="Keep Request"
        type="danger"
        loading={cancelLeaveRequest.isPending}
        reason={{
          label: 'Reason for cancellation',
          placeholder: 'Please provide a reason for cancelling this leave request...',
          required: true,
        }}
      />

      {encashBalance && (
        <EncashModal
          balance={encashBalance}
          leaveTypeName={leaveTypes.find((lt) => lt.id === encashBalance.leaveTypeId)?.leaveName}
          onClose={() => setEncashBalance(null)}
          onDone={() => setEncashBalance(null)}
        />
      )}
    </AppLayout>
  );
}
