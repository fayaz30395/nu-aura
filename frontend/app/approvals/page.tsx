'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useApprovalInbox, useApproveExecution, useRejectExecution } from '@/lib/hooks/queries/useApprovals';
import type { ApprovalInboxItem, InboxFilterParams } from '@/lib/hooks/queries/useApprovals';
import { useToast } from '@/components/ui/Toast';
import {
  CheckCircle,
  Clock,
  XCircle,
  Search,
  AlertCircle,
} from 'lucide-react';

const PAGE_SIZE = 20;

interface TabConfig {
  key: string;
  label: string;
  status?: string;
  icon: React.ReactNode;
  color: string;
}

const TAB_CONFIGS: TabConfig[] = [
  {
    key: 'pending',
    label: 'Pending',
    status: 'PENDING',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'approved',
    label: 'Approved',
    status: 'APPROVED',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    status: 'REJECTED',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600 dark:text-red-400',
  },
];

function getStatusConfig(status: string) {
  switch (status) {
    case 'PENDING':
      return {
        bg: 'badge-status status-warning',
        text: '',
        icon: Clock,
      };
    case 'APPROVED':
      return {
        bg: 'badge-status status-success',
        text: '',
        icon: CheckCircle,
      };
    case 'REJECTED':
      return {
        bg: 'badge-status status-danger',
        text: '',
        icon: XCircle,
      };
    default:
      return {
        bg: 'badge-status status-neutral',
        text: '',
        icon: AlertCircle,
      };
  }
}

function ApprovalCard({ approval, onApprove, onReject, isLoading }: {
  approval: ApprovalInboxItem;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  isLoading: boolean;
}) {
  const statusConfig = getStatusConfig(approval.status);
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border border-[var(--border-main)] hover:border-primary-400 transition-colors skeuo-card">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {approval.status}
                </div>
                <span className="text-xs text-[var(--text-muted)]">{approval.module}</span>
              </div>
              <h3 className="font-medium text-[var(--text-primary)] truncate mb-1">
                {approval.title}
              </h3>
              <div className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                {approval.requesterName && (
                  <p>Requested by: <span className="font-medium">{approval.requesterName}</span></p>
                )}
                {approval.currentStepName && (
                  <p>Current Step: <span className="font-medium">{approval.currentStepName}</span></p>
                )}
                {approval.submittedAt && (
                  <p>Submitted: <span className="font-medium">{new Date(approval.submittedAt).toLocaleDateString()}</span></p>
                )}
              </div>
            </div>

            {approval.status === 'PENDING' && (
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  onClick={() => onApprove(approval.id)}
                  isLoading={isLoading}
                  className="btn-primary h-9 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                >
                  Approve
                </Button>
                <Button
                  onClick={() => onReject(approval.id)}
                  isLoading={isLoading}
                  className="btn-secondary h-9 px-3 text-xs bg-red-600 hover:bg-red-700 text-white border-0"
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ApprovalsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Build filter params based on active tab
  const filterParams = useMemo<InboxFilterParams>(() => {
    const activeTabConfig = TAB_CONFIGS.find(t => t.key === activeTab);
    return {
      status: activeTabConfig?.status,
      search: search || undefined,
      page,
      size: PAGE_SIZE,
    };
  }, [activeTab, search, page]);

  // Fetch approvals with React Query
  const { data: approvalsData, isLoading, error } = useApprovalInbox(filterParams);
  const approveMutation = useApproveExecution();
  const rejectMutation = useRejectExecution();

  const approvals = approvalsData?.content ?? [];
  const totalElements = approvalsData?.totalElements ?? 0;
  const totalPages = approvalsData?.totalPages ?? 0;

  const handleApprove = useCallback(async (id: string) => {
    try {
      await approveMutation.mutateAsync({ executionId: id });
      toast.success('Approval submitted successfully');
    } catch (_err) {
      toast.error('Failed to approve');
    }
  }, [approveMutation, toast]);

  const handleReject = useCallback(async (id: string) => {
    try {
      await rejectMutation.mutateAsync({ executionId: id });
      toast.success('Rejection submitted successfully');
    } catch (_err) {
      toast.error('Failed to reject');
    }
  }, [rejectMutation, toast]);

  const isProcessing = approveMutation.isPending || rejectMutation.isPending;

  // Loading state
  if (isLoading) {
    return (
      <AppLayout activeMenuItem="approvals">
        <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-4 w-96 rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AppLayout activeMenuItem="approvals">
        <div className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto">
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200">Error Loading Approvals</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error instanceof Error ? error.message : 'Failed to load approvals'}
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="approvals">
      <motion.div
        className="space-y-6 p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] skeuo-emboss">Approvals</h1>
          <p className="text-[var(--text-muted)] mt-1 skeuo-deboss">Review and manage pending approvals</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--border-main)] overflow-x-auto pb-0">
          {TAB_CONFIGS.map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(0);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-primary-600 dark:text-primary-400 border-primary-600 dark:border-primary-400'
                  : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search approvals..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 skeuo-input"
          />
        </div>

        {/* Approvals List */}
        {approvals.length > 0 ? (
          <>
            <div className="space-y-3">
              {approvals.map(approval => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isLoading={isProcessing}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-[var(--border-main)]">
                <p className="text-sm text-[var(--text-muted)]">
                  Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="h-8 px-3 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="h-8 px-3 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={<Clock className="h-12 w-12" />}
            title={activeTab === 'pending' ? 'No Pending Approvals' : 'No Approvals'}
            description={activeTab === 'pending'
              ? 'You have completed all pending approvals. Great job!'
              : `No ${activeTab} approvals to display.`
            }
          />
        )}
      </motion.div>
    </AppLayout>
  );
}
