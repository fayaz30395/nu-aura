'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {motion} from 'framer-motion';
import {logger} from '@/lib/utils/logger';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {ArrowLeft, Info, Plus} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {useToast} from '@/components/ui/Toast';
import {
  usePendingRegularizations,
  useRejectRegularization,
  useRequestRegularization,
} from '@/lib/hooks/queries/useAttendance';
import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {useAuth} from '@/lib/hooks/useAuth';
import {useEmployee} from '@/lib/hooks/queries/useEmployees';
import {usePermissions} from '@/lib/hooks/usePermissions';
import type {RegularizationFormData, RegularizationRequest, RejectReasonData} from './_components';
import {
  CreateRequestModal,
  RegularizationStatsCards,
  RejectRequestModal,
  RequestsTable,
  StatusFilterTabs,
  TeamRequestsView,
  ViewTabs,
} from './_components';

// ---------------------------------------------------------------------------
// Zod schemas (kept here so page owns the validation contract)
// ---------------------------------------------------------------------------
const regularizationFormSchema = z.object({
  attendanceDate: z.string().min(1, 'Attendance date is required'),
  requestedCheckIn: z.string().optional().default(''),
  requestedCheckOut: z.string().optional().default(''),
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason must not exceed 500 characters'),
});

const rejectReasonSchema = z.object({
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason must not exceed 500 characters'),
});

