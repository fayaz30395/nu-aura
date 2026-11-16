'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button, Tabs} from '@mantine/core';
import {ArrowLeftRight, PlusCircle} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {EmptyState} from '@/components/ui/EmptyState';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {TablePagination} from '@/components/ui';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {ShiftSwapAction, ShiftSwapRequest, ShiftSwapTab} from './_components/types';
import {ShiftSwapTable} from './_components/ShiftSwapTable';
import {ShiftSwapRequestModal} from './_components/ShiftSwapRequestModal';
import {useShiftSwapAction, useShiftSwapLists} from './_hooks/useShiftSwaps';

const TABS: {value: ShiftSwapTab; label: string}[] = [
  {value: 'my', label: 'My Requests'},
  {value: 'incoming', label: 'Incoming Requests'},
  {value: 'approval', label: 'Pending Approval'},
];

const CONFIRM_COPY: Partial<Record<ShiftSwapAction, {title: string; message: string; confirmText: string}>> = {
  cancel: {
    title: 'Cancel shift swap request?',
    message: 'The request will be withdrawn and the other employee will no longer see it.',
    confirmText: 'Cancel request',
  },
  decline: {
    title: 'Decline shift swap request?',
    message: 'The requester will be notified that you declined.',
    confirmText: 'Decline',
  },
  reject: {
    title: 'Reject shift swap request?',
    message: 'The swap will not take place and both employees will be notified.',
    confirmText: 'Reject',
  },
};

interface PendingConfirm {
  req: ShiftSwapRequest;
  action: ShiftSwapAction;
}

const BREADCRUMBS = [
  {label: 'Attendance', href: '/attendance'},
  {label: 'Shift Swap'},
];

