'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@/lib/utils/logger';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Info,
  Send,
  TrendingUp,
  Eye,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  SkeletonStatCard,
  SkeletonTable,
} from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  usePendingRegularizations,
  useRequestRegularization,
  useApproveRegularization,
  useRejectRegularization,
} from '@/lib/hooks/queries/useAttendance';
import { AttendanceRecord } from '@/lib/types/attendance';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEmployee } from '@/lib/hooks/queries/useEmployees';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface RegularizationRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  attendanceDate: string;
  originalCheckIn?: string;
  originalCheckOut?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedOn: string;
  approvedBy?: string;
  approvedOn?: string;
  remarks?: string;
}

const QUICK_REASON_TEMPLATES = [
  'Forgot to check in',
  'Forgot to check out',
  'System error',
  'Was on client visit',
  'Biometric not working',
  'Network connectivity issue',
];

const regularizationFormSchema = z.object({
  attendanceDate: z.string().min(1, 'Attendance date is required'),
  requestedCheckIn: z.string().optional().default(''),
  requestedCheckOut: z.string().optional().default(''),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500, 'Reason must not exceed 500 characters'),
});

type RegularizationFormData = z.infer<typeof regularizationFormSchema>;

const rejectReasonSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500, 'Reason must not exceed 500 characters'),
});

type RejectReasonData = z.infer<typeof rejectReasonSchema>;

interface TimelineStep {
  step: number;
  label: string;
  completed: boolean;
  active: boolean;
}

function getTimelineSteps(step: number): TimelineStep[] {
  return [
    { step: 1, label: 'Select Date', completed: step > 1, active: step === 1 },
    { step: 2, label: 'Add Details', completed: step > 2, active: step === 2 },
    { step: 3, label: 'Provide Reason', completed: step > 3, active: step === 3 },
  ];
}