export default function RegularizationPage() {
  const router = useRouter();
  const {success, error} = useToast();
  const {user} = useAuth();
  const {data: myEmployee} = useEmployee(user?.employeeId || '', !!user?.employeeId);
  const {hasPermission} = usePermissions();
  const canApprove = hasPermission('ATTENDANCE:APPROVE');
  const rejectMutation = useRejectRegularization();

  // ---------------------------------------------------------------------------
  // Modal / UI state
  // ---------------------------------------------------------------------------
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [_requestToCancel, setRequestToCancel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my-requests' | 'team-requests'>('my-requests');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [requestToReject, setRequestToReject] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Forms
  // ---------------------------------------------------------------------------
  const {
    register,
    handleSubmit,
    formState: {errors, isSubmitting},
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
    formState: {errors: rejectErrors, isSubmitting: isRejectSubmitting},
    reset: resetReject,
    watch: watchReject,
  } = useForm<RejectReasonData>({
    resolver: zodResolver(rejectReasonSchema),
    defaultValues: {reason: ''},
  });

  const reasonValue = watch('reason');
  const rejectReasonValue = watchReject('reason');

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------
  const {data: regularizationsData, isLoading: loading} = usePendingRegularizations(0, 50);
  const requestMutation = useRequestRegularization();

  const allRequests: RegularizationRequest[] = (regularizationsData?.content || [])
    .filter((record: AttendanceRecord) => record.regularizationRequested || record.isRegularization)
    .map((record: AttendanceRecord) => ({
      id: record.id,
      employeeId: record.employeeId,
      attendanceDate: record.attendanceDate,
      originalCheckIn: record.checkInTime,
      originalCheckOut: record.checkOutTime,
      reason: record.regularizationReason || '',
      status: record.regularizationApproved
        ? 'APPROVED'
        : record.regularizationRequested
          ? 'PENDING'
          : 'REJECTED',
      requestedOn: record.updatedAt,
      approvedBy: record.approvedBy,
      approvedOn: record.approvedAt,
      remarks: record.remarks,
    })) as RegularizationRequest[];

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'ALL') return allRequests;
    return allRequests.filter((r) => r.status === statusFilter);
  }, [allRequests, statusFilter]);

  const sortedRequests = useMemo(
    () =>
      [...filteredRequests].sort(
        (a, b) => new Date(b.requestedOn).getTime() - new Date(a.requestedOn).getTime()
      ),
    [filteredRequests]
  );

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
        return Math.floor(totalMs / resolved.length / (1000 * 60 * 60));
      })(),
    };
  }, [allRequests]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const onSubmit = async (data: RegularizationFormData) => {
    try {
      await requestMutation.mutateAsync({
        id: data.attendanceDate,
        data: {reason: data.reason},
      });
      success('Regularization request submitted successfully!');
      setShowCreateModal(false);
      setFormStep(1);
      reset();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      error(errorMsg || 'Failed to submit regularization request. Please try again.');
      logger.error('Failed to submit request:', err);
    }
  };

  const onRejectSubmit = async (data: RejectReasonData) => {
    if (!requestToReject) return;
    try {
      await rejectMutation.mutateAsync({id: requestToReject, reason: data.reason});
      success('Regularization request rejected successfully!');
      setShowRejectModal(false);
      setRequestToReject(null);
      resetReject();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      error(errorMsg || 'Failed to reject regularization request. Please try again.');
      logger.error('Failed to reject request:', err);
    }
  };

  const handleOpenCreate = () => {
    setShowCreateModal(true);
    setFormStep(1);
    reset();
  };

  const handleCloseCreate = () => {
    setShowCreateModal(false);
    reset();
  };

  const handleOpenReject = (id: string) => {
    setRequestToReject(id);
    setShowRejectModal(true);
  };

  const handleCloseReject = () => {
    setShowRejectModal(false);
    resetReject();
  };

  const handleNextStep = () => {
    if (formStep < 3) setFormStep((formStep + 1) as 1 | 2 | 3);
  };

  const handlePrevStep = () => {
    if (formStep > 1) setFormStep((formStep - 1) as 1 | 2 | 3);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <AppLayout activeMenuItem="attendance">
      <motion.div
        className="space-y-8"
        initial={{opacity: 0, y: 12}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.25, ease: 'easeOut'}}
      >
        {/* Header with Breadcrumb */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => router.push('/attendance')}
              className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4"/>
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
            <Button onClick={handleOpenCreate} className="bg-accent-500 hover:bg-accent-700 text-white">
              <Plus className="h-4 w-4 mr-2"/>
              Request Regularization
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="card-aura tint-info border-[var(--status-info-border)]">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-[var(--status-info-text)]"/>
              <div className="text-sm text-[var(--status-info-text)]">
                <p className="font-semibold mb-1">About Attendance Regularization</p>
                <p>
                  If you forgot to check in/out or need to correct your attendance, you can submit a
                  regularization request. Your manager will review and approve/reject the request.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Stats Cards */}
        <RegularizationStatsCards stats={stats} loading={loading}/>

        {/* My Requests / Team Requests tab switcher */}
        <ViewTabs activeTab={activeTab} onTabChange={setActiveTab} canApprove={canApprove}/>

        {/* My Requests View */}
        {activeTab === 'my-requests' && (
          <>
            <StatusFilterTabs statusFilter={statusFilter} onFilterChange={setStatusFilter}/>
            <RequestsTable
              requests={sortedRequests}
              loading={loading}
              statusFilter={statusFilter}
              onNewRequest={handleOpenCreate}
            />
          </>
        )}

        {/* Team Requests View */}
        {activeTab === 'team-requests' && canApprove && (
          <TeamRequestsView onReject={handleOpenReject}/>
        )}
      </motion.div>

      {/* Create Request Modal */}
      <CreateRequestModal
        open={showCreateModal}
        formStep={formStep}
        register={register}
        errors={errors}
        isSubmitting={isSubmitting}
        isPending={requestMutation.isPending}
        reasonValue={reasonValue}
        managerName={myEmployee?.managerName}
        onClose={handleCloseCreate}
        onNext={handleNextStep}
        onPrev={handlePrevStep}
        onSubmit={onSubmit}
        onQuickReason={(template) => setValue('reason', template)}
        handleSubmit={handleSubmit}
      />

      {/* Reject Request Modal */}
      <RejectRequestModal
        open={showRejectModal}
        register={registerReject}
        errors={rejectErrors}
        isSubmitting={isRejectSubmitting}
        isPending={rejectMutation.isPending}
        rejectReasonValue={rejectReasonValue}
        onClose={handleCloseReject}
        onSubmit={onRejectSubmit}
        handleSubmit={handleSubmitReject}
      />

      {/* Cancel Confirm Dialog */}
      <ConfirmDialog
        isOpen={cancelConfirmOpen}
        onClose={() => {
          setCancelConfirmOpen(false);
          setRequestToCancel(null);
        }}
        onConfirm={() => {
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
