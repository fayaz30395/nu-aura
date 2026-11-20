'use client';

import {useMemo, useState} from 'react';
import {logger} from '@/lib/utils/logger';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Plus} from 'lucide-react';
import {Button, Tabs} from '@mantine/core';
import {AppLayout} from '@/components/layout';
import {Callout} from '@/components/ui/Callout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {ListPageSkeleton} from '@/components/ui/skeletons';
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
  WorkRequestsPanel,
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
  const [section, setSection] = useState<'wfh' | 'regularization' | 'remote'>('wfh');
  const [activeTab, setActiveTab] = useState<'my-requests' | 'team-requests'>('my-requests');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [requestToReject, setRequestToReject] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Forms
  // ---------------------------------------------------------------------------
  const {
    register,
    control,
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
  const regularizationsQuery = usePendingRegularizations(0, 50, canApprove);
  const regularizationsData = regularizationsQuery.data;
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

  return (
    <AppLayout activeMenuItem="attendance">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Attendance Requests"
          description="Work from home, on duty, regularization and remote clock-in requests"
          breadcrumbs={[{label: 'Attendance', href: '/attendance'}, {label: 'Requests'}]}
          actions={
            section === 'regularization' ? (
              <Button leftSection={<Plus size={16} aria-hidden/>} onClick={handleOpenCreate}>
                Request Regularization
              </Button>
            ) : undefined
          }
        />

        <Tabs value={section} onChange={(v) => v && setSection(v as typeof section)}>
          <Tabs.List>
            <Tabs.Tab aria-controls={null as unknown as undefined} value="wfh">Work From Home / On Duty</Tabs.Tab>
            <Tabs.Tab aria-controls={null as unknown as undefined} value="regularization">Regularization</Tabs.Tab>
            <Tabs.Tab aria-controls={null as unknown as undefined} value="remote">Remote Clock-in</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {section === 'wfh' && (
          <WorkRequestsPanel
            types={['WORK_FROM_HOME', 'ON_DUTY']}
            title="Work From Home / On Duty Requests"
            canApprove={canApprove}
          />
        )}
        {section === 'remote' && (
          <WorkRequestsPanel types={['REMOTE_CLOCK_IN']} title="Remote Clock-in Requests" canApprove={canApprove}/>
        )}

        {section === 'regularization' && <Callout tone="info" title="About attendance regularization">
          If you forgot to check in/out or need to correct your attendance, you can submit a regularization
          request. Your manager will review and approve/reject the request.
        </Callout>}

        {section === 'regularization' && (
          <ViewTabs activeTab={activeTab} onTabChange={setActiveTab} canApprove={canApprove}/>
        )}

        {section === 'regularization' && activeTab === 'my-requests' && (
          <QueryState
            query={regularizationsQuery}
            skeleton={<ListPageSkeleton rows={5} columns={5} showHeader={false} showFilters/>}
            errorTitle="Couldn't load regularization requests"
          >
            {() => (
              <div className="flex flex-col gap-6">
                <RegularizationStatsCards stats={stats}/>
                <div>
                  <StatusFilterTabs statusFilter={statusFilter} onFilterChange={setStatusFilter}/>
                </div>
                <RequestsTable requests={sortedRequests} statusFilter={statusFilter} onNewRequest={handleOpenCreate}/>
              </div>
            )}
          </QueryState>
        )}

        {section === 'regularization' && activeTab === 'team-requests' && canApprove && <TeamRequestsView onReject={handleOpenReject}/>}
      </div>

      <CreateRequestModal
        open={showCreateModal}
        formStep={formStep}
        register={register}
        control={control}
        errors={errors}
        isSubmitting={isSubmitting}
        isPending={requestMutation.isPending}
        reasonValue={reasonValue}
        managerName={myEmployee?.managerName}
        onClose={handleCloseCreate}
        onNext={handleNextStep}
        onPrev={handlePrevStep}
        onSubmit={onSubmit}
        onQuickReason={(template) => setValue('reason', template, {shouldValidate: true})}
        handleSubmit={handleSubmit}
      />

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
    </AppLayout>
  );
}