export default function ShiftSwapPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ShiftSwapTab>('my');
  const [myPage, setMyPage] = useState(0);
  const [myPageSize, setMyPageSize] = useState(20);
  const [showModal, setShowModal] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const {isAuthenticated, hasHydrated, user} = useAuth();
  const employeeId = user?.employeeId;
  const {hasAnyPermission, isReady} = usePermissions();
  const hasShiftSwapAccess = hasAnyPermission(
    Permissions.ATTENDANCE_VIEW_SELF,
    Permissions.ATTENDANCE_VIEW_ALL,
    Permissions.SHIFT_VIEW,
    Permissions.ATTENDANCE_MANAGE,
  );

  // Kept: the /attendance/shift-swap route config gates on REGULARIZE/APPROVE, not these permissions.
  useEffect(() => {
    if (!hasHydrated || !isReady) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    if (!hasShiftSwapAccess) {
      router.replace('/me/dashboard?denied=1');
    }
  }, [hasHydrated, isReady, isAuthenticated, hasShiftSwapAccess, router]);

  const {my, incoming, approval} = useShiftSwapLists(employeeId, activeTab, myPage, myPageSize);
  const actionMutation = useShiftSwapAction();

  const ready = hasHydrated && isReady && isAuthenticated && hasShiftSwapAccess && !!employeeId;

  const runAction = (req: ShiftSwapRequest, action: ShiftSwapAction) => {
    if (!employeeId) return;
    const payload: Record<string, string> =
      action === 'approve'
        ? {managerId: employeeId}
        : action === 'reject'
          ? {managerId: employeeId, reason: ''}
          : {employeeId};
    return actionMutation.mutateAsync({id: req.id, action, payload});
  };

  const handleAction = (req: ShiftSwapRequest, action: ShiftSwapAction) => {
    if (CONFIRM_COPY[action]) {
      setPendingConfirm({req, action});
      return;
    }
    runAction(req, action)?.catch(() => undefined);
  };

  const handleConfirm = async () => {
    if (!pendingConfirm) return;
    try {
      await runAction(pendingConfirm.req, pendingConfirm.action);
      setPendingConfirm(null);
    } catch {
      // Error toast is raised by the mutation; keep the dialog open for retry.
    }
  };

  const emptyState = (
    <EmptyState
      icon={<ArrowLeftRight className="h-full w-full"/>}
      title="No shift swap requests"
      description={
        activeTab === 'my'
          ? 'Swap, give away, or pick up a shift by creating a request.'
          : activeTab === 'incoming'
            ? 'Nobody has asked to swap a shift with you.'
            : 'There are no swap requests waiting for your approval.'
      }
      actionLabel={activeTab === 'my' ? 'New request' : undefined}
      onAction={activeTab === 'my' ? () => setShowModal(true) : undefined}
      size="compact"
    />
  );

  const table = (rows: ShiftSwapRequest[]) => (
    <ShiftSwapTable
      tab={activeTab}
      rows={rows}
      actionPending={actionMutation.isPending}
      onAction={handleAction}
      emptyState={emptyState}
    />
  );

  const confirmCopy = pendingConfirm ? CONFIRM_COPY[pendingConfirm.action] : undefined;

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <PageHeader
          title="Shift Swap"
          description="Request shift swaps, give-aways, and pick-ups"
          breadcrumbs={BREADCRUMBS}
          actions={
            ready ? (
              <Button leftSection={<PlusCircle size={16} aria-hidden/>} onClick={() => setShowModal(true)}>
                New Request
              </Button>
            ) : undefined
          }
        />

        {!ready ? (
          <ListPageSkeleton rows={5} columns={5} showHeader={false} showFilters={false}/>
        ) : (
          <Tabs
            value={activeTab}
            onChange={(v) => {
              if (!v) return;
              setActiveTab(v as ShiftSwapTab);
              setMyPage(0);
            }}
            keepMounted={false}
          >
            <Tabs.List>
              {TABS.map((t) => (
                <Tabs.Tab key={t.value} value={t.value}>{t.label}</Tabs.Tab>
              ))}
            </Tabs.List>

            <Tabs.Panel value="my" pt="md">
              <QueryState
                query={my}
                skeleton={<ListPageSkeleton rows={5} columns={5} showHeader={false} showFilters={false}/>}
                errorTitle="Couldn't load your shift swap requests"
              >
                {(data) => (
                  <div className="flex flex-col gap-4">
                    {table(data.content ?? [])}
                    {data.totalPages > 1 && (
                      <TablePagination
                        currentPage={myPage}
                        totalPages={data.totalPages}
                        totalItems={data.totalElements}
                        pageSize={myPageSize}
                        onPageChange={setMyPage}
                        onPageSizeChange={(s) => {
                          setMyPageSize(s);
                          setMyPage(0);
                        }}
                      />
                    )}
                  </div>
                )}
              </QueryState>
            </Tabs.Panel>

            <Tabs.Panel value="incoming" pt="md">
              <QueryState
                query={incoming}
                skeleton={<ListPageSkeleton rows={5} columns={5} showHeader={false} showFilters={false}/>}
                errorTitle="Couldn't load incoming requests"
              >
                {(data) => table(data ?? [])}
              </QueryState>
            </Tabs.Panel>

            <Tabs.Panel value="approval" pt="md">
              <QueryState
                query={approval}
                skeleton={<ListPageSkeleton rows={5} columns={5} showHeader={false} showFilters={false}/>}
                errorTitle="Couldn't load requests pending approval"
              >
                {(data) => table(data ?? [])}
              </QueryState>
            </Tabs.Panel>
          </Tabs>
        )}
      </div>

      {employeeId && (
        <ShiftSwapRequestModal opened={showModal} onClose={() => setShowModal(false)} employeeId={employeeId}/>
      )}

      <ConfirmDialog
        isOpen={!!pendingConfirm}
        onClose={() => setPendingConfirm(null)}
        onConfirm={handleConfirm}
        title={confirmCopy?.title ?? ''}
        message={confirmCopy?.message ?? ''}
        confirmText={confirmCopy?.confirmText}
        cancelText="Keep request"
        type="danger"
        loading={actionMutation.isPending}
      />
    </AppLayout>
  );
}
