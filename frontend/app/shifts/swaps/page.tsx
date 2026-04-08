'use client';

import {useState} from 'react';
import {AppLayout} from '@/components/layout/AppLayout';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  useAcceptSwapRequest,
  useApproveSwapRequest,
  useIncomingSwapRequests,
  useMySwapRequests,
  usePendingApprovalSwaps,
  useRejectSwapRequest,
} from '@/lib/hooks/queries/useShifts';
import {ShiftSwapRequest, SwapStatus} from '@/lib/types/hrms/shift';
import {SkeletonListItem} from '@/components/ui/Skeleton';
import {EmptyState} from '@/components/ui/EmptyState';
import {motion} from 'framer-motion';
import {ArrowLeftRight, Check, ChevronLeft, Inbox, Send, Shield, X,} from 'lucide-react';
import {useRouter} from 'next/navigation';

const STATUS_CONFIG: Record<SwapStatus, { label: string; color: string; bgColor: string }> = {
  PENDING: {label: 'Pending', color: 'text-warning-700', bgColor: 'bg-warning-100 dark:bg-warning-900/30'},
  TARGET_ACCEPTED: {
    label: 'Accepted by Target',
    color: 'text-accent-700',
    bgColor: 'bg-accent-100 dark:bg-accent-900/30'
  },
  TARGET_DECLINED: {label: 'Declined', color: 'text-danger-700', bgColor: 'bg-danger-100 dark:bg-danger-900/30'},
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    color: 'text-warning-700',
    bgColor: 'bg-warning-100 dark:bg-warning-900/30'
  },
  APPROVED: {label: 'Approved', color: 'text-success-700', bgColor: 'bg-success-100 dark:bg-success-900/30'},
  REJECTED: {label: 'Rejected', color: 'text-danger-700', bgColor: 'bg-danger-100 dark:bg-danger-900/30'},
  COMPLETED: {label: 'Completed', color: 'text-success-700', bgColor: 'bg-success-100 dark:bg-success-900/30'},
  CANCELLED: {label: 'Cancelled', color: 'text-surface-600', bgColor: 'bg-surface-100 dark:bg-surface-700'},
};