function calculateResolutionTime(requestedOn: string, approvedOn: string | undefined): string {
  if (!approvedOn) return '--';
  const diff = new Date(approvedOn).getTime() - new Date(requestedOn).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h`;
}

function formatRelativeTime(date: string): string {
  const now = new Date();
  const requestDate = new Date(date);
  const diffMs = now.getTime() - requestDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return requestDate.toLocaleDateString();
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RegularizationPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const { user } = useAuth();
  const { data: myEmployee } = useEmployee(user?.employeeId || '', !!user?.employeeId);
  const { hasPermission } = usePermissions();
  const canApprove = hasPermission('ATTENDANCE:APPROVE');
  const rejectMutation = useRejectRegularization();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [_requestToCancel, setRequestToCancel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my-requests' | 'team-requests'>('my-requests');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [requestToReject, setRequestToReject] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<RegularizationFormData>({
    resolver: zodResolver(regularizationFormSchema),
    defaultValues: {
      attendanceDate: '',
      requestedCheckIn: '',
      requestedCheckOut: '',
      reason: '',
    },
  });

  const {
    register: registerReject,
    handleSubmit: handleSubmitReject,
    formState: { errors: rejectErrors, isSubmitting: isRejectSubmitting },
    reset: resetReject,
    watch: watchReject,
  } = useForm<RejectReasonData>({
    resolver: zodResolver(rejectReasonSchema),
    defaultValues: {
      reason: '',
    },
  });

  const reasonValue = watch('reason');
  const rejectReasonValue = watchReject('reason');

  const { data: regularizationsData, isLoading: loading } = usePendingRegularizations(0, 50);
  const requestMutation = useRequestRegularization();

  // The hook returns AttendanceRecord[], filter for regularization-related ones
  const allRequests: RegularizationRequest[] = (regularizationsData?.content || [])
    .filter((record: AttendanceRecord) => record.regularizationRequested || record.isRegularization)
    .map((record: AttendanceRecord) => ({
      id: record.id,
      employeeId: record.employeeId,
      attendanceDate: record.attendanceDate,
      originalCheckIn: record.checkInTime,
      originalCheckOut: record.checkOutTime,
      reason: record.regularizationReason || '',
      status: record.regularizationApproved ? 'APPROVED' : (record.regularizationRequested ? 'PENDING' : 'REJECTED'),
      requestedOn: record.updatedAt,
      approvedBy: record.approvedBy,
      approvedOn: record.approvedAt,
      remarks: record.remarks,
    })) as RegularizationRequest[];

  // Filter requests based on selected status
  const filteredRequests = useMemo(() => {
    if (statusFilter === 'ALL') return allRequests;
    return allRequests.filter((r) => r.status === statusFilter);
  }, [allRequests, statusFilter]);

  // Sort by date (newest first)
  const sortedRequests = useMemo(() => {
    return [...filteredRequests].sort(
      (a, b) => new Date(b.requestedOn).getTime() - new Date(a.requestedOn).getTime()
    );
  }, [filteredRequests]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      pending: allRequests.filter((r) => r.status === 'PENDING').length,
      approved: allRequests.filter((r) => r.status === 'APPROVED').length,
      rejected: allRequests.filter((r) => r.status === 'REJECTED').length,
      avgResolutionTime: (() => {
        const resolved = allRequests.filter((r) => r.status === 'APPROVED' && r.approvedOn);
        if (resolved.length === 0) return 0;
        const totalMs = resolved.reduce((sum, r) => {
          return sum + (new Date(r.approvedOn!).getTime() - new Date(r.requestedOn).getTime());
        }, 0);
        return Math.floor(totalMs / resolved.length / (1000 * 60 * 60)); // hours
      })(),
    };
  }, [allRequests]);

  const onSubmit = async (data: RegularizationFormData) => {
    try {
      await requestMutation.mutateAsync({
        id: data.attendanceDate,
        data: {
          reason: data.reason,
        },
      });

      success('Regularization request submitted successfully!');
      setShowCreateModal(false);
      setFormStep(1);
      reset();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const displayMsg = errorMsg || 'Failed to submit regularization request. Please try again.';
      error(displayMsg);
      logger.error('Failed to submit request:', err);
    }
  };

  const onRejectSubmit = async (data: RejectReasonData) => {
    if (!requestToReject) return;
    try {
      await rejectMutation.mutateAsync({
        id: requestToReject,
        reason: data.reason,
      });

      success('Regularization request rejected successfully!');
      setShowRejectModal(false);
      setRequestToReject(null);
      resetReject();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const displayMsg = errorMsg || 'Failed to reject regularization request. Please try again.';
      error(displayMsg);
      logger.error('Failed to reject request:', err);
    }
  };

  const handleAddQuickReason = (template: string) => {
    setValue('reason', template);
  };

  const handleNextStep = () => {
    if (formStep < 3) {
      setFormStep((formStep + 1) as 1 | 2 | 3);
    }
  };

  const handlePrevStep = () => {
    if (formStep > 1) {
      setFormStep((formStep - 1) as 1 | 2 | 3);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'badge-status status-success';
      case 'PENDING':
        return 'badge-status status-warning';
      case 'REJECTED':
        return 'badge-status status-danger';
      default:
        return 'badge-status status-neutral';
    }
  };

  return (
    <AppLayout activeMenuItem="attendance">
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Header with Breadcrumb */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => router.push('/attendance')}
              className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Attendance
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-page-title">Attendance Regularization</h1>
              <p className="text-[var(--text-muted)] mt-2">
                Request corrections for your attendance records
              </p>
            </div>
            <Button
              onClick={() => {
                setShowCreateModal(true);
                setFormStep(1);
                reset();
              }}
              className="bg-primary-500 hover:bg-primary-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Request Regularization
            </Button>
          </div>
        </div>


        {/* Info Banner */}
        <Card className="card-aura tint-info border-[var(--status-info-border)]">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-[var(--status-info-text)]" />
              <div className="text-sm text-[var(--status-info-text)]">
                <p className="font-semibold mb-1">About Attendance Regularization</p>
                <p>
                  If you forgot to check in/out or need to correct your attendance, you can submit a regularization request.
                  Your manager will review and approve/reject the request.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards with Skeleton Loading */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Pending Card */}
            <Card className="card-aura">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start gap-4">
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-[var(--status-warning-bg)] flex items-center justify-center flex-shrink-0"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <Clock className="h-6 w-6 text-[var(--status-warning-text)]" />
                  </motion.div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase font-medium">Pending</p>
                    <motion.p
                      className="text-stat-large"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    >
                      {stats.pending}
                    </motion.p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Approved Card */}
            <Card className="card-aura">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start gap-4">
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-[var(--status-success-bg)] flex items-center justify-center flex-shrink-0"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.25, ease: 'easeOut', delay: 0.05 }}
                  >
                    <CheckCircle className="h-6 w-6 text-[var(--status-success-text)]" />
                  </motion.div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase font-medium">Approved</p>
                    <motion.p
                      className="text-stat-large"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      {stats.approved}
                    </motion.p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rejected Card */}
            <Card className="card-aura">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start gap-4">
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-[var(--status-danger-bg)] flex items-center justify-center flex-shrink-0"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
                  >
                    <XCircle className="h-6 w-6 text-[var(--status-danger-text)]" />
                  </motion.div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase font-medium">Rejected</p>
                    <motion.p
                      className="text-stat-large"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      {stats.rejected}
                    </motion.p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avg Resolution Card */}
            <Card className="card-aura">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start gap-4">
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-[var(--status-info-bg)] flex items-center justify-center flex-shrink-0"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.25, ease: 'easeOut', delay: 0.15 }}
                  >
                    <TrendingUp className="h-6 w-6 text-[var(--status-info-text)]" />
                  </motion.div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase font-medium">Avg Resolution</p>
                    <motion.p
                      className="text-stat-large"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      {stats.avgResolutionTime > 0 ? `${stats.avgResolutionTime}h` : '--'}
                    </motion.p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* View Tabs - My Requests vs Team Requests */}
        <div className="flex items-center gap-1 border-b border-[var(--border-main)]">
          <motion.button
            onClick={() => setActiveTab('my-requests')}
            className="relative px-4 py-3 text-sm font-medium transition-colors"
            whileHover={{ y: -1 }}
            whileTap={{ y: 0 }}
          >
            <span
              className={
                activeTab === 'my-requests'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }
            >
              My Requests
            </span>
            {activeTab === 'my-requests' && (
              <motion.div
                layoutId="viewTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </motion.button>
          {canApprove && (
            <motion.button
              onClick={() => setActiveTab('team-requests')}
              className="relative px-4 py-3 text-sm font-medium transition-colors"
              whileHover={{ y: -1 }}
              whileTap={{ y: 0 }}
            >
              <span
                className={
                  activeTab === 'team-requests'
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }
              >
                Team Requests
              </span>
              {activeTab === 'team-requests' && (
                <motion.div
                  layoutId="viewTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </motion.button>
          )}
        </div>

        {/* My Requests View */}
        {activeTab === 'my-requests' && (
          <>
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 border-b border-[var(--border-main)]">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
                <motion.button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className="relative px-4 py-3 text-sm font-medium transition-colors"
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 0 }}
                >
                  <span
                    className={
                      statusFilter === tab
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }
                  >
                    {tab}
                  </span>
                  {statusFilter === tab && (
                    <motion.div
                      layoutId="tabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>

            {/* Requests Table/List */}
            <Card className="card-aura">
              <CardHeader>
                <CardTitle className="text-section-title">
                  Your Regularization Requests
                </CardTitle>
              </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <SkeletonTable rows={5} columns={6} />
            ) : sortedRequests.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck className="h-6 w-6" />}
                iconColor="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                title={statusFilter === 'ALL' ? 'No requests yet' : `No ${statusFilter.toLowerCase()} requests`}
                description={
                  statusFilter === 'ALL'
                    ? 'Submit a regularization request to correct your attendance records'
                    : `You don't have any ${statusFilter.toLowerCase()} regularization requests`
                }
                actionLabel="Submit Request"
                onAction={() => {
                  setShowCreateModal(true);
                  setFormStep(1);
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--bg-secondary)]/50">
                    <tr>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Date
                      </th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Original Time
                      </th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Requested
                      </th>
                      <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-main)]">
                    <AnimatePresence>
                      {sortedRequests.map((request: RegularizationRequest) => (
                        <motion.tr
                          key={request.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="hover:bg-[var(--bg-secondary)]/50 transition-colors"
                        >
                          <td className="px-4 md:px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                            {new Date(request.attendanceDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 text-sm text-[var(--text-secondary)]">
                            <div className="text-xs">
                              In: {request.originalCheckIn ? formatTime(request.originalCheckIn) : 'Not marked'}
                            </div>
                            <div className="text-xs">
                              Out: {request.originalCheckOut ? formatTime(request.originalCheckOut) : 'Not marked'}
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4 text-sm text-[var(--text-secondary)]">
                            <div className="max-w-xs truncate" title={request.reason}>
                              {request.reason}
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <span className={getStatusBadgeClass(request.status)}>
                              {request.status}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 text-sm text-[var(--text-secondary)]">
                            {formatRelativeTime(request.requestedOn)}
                          </td>
                          <td className="px-4 md:px-6 py-4 text-right">
                            <motion.button
                              onClick={() =>
                                setExpandedRequestId(expandedRequestId === request.id ? null : request.id)
                              }
                              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Eye className="h-4 w-4" />
                            </motion.button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>

                    {/* Expanded Detail Row */}
                    <AnimatePresence>
                      {sortedRequests.map((request: RegularizationRequest) =>
                        expandedRequestId === request.id ? (
                          <motion.tr
                            key={`${request.id}-detail`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                          >
                            <td colSpan={6} className="px-4 md:px-6 py-6 bg-[var(--bg-secondary)]/50 border-t border-[var(--border-main)]">
                              <RequestTimeline request={request} />
                            </td>
                          </motion.tr>
                        ) : null
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
            </Card>
          </>
        )}

        {/* Team Requests View */}
        {activeTab === 'team-requests' && canApprove && (
          <TeamRequestsView onReject={(id) => {
            setRequestToReject(id);
            setShowRejectModal(true);
          }} />
        )}
      </motion.div>

      {/* Create Request Modal with Backdrop */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCreateModal(false);
                reset();
              }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none"
            >
              <div className="card-aura rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl pointer-events-auto flex flex-col border-0">
                {/* Modal Header */}
                <div className="border-b border-[var(--border-main)] p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-card-title">
                      Request Attendance Regularization
                    </h2>
                    <motion.button
                      onClick={() => {
                        setShowCreateModal(false);
                        reset();
                      }}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-2xl leading-none transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      ×
                    </motion.button>
                  </div>

                  {/* Step Indicator with Connected Line */}
                  <div className="relative flex items-center gap-4">
                    {getTimelineSteps(formStep).map((step, index) => (
                      <div key={step.step} className="flex items-center flex-1">
                        <motion.div
                          className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            step.completed
                              ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] ring-2 ring-[var(--status-success-border)]'
                              : step.active
                                ? 'bg-primary-500 text-white ring-4 ring-primary-500/30'
                                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                          }`}
                          animate={step.active ? { scale: [1, 1.08, 1] } : {}}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          {step.completed ? '✓' : step.step}
                        </motion.div>
                        <div className="hidden sm:block ml-3">
                          <p
                            className={`text-xs font-semibold ${
                              step.active
                                ? 'text-primary-600 dark:text-primary-400'
                                : step.completed
                                  ? 'text-[var(--status-success-text)]'
                                  : 'text-[var(--text-muted)]'
                            }`}
                          >
                            {step.label}
                          </p>
                        </div>
                        {index < 2 && (
                          <div
                            className={`absolute h-0.5 transition-colors ${
                              step.completed ? 'bg-[var(--status-success-bg)]' : 'bg-[var(--border-main)]'
                            }`}
                            style={{
                              width: 'calc(100% - 40px - 2rem)',
                              left: 'calc(20px + 1rem)',
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6">
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <AnimatePresence mode="wait">
                      {/* Step 1: Select Date */}
                      {formStep === 1 && (
                        <motion.div
                          key="step-1"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="space-y-4"
                        >
                          <div>
                            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">
                              Which date do you want to regularize? <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              {...register('attendanceDate')}
                              max={new Date().toISOString().split('T')[0]}
                              className="input-aura w-full px-4 py-2.5"
                            />
                            {errors.attendanceDate && (
                              <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-red-500 text-sm mt-2"
                              >
                                {errors.attendanceDate.message}
                              </motion.p>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* Step 2: Add Details */}
                      {formStep === 2 && (
                        <motion.div
                          key="step-2"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">
                                Check In Time
                              </label>
                              <input
                                type="time"
                                {...register('requestedCheckIn')}
                                className="input-aura w-full px-4 py-2.5"
                              />
                              {errors.requestedCheckIn && (
                                <motion.p
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="text-red-500 text-xs mt-2"
                                >
                                  {errors.requestedCheckIn.message}
                                </motion.p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">
                                Check Out Time
                              </label>
                              <input
                                type="time"
                                {...register('requestedCheckOut')}
                                className="input-aura w-full px-4 py-2.5"
                              />
                              {errors.requestedCheckOut && (
                                <motion.p
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="text-red-500 text-xs mt-2"
                                >
                                  {errors.requestedCheckOut.message}
                                </motion.p>
                              )}
                            </div>
                          </div>
                          <div className="card-aura tint-info border-[var(--status-info-border)] p-4">
                            <p className="text-xs text-[var(--status-info-text)]">
                              <span className="font-semibold">Tip:</span> Provide the times you were actually present. Leave blank if only the status needs correction.
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 3: Provide Reason */}
                      {formStep === 3 && (
                        <motion.div
                          key="step-3"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="space-y-4"
                        >
                          {/* Manager Info */}
                          <Card className="card-aura tint-info border-[var(--status-info-border)]">
                            <CardContent className="p-4">
                              <div className="flex gap-4">
                                <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-[var(--status-info-text)]" />
                                <div className="text-sm text-[var(--status-info-text)]">
                                  <p className="font-semibold mb-1">Approval Routing</p>
                                  <p>
                                    This request will be sent to <span className="font-medium">{myEmployee?.managerName || 'your reporting manager'}</span> for approval. HR Managers and Admins can also approve requests.
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <div>
                            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">
                              Why do you need this regularization? <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              {...register('reason')}
                              rows={4}
                              className="input-aura w-full px-4 py-3"
                              placeholder="Please explain why you need attendance regularization..."
                            />
                            <div className="flex items-center justify-between mt-2">
                              {errors.reason && (
                                <motion.p
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="text-red-500 text-sm"
                                >
                                  {errors.reason.message}
                                </motion.p>
                              )}
                              <p
                                className={`text-xs ml-auto font-medium ${
                                  reasonValue.length > 450
                                    ? 'text-red-500'
                                    : reasonValue.length > 400
                                      ? 'text-yellow-600 dark:text-yellow-400'
                                      : 'text-[var(--text-muted)]'
                                }`}
                              >
                                {reasonValue.length}/500
                              </p>
                            </div>
                          </div>

                          {/* Quick Templates */}
                          <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-3 uppercase tracking-wide">
                              Quick Templates
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {QUICK_REASON_TEMPLATES.map((template) => (
                                <motion.button
                                  key={template}
                                  type="button"
                                  onClick={() => handleAddQuickReason(template)}
                                  whileHover={{ scale: 1.05, y: -1 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="px-3 py-2 text-xs font-medium border border-[var(--border-main)] rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
                                >
                                  {template}
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                </div>

                {/* Footer with Buttons */}
                <div className="border-t border-[var(--border-main)] p-6 bg-[var(--bg-secondary)]/20">
                  <div className="flex gap-4">
                    <motion.div className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (formStep > 1) {
                            handlePrevStep();
                          } else {
                            setShowCreateModal(false);
                            reset();
                          }
                        }}
                        className="w-full border-[var(--border-main)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                      >
                        {formStep === 1 ? 'Cancel' : 'Back'}
                      </Button>
                    </motion.div>
                    <motion.div className="flex-1">
                      {formStep < 3 ? (
                        <Button
                          type="button"
                          onClick={handleNextStep}
                          className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium"
                        >
                          Next
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={requestMutation.isPending || isSubmitting}
                          onClick={handleSubmit(onSubmit)}
                          className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {requestMutation.isPending || isSubmitting ? 'Submitting...' : 'Submit Request'}
                        </Button>
                      )}
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reject Request Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowRejectModal(false);
                resetReject();
              }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none"
            >
              <div className="card-aura rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl pointer-events-auto flex flex-col border-0">
                {/* Modal Header */}
                <div className="border-b border-[var(--border-main)] p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-card-title">
                      Reject Regularization Request
                    </h2>
                    <motion.button
                      onClick={() => {
                        setShowRejectModal(false);
                        resetReject();
                      }}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-2xl leading-none transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      ×
                    </motion.button>
                  </div>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <form onSubmit={handleSubmitReject(onRejectSubmit)}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">
                          Reason for Rejection <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          {...registerReject('reason')}
                          rows={4}
                          className="input-aura w-full px-4 py-3"
                          placeholder="Please explain why you are rejecting this regularization request..."
                        />
                        <div className="flex items-center justify-between mt-2">
                          {rejectErrors.reason && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-red-500 text-sm"
                            >
                              {rejectErrors.reason.message}
                            </motion.p>
                          )}
                          <p
                            className={`text-xs ml-auto font-medium ${
                              rejectReasonValue.length > 450
                                ? 'text-red-500'
                                : rejectReasonValue.length > 400
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-[var(--text-muted)]'
                            }`}
                          >
                            {rejectReasonValue.length}/500
                          </p>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Footer with Buttons */}
                <div className="border-t border-[var(--border-main)] p-6 bg-[var(--bg-secondary)]/20">
                  <div className="flex gap-4">
                    <motion.div className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowRejectModal(false);
                          resetReject();
                        }}
                        className="w-full border-[var(--border-main)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                      >
                        Cancel
                      </Button>
                    </motion.div>
                    <motion.div className="flex-1">
                      <Button
                        type="submit"
                        disabled={rejectMutation.isPending || isRejectSubmitting}
                        onClick={handleSubmitReject(onRejectSubmit)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        {rejectMutation.isPending || isRejectSubmitting ? 'Rejecting...' : 'Reject Request'}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={cancelConfirmOpen}
        onClose={() => {
          setCancelConfirmOpen(false);
          setRequestToCancel(null);
        }}
        onConfirm={() => {
          // Handle cancel logic here
          setCancelConfirmOpen(false);
          setRequestToCancel(null);
        }}
        title="Cancel Request"
        message="Are you sure you want to cancel this regularization request? This action cannot be undone."
        confirmText="Cancel Request"
        cancelText="Keep Request"
        type="warning"
      />
    </AppLayout>
  );
}

// TeamRequestsView Component
interface TeamRequestsViewProps {
  onReject: (id: string) => void;
}

function TeamRequestsView({ onReject }: TeamRequestsViewProps) {
  const approveMutation = useApproveRegularization();
  const { success, error } = useToast();
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  const { data: pendingTeamRequests, isLoading } = usePendingRegularizations(0, 50);

  // Convert to RegularizationRequest format
  const teamRequests: RegularizationRequest[] = (pendingTeamRequests?.content || [])
    .filter((record: AttendanceRecord) => record.regularizationRequested && !record.regularizationApproved)
    .map((record: AttendanceRecord) => ({
      id: record.id,
      employeeId: record.employeeId,
      attendanceDate: record.attendanceDate,
      originalCheckIn: record.checkInTime,
      originalCheckOut: record.checkOutTime,
      reason: record.regularizationReason || '',
      status: 'PENDING' as const,
      requestedOn: record.updatedAt,
      approvedBy: record.approvedBy,
      approvedOn: record.approvedAt,
      remarks: record.remarks,
    })) as RegularizationRequest[];

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
      success('Regularization request approved successfully!');
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const displayMsg = errorMsg || 'Failed to approve regularization request. Please try again.';
      error(displayMsg);
      logger.error('Failed to approve request:', err);
    }
  };

  return (
    <Card className="card-aura">
      <CardHeader>
        <CardTitle className="text-section-title">
          Pending Regularization Requests from Team
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <SkeletonTable rows={5} columns={6} />
        ) : teamRequests.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="h-6 w-6" />}
            iconColor="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
            title="No pending requests"
            description="All regularization requests from your team have been processed"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-secondary)]/50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Date
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Requested On
                  </th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                <AnimatePresence>
                  {teamRequests.map((request: RegularizationRequest) => (
                    <motion.tr
                      key={request.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="hover:bg-[var(--bg-secondary)]/50 transition-colors"
                    >
                      <td className="px-4 md:px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                        {request.employeeId}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                        {new Date(request.attendanceDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 text-sm text-[var(--text-secondary)]">
                        <div className="max-w-xs truncate" title={request.reason}>
                          {request.reason}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {formatRelativeTime(request.requestedOn)}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <motion.button
                            onClick={() => handleApprove(request.id)}
                            disabled={approveMutation.isPending}
                            className="p-2 rounded-lg hover:bg-[var(--status-success-bg)]/20 transition-colors text-[var(--status-success-text)] disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Approve"
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </motion.button>
                          <motion.button
                            onClick={() => onReject(request.id)}
                            className="p-2 rounded-lg hover:bg-[var(--status-danger-bg)]/20 transition-colors text-[var(--status-danger-text)]"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Reject"
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </motion.button>
                          <motion.button
                            onClick={() =>
                              setExpandedRequestId(expandedRequestId === request.id ? null : request.id)
                            }
                            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Eye className="h-4 w-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>

                {/* Expanded Detail Row */}
                <AnimatePresence>
                  {teamRequests.map((request: RegularizationRequest) =>
                    expandedRequestId === request.id ? (
                      <motion.tr
                        key={`${request.id}-detail`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                      >
                        <td colSpan={5} className="px-4 md:px-6 py-6 bg-[var(--bg-secondary)]/50 border-t border-[var(--border-main)]">
                          <RequestTimeline request={request} />
                        </td>
                      </motion.tr>
                    ) : null
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// RequestTimeline Component
interface RequestTimelineProps {
  request: RegularizationRequest;
}

function RequestTimeline({ request }: RequestTimelineProps) {
  type TimelineStatus = 'completed' | 'active' | 'pending' | 'failed';

  const getStatusColor = (status: TimelineStatus): string => {
    switch (status) {
      case 'completed':
        return 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] ring-2 ring-[var(--status-success-border)]';
      case 'active':
        return 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] ring-4 ring-[var(--status-info-border)]';
      case 'failed':
        return 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] ring-2 ring-[var(--status-danger-border)]';
      case 'pending':
        return 'bg-[var(--bg-secondary)] text-[var(--text-muted)]';
    }
  };

  const resolveStatus = (): TimelineStatus => {
    if (request.status === 'PENDING') {
      return 'pending';
    } else if (request.status === 'APPROVED') {
      return 'completed';
    } else {
      return 'failed';
    }
  };

  const getTimelineIcon = (index: number): React.ReactNode => {
    if (index === 0) return <Send className="h-5 w-5" />;
    if (index === 1) return <Clock className="h-5 w-5" />;
    if (request.status === 'APPROVED') return <CheckCircle className="h-5 w-5" />;
    if (request.status === 'REJECTED') return <XCircle className="h-5 w-5" />;
    return <Clock className="h-5 w-5" />;
  };

  const timelineSteps: Array<{
    label: string;
    date: string;
    status: TimelineStatus;
  }> = [
    {
      label: 'Submitted',
      date: request.requestedOn,
      status: 'completed',
    },
    {
      label: 'Under Review',
      date: request.requestedOn,
      status: request.status === 'PENDING' ? 'active' : 'completed',
    },
    {
      label: request.status === 'APPROVED' ? 'Approved' : request.status === 'REJECTED' ? 'Rejected' : 'Pending',
      date: request.approvedOn || request.requestedOn,
      status: resolveStatus(),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-[var(--status-success-text)] to-[var(--border-main)]" />

        {/* Timeline steps */}
        <div className="space-y-6">
          {timelineSteps.map((step, index) => {
            const isActive = step.status === 'active';

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: index * 0.1 }}
                className="relative flex items-start gap-4 pl-16"
              >
                {/* Timeline dot */}
                <motion.div
                  className={`absolute left-0 w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(step.status)}`}
                  animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
                >
                  {getTimelineIcon(index)}
                </motion.div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-card-title">{step.label}</h4>
                    <span className="text-xs text-[var(--text-muted)] whitespace-nowrap font-medium">
                      {new Date(step.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Additional info */}
                  {index === 2 && request.status !== 'PENDING' && (
                    <div className="mt-2 space-y-1">
                      {request.approvedBy && (
                        <p className="text-sm text-[var(--text-secondary)]">
                          Reviewed by: <span className="font-medium">{request.approvedBy}</span>
                        </p>
                      )}
                      {request.remarks && (
                        <p className="text-sm text-[var(--text-secondary)]">
                          Remarks: <span className="font-medium">{request.remarks}</span>
                        </p>
                      )}
                      {request.approvedOn && request.requestedOn && (
                        <p className="text-sm text-[var(--text-secondary)]">
                          Resolution time:{' '}
                          <span className="font-medium">
                            {calculateResolutionTime(request.requestedOn, request.approvedOn)}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {index === 0 && (
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      For {new Date(request.attendanceDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Request Details Section */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="card-aura p-4 bg-[var(--bg-secondary)]/30">
          <p className="text-xs text-[var(--text-muted)] uppercase font-semibold tracking-wide mb-2">Reason</p>
          <p className="text-sm text-[var(--text-secondary)] line-clamp-3">{request.reason}</p>
        </div>
        <div className="card-aura p-4 bg-[var(--bg-secondary)]/30">
          <p className="text-xs text-[var(--text-muted)] uppercase font-semibold tracking-wide mb-2">Original Times</p>
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="font-medium">In:</span> {request.originalCheckIn ? formatTime(request.originalCheckIn) : 'Not marked'}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="font-medium">Out:</span> {request.originalCheckOut ? formatTime(request.originalCheckOut) : 'Not marked'}
          </p>
        </div>
      </div>
    </div>
  );
}
