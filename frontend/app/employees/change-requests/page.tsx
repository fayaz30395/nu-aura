'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Button, Group} from '@mantine/core';
import {ShieldAlert, User} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {useToast} from '@/components/notifications/ToastProvider';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {Callout} from '@/components/ui/Callout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {Stat} from '@/components/ui/Stat';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {employmentChangeRequestService} from '@/lib/services/hrms/employment-change-request.service';
import {ChangeRequestCard} from './_components/ChangeRequestCard';
import {RejectRequestModal} from './_components/RejectRequestModal';

const BREADCRUMBS = [{label: 'Employees', href: '/employees'}, {label: 'Change Requests'}];
const LIST_SKELETON = <ListPageSkeleton rows={5} columns={4} showHeader={false} showFilters={false}/>;

type RequestFilter = 'all' | 'pending';

export default function EmploymentChangeRequestsPage() {
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const {hasPermission, isPermissionReady: permissionsReady} = usePermissions();
  const canView = hasPermission(Permissions.EMPLOYMENT_CHANGE_VIEW_ALL);

  // DEF-44: Redirect unauthorized users — prevents change request data exposure
  useEffect(() => {
    if (!permissionsReady) return;
    if (!canView) {
      router.replace('/employees');
    }
  }, [permissionsReady, canView, router]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RequestFilter>('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [approveConfirm, setApproveConfirm] = useState<string | null>(null);

  const requestsQuery = useQuery({
    queryKey: ['change-requests', filter],
    queryFn: () =>
      filter === 'pending'
        ? employmentChangeRequestService.getPendingChangeRequests(0, 50)
        : employmentChangeRequestService.getAllChangeRequests(0, 50),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => employmentChangeRequestService.approveChangeRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['change-requests']});
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({id, reason}: {id: string; reason: string}) =>
      employmentChangeRequestService.rejectChangeRequest(id, {rejectionReason: reason}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['change-requests']});
    },
  });

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
      toast.success('Change request approved successfully. Employee details have been updated.');
      setApproveConfirm(null);
    } catch {
      // The global MutationCache handler shows the error toast.
    }
  };

  const closeRejectModal = () => {
    setShowRejectModal(null);
    setRejectionReason('');
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast.warning('Please provide a rejection reason');
      return;
    }
    try {
      await rejectMutation.mutateAsync({id, reason: rejectionReason});
      toast.success('Change request rejected');
      closeRejectModal();
    } catch {
      // The global MutationCache handler shows the error toast.
    }
  };

  if (!permissionsReady) {
    return (
      <AppLayout activeMenuItem="employees">
        {LIST_SKELETON}
      </AppLayout>
    );
  }

  // DEF-44: Don't render page content until permission is confirmed
  if (!canView) {
    return (
      <AppLayout activeMenuItem="employees">
        <Callout
          tone="neutral"
          icon={<ShieldAlert className="h-4 w-4" aria-hidden/>}
          title="Access check"
          action={
            <Button component={Link} href="/employees" variant="default" size="sm">
              Open employees
            </Button>
          }
        >
          You do not have access. Redirecting to employees.
        </Callout>
      </AppLayout>
    );
  }

  const actionsDisabled = approveMutation.isPending || rejectMutation.isPending;

  return (
    <AppLayout activeMenuItem="employees">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Employment Change Requests"
          description="Review and approve changes to employee designation, role, department and status."
          breadcrumbs={BREADCRUMBS}
          actions={
            <Group gap="xs" role="group" aria-label="Filter requests">
              <Button
                variant={filter === 'pending' ? 'filled' : 'default'}
                aria-pressed={filter === 'pending'}
                onClick={() => setFilter('pending')}
              >
                Pending
              </Button>
              <Button
                variant={filter === 'all' ? 'filled' : 'default'}
                aria-pressed={filter === 'all'}
                onClick={() => setFilter('all')}
              >
                All Requests
              </Button>
            </Group>
          }
        />

        <QueryState
          query={requestsQuery}
          skeleton={LIST_SKELETON}
          errorTitle="Couldn't load change requests"
          isEmpty={(data) => (data?.content ?? []).length === 0}
          empty={{
            icon: <User className="h-6 w-6"/>,
            title: filter === 'pending' ? 'No pending change requests' : 'No change requests found',
            description:
              filter === 'pending'
                ? 'Requests raised from employee edits will appear here for review.'
                : 'No employment change requests have been raised yet.',
            ...(filter === 'pending' ? {actionLabel: 'View all requests', onAction: () => setFilter('all')} : {}),
          }}
        >
          {(data) => {
            const requests = data?.content ?? [];
            return (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <Stat
                      size="compact"
                      tone={filter === 'pending' ? 'warning' : 'default'}
                      label={filter === 'pending' ? 'Pending Requests' : 'Total Requests'}
                      value={requests.length}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {requests.map((request) => (
                    <ChangeRequestCard
                      key={request.id}
                      request={request}
                      expanded={expandedId === request.id}
                      onToggle={() => setExpandedId(expandedId === request.id ? null : request.id)}
                      onApprove={() => setApproveConfirm(request.id)}
                      onReject={() => setShowRejectModal(request.id)}
                      actionsDisabled={actionsDisabled}
                      approvePending={approveMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            );
          }}
        </QueryState>
      </div>

      <RejectRequestModal
        isOpen={!!showRejectModal}
        reason={rejectionReason}
        onReasonChange={setRejectionReason}
        onClose={closeRejectModal}
        onConfirm={() => showRejectModal && handleReject(showRejectModal)}
        pending={rejectMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!approveConfirm}
        onClose={() => setApproveConfirm(null)}
        onConfirm={async () => {
          if (approveConfirm) {
            await handleApprove(approveConfirm);
          }
        }}
        title="Approve Change Request"
        message="Are you sure you want to approve this change request? The employee details will be updated accordingly."
        confirmText="Approve"
        type="info"
        loading={approveMutation.isPending}
      />
    </AppLayout>
  );
}