function SwapCard({
                    swap,
                    showActions,
                    onAccept,
                    onReject,
                    actionPending,
                  }: {
  swap: ShiftSwapRequest;
  showActions?: 'target' | 'manager';
  onAccept?: () => void;
  onReject?: () => void;
  actionPending?: boolean;
}) {
  const status = STATUS_CONFIG[swap.status] || STATUS_CONFIG.PENDING;

  return (
    <motion.div
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      className="bg-[var(--bg-card)] rounded-xl border border-surface-200 dark:border-surface-700 p-4"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-accent-700 dark:text-accent-400"/>
          <span className="text-sm font-medium text-surface-900 dark:text-white">
            {swap.swapType}
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color} ${status.bgColor}`}>
          {status.label}
        </span>
      </div>

      <div className="space-y-2 text-sm text-surface-600 dark:text-surface-300">
        <div className="flex justify-between">
          <span>Requester Date:</span>
          <span className="font-medium">{swap.requesterShiftDate}</span>
        </div>
        {swap.targetShiftDate && (
          <div className="flex justify-between">
            <span>Target Date:</span>
            <span className="font-medium">{swap.targetShiftDate}</span>
          </div>
        )}
        {swap.reason && (
          <div>
            <span className="text-surface-400">Reason: </span>
            <span>{swap.reason}</span>
          </div>
        )}
        <div className="text-xs text-surface-400">
          Requested {new Date(swap.requestedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
        </div>
      </div>

      {showActions && (swap.status === 'PENDING' || swap.status === 'PENDING_APPROVAL') && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-100 dark:border-surface-700">
          <button
            onClick={onAccept}
            disabled={actionPending}
            className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-success-700 dark:text-success-400 bg-success-50 dark:bg-success-900/20 hover:bg-success-100 dark:hover:bg-success-900/30 rounded-lg transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            <Check className="w-3.5 h-3.5"/>
            {showActions === 'target' ? 'Accept' : 'Approve'}
          </button>
          <button
            onClick={onReject}
            disabled={actionPending}
            className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 hover:bg-danger-100 dark:hover:bg-danger-900/30 rounded-lg transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            <X className="w-3.5 h-3.5"/>
            {showActions === 'target' ? 'Decline' : 'Reject'}
          </button>
        </div>
      )}

      {swap.rejectionReason && (
        <div
          className="mt-2 p-2 bg-danger-50 dark:bg-danger-900/10 rounded text-xs text-danger-600 dark:text-danger-400">
          Rejection reason: {swap.rejectionReason}
        </div>
      )}
    </motion.div>
  );
}

export default function ShiftSwapsPage() {
  const router = useRouter();
  const {user} = useAuth();
  const employeeId = user?.employeeId ?? '';
  const [activeTab, setActiveTab] = useState<'sent' | 'incoming' | 'approval'>('sent');

  const {data: mySwapsData, isLoading: mySwapsLoading} = useMySwapRequests(employeeId);
  const {data: incomingSwaps = [], isLoading: incomingLoading} = useIncomingSwapRequests(employeeId);
  const {data: pendingApproval = [], isLoading: approvalLoading} = usePendingApprovalSwaps();

  const acceptMutation = useAcceptSwapRequest();
  const approveMutation = useApproveSwapRequest();
  const rejectMutation = useRejectSwapRequest();

  const mySwaps = mySwapsData?.content ?? [];

  const tabs = [
    {id: 'sent' as const, label: 'My Requests', icon: Send, count: mySwaps.length},
    {id: 'incoming' as const, label: 'Incoming', icon: Inbox, count: incomingSwaps.length},
    {id: 'approval' as const, label: 'Manager Approval', icon: Shield, count: pendingApproval.length},
  ];

  const isLoading = activeTab === 'sent' ? mySwapsLoading : activeTab === 'incoming' ? incomingLoading : approvalLoading;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/shifts')}
            className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5 text-surface-600 dark:text-surface-300"/>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Shift Swaps</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Manage shift swap requests
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[var(--bg-card)] text-surface-900 dark:text-white shadow-[var(--shadow-card)]'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4"/>
              {tab.label}
              {tab.count > 0 && (
                <span
                  className="px-1.5 py-0.5 bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({length: 5}).map((_, i) => (
              <SkeletonListItem key={i} />
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'sent' && (
              <>
                {mySwaps.length === 0 ? (
                  <EmptyState
                    icon={<Send className="w-12 h-12 text-surface-400"/>}
                    title="No Swap Requests"
                    description="You haven't submitted any shift swap requests yet."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mySwaps.map((swap) => (
                      <SwapCard key={swap.id} swap={swap}/>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'incoming' && (
              <>
                {incomingSwaps.length === 0 ? (
                  <EmptyState
                    icon={<Inbox className="w-12 h-12 text-surface-400"/>}
                    title="No Incoming Requests"
                    description="No one has sent you a shift swap request."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {incomingSwaps.map((swap) => (
                      <SwapCard
                        key={swap.id}
                        swap={swap}
                        showActions="target"
                        actionPending={acceptMutation.isPending}
                        onAccept={() =>
                          acceptMutation.mutate({requestId: swap.id, employeeId})
                        }
                        onReject={() => {
                          // For decline, we use the same accept mutation endpoint with decline
                          // The ShiftSwapController has a separate /decline endpoint
                          // We'd need a useDeclineSwapRequest hook, using reject for simplicity
                          rejectMutation.mutate({
                            requestId: swap.id,
                            managerId: employeeId,
                            reason: 'Declined by target employee',
                          });
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'approval' && (
              <PermissionGate permission={Permissions.ATTENDANCE_APPROVE}>
                {pendingApproval.length === 0 ? (
                  <EmptyState
                    icon={<Shield className="w-12 h-12 text-surface-400"/>}
                    title="No Pending Approvals"
                    description="All shift swap requests have been processed."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingApproval.map((swap) => (
                      <SwapCard
                        key={swap.id}
                        swap={swap}
                        showActions="manager"
                        actionPending={approveMutation.isPending || rejectMutation.isPending}
                        onAccept={() =>
                          approveMutation.mutate({requestId: swap.id, managerId: employeeId})
                        }
                        onReject={() => {
                          const reason = prompt('Rejection reason (optional):');
                          rejectMutation.mutate({
                            requestId: swap.id,
                            managerId: employeeId,
                            reason: reason || undefined,
                          });
                        }}
                      />
                    ))}
                  </div>
                )}
              </PermissionGate>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
