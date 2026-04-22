'use client';

import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  AlertCircle,
  Ban,
  Banknote,
  Calendar,
  CheckCircle,
  Clock,
  Edit3,
  FileText,
  Filter,
  Plus,
  Send,
  User,
  X,
  XCircle,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  useActiveLeaveTypes,
  useCancelLeaveRequest,
  useCreateLeaveRequest,
  useEmployeeBalances,
  useEmployeeLeaveRequests,
  useRequestLeaveEncashment,
  useUpdateLeaveRequest
} from '@/lib/hooks/queries/useLeaves';
import {LeaveBalance, LeaveRequest, LeaveRequestRequest, LeaveRequestStatus,} from '@/lib/types/hrms/leave';
import {createLogger} from '@/lib/utils/logger';

const leaveFormSchema = z.object({
  leaveTypeId: z.string().min(1, 'Please select a leave type'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isHalfDay: z.boolean().default(false),
  reason: z.string().min(1, 'Reason is required').max(1000, 'Reason must not exceed 1000 characters'),
});

type LeaveFormData = z.infer<typeof leaveFormSchema>;

const log = createLogger('LeavesPage');

const cancelFormSchema = z.object({
  reason: z.string().min(1, 'Please provide a reason for cancellation'),
});

type CancelFormData = z.infer<typeof cancelFormSchema>;

export default function MyLeavesPage() {
  const router = useRouter();
  const {user, isAuthenticated, hasHydrated} = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Leave request submitted successfully!');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState<LeaveRequest | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | 'ALL'>('ALL');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('ALL');

  // Leave form
  const {
    register: registerLeave,
    handleSubmit: handleLeaveSubmit,
    watch: watchLeave,
    formState: {errors: leaveErrors, isSubmitting: leaveSubmitting},
    reset: resetLeave
  } = useForm<LeaveFormData>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      leaveTypeId: '',
      startDate: '',
      endDate: '',
      isHalfDay: false,
      reason: '',
    },
  });

  // Cancel form
  const {
    register: registerCancel,
    handleSubmit: handleCancelSubmit,
    formState: {errors: cancelErrors, isSubmitting: cancelSubmitting},
    reset: resetCancel
  } = useForm<CancelFormData>({
    resolver: zodResolver(cancelFormSchema),
    defaultValues: {
      reason: '',
    },
  });

  const {
    data: leaveRequestsData,
    isError: isLeaveRequestsError,
    error: leaveRequestsError
  } = useEmployeeLeaveRequests(user?.employeeId || '', 0, 100, Boolean(hasHydrated && user?.employeeId));
  const {
    data: balancesData = [],
    isError: _isBalancesError
  } = useEmployeeBalances(user?.employeeId || '', Boolean(hasHydrated && user?.employeeId));
  const {data: leaveTypesData = []} = useActiveLeaveTypes(Boolean(hasHydrated && isAuthenticated));
  const createLeaveRequest = useCreateLeaveRequest();
  const updateLeaveRequest = useUpdateLeaveRequest();
  const cancelLeaveRequest = useCancelLeaveRequest();
  const encashmentMutation = useRequestLeaveEncashment();

  // Encashment state
  const [showEncashModal, setShowEncashModal] = useState(false);
  const [encashBalance, setEncashBalance] = useState<LeaveBalance | null>(null);
  const [encashDays, setEncashDays] = useState<number>(0);
  const [encashReason, setEncashReason] = useState('');

  const leaveRequests = Array.isArray(leaveRequestsData?.content) ? leaveRequestsData.content : (Array.isArray(leaveRequestsData) ? leaveRequestsData : []);
  const leaveTypes = Array.isArray(leaveTypesData) ? leaveTypesData : [];
  const leaveBalances = Array.isArray(balancesData) ? balancesData : [];
  const isLoading = !leaveRequestsData && !isLeaveRequestsError;

  useEffect(() => {
    // Wait for auth store to hydrate before checking authentication
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
    } else if (user && !user.employeeId) {
      // User is authenticated but doesn't have an employee record
      setError('No employee profile found for your account. Please contact your administrator.');
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  const startDate = watchLeave('startDate');
  const endDate = watchLeave('endDate');
  const isHalfDay = watchLeave('isHalfDay');

  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isHalfDay ? 0.5 : diffDays;
  };

  const onLeaveSubmit = async (data: LeaveFormData) => {
    try {
      const totalDays = calculateDays();
      const leaveRequestData: LeaveRequestRequest = {
        employeeId: user!.employeeId!,
        leaveTypeId: data.leaveTypeId,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays,
        isHalfDay: data.isHalfDay,
        reason: data.reason,
      };

      if (editingRequest) {
        await updateLeaveRequest.mutateAsync({
          id: editingRequest.id,
          data: leaveRequestData,
        });
        setSuccessMessage('Leave request updated successfully!');
      } else {
        await createLeaveRequest.mutateAsync(leaveRequestData);
        setSuccessMessage('Leave request submitted successfully!');
      }

      setSuccess(true);
      setShowApplyModal(false);
      setEditingRequest(null);
      resetLeave();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      log.error('Failed to submit leave request:', err);
      setError((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to submit leave request');
    }
  };

  const handleEdit = (request: LeaveRequest) => {
    setEditingRequest(request);
    resetLeave({
      leaveTypeId: request.leaveTypeId,
      startDate: request.startDate,
      endDate: request.endDate,
      isHalfDay: request.isHalfDay,
      reason: request.reason,
    });
    setShowApplyModal(true);
  };

  const handleCloseModal = () => {
    setShowApplyModal(false);
    setEditingRequest(null);
    resetLeave();
  };

  const handleCancelClick = (request: LeaveRequest) => {
    setCancellingRequest(request);
    resetCancel();
    setShowCancelModal(true);
  };

  const onCancelSubmit = async (data: CancelFormData) => {
    if (!cancellingRequest) return;

    try {
      await cancelLeaveRequest.mutateAsync({id: cancellingRequest.id, reason: data.reason});
      setSuccessMessage('Leave request cancelled successfully!');
      setSuccess(true);
      setShowCancelModal(false);
      setCancellingRequest(null);
      resetCancel();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      log.error('Failed to cancel leave request:', err);
      setError((err as {
        response?: { data?: { message?: string } }
      })?.response?.data?.message || 'Failed to cancel leave request');
    }
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setCancellingRequest(null);
    resetCancel();
  };

  const getStatusColor = (status: LeaveRequestStatus) => {
    switch (status) {
      case 'APPROVED':
        return 'badge-status status-success';
      case 'REJECTED':
        return 'badge-status status-danger';
      case 'CANCELLED':
        return 'badge-status status-neutral';
      default:
        return 'badge-status status-warning';
    }
  };

  const getStatusIcon = (status: LeaveRequestStatus) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4"/>;
      case 'REJECTED':
        return <XCircle className="h-4 w-4"/>;
      default:
        return <Clock className="h-4 w-4"/>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getLeaveTypeName = (leaveTypeId: string) => {
    const leaveType = leaveTypes.find((lt) => lt.id === leaveTypeId);
    return leaveType?.leaveName || 'Unknown';
  };

  // Filter leave requests based on selected filters
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

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="leaves">
        <div className="flex items-center justify-center min-h-[400px]">
          <div
            className='w-12 h-12 border-4 border-[var(--accent-primary)] border-t-accent-700 rounded-full animate-spin'/>
        </div>
      </AppLayout>
    );
  }

  if (isLeaveRequestsError) {
    const is403 = (leaveRequestsError as { response?: { status?: number } })?.response?.status === 403;
    return (
      <AppLayout activeMenuItem="leaves">
        <div className="text-center py-12">
          <AlertCircle className='h-16 w-16 mx-auto text-status-warning-text mb-4'/>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            {is403 ? 'Access Restricted' : 'Unable to Load Leave Data'}
          </h2>
          <p className="text-[var(--text-muted)] max-w-md mx-auto">
            {is403
              ? 'You don\'t have permission to view leave requests. Please contact your administrator to grant leave management access.'
              : 'There was an error loading your leave data. Please try refreshing the page or contact support if the issue persists.'}
          </p>
        </div>
      </AppLayout>
    );
  }

  if (!user?.employeeId) {
    return (
      <AppLayout activeMenuItem="leaves">
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 mx-auto text-[var(--text-muted)] mb-4"/>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No Employee Profile Linked</h2>
          <p className="text-[var(--text-muted)] max-w-md mx-auto">
            Leave management requires an employee profile. Use the admin panels to manage employee leaves.
          </p>
          <button
            onClick={() => router.push('/leave')}
            className='mt-6 px-4 py-2 bg-accent text-inverse rounded-lg hover:bg-accent transition-colors'
          >
            View Leave Management
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="leaves">
      <div className="space-y-6">
        {/* Header */}
        <div className="row-between">
          <div>
            <h1 className="text-xl font-bold skeuo-emboss">My Leaves</h1>
            <p className="text-[var(--text-secondary)] mt-1 skeuo-deboss">
              Manage your leave requests and balances
            </p>
          </div>
          <button
            onClick={() => setShowApplyModal(true)}
            className='flex items-center gap-2 px-4 py-2 bg-accent text-inverse rounded-lg hover:bg-accent transition-colors skeuo-button'
          >
            <Plus className="h-4 w-4"/>
            Apply for Leave
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div
            className='flex items-center gap-2 p-4 bg-status-success-bg border border-status-success-border rounded-lg animate-in fade-in slide-in-from-top-2 duration-300'>
            <CheckCircle className='h-5 w-5 text-status-success-text'/>
            <p className='text-status-success-text font-medium'>
              {successMessage}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            className='flex items-center gap-2 p-4 bg-status-danger-bg border border-status-danger-border rounded-lg animate-in fade-in slide-in-from-top-2 duration-300'>
            <AlertCircle className='h-5 w-5 text-status-danger-text'/>
            <p className='text-status-danger-text font-medium'>{error}</p>
          </div>
        )}

        {/* Leave Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {leaveBalances.map((balance) => {
            const leaveType = leaveTypes.find((lt) => lt.id === balance.leaveTypeId);
            const isEncashable = leaveType?.isEncashable && balance.available > 0;
            return (
              <Card key={balance.id} className="skeuo-card">
                <CardContent className="pt-6">
                  <div className="row-between mb-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{backgroundColor: `${leaveType?.colorCode || '#6b7280'}20`}}
                    >
                      <Calendar
                        className="h-6 w-6"
                        style={{color: leaveType?.colorCode || '#6b7280'}}
                      />
                    </div>
                    {isEncashable && (
                      <button
                        onClick={() => {
                          setEncashBalance(balance);
                          setEncashDays(1);
                          setEncashReason('');
                          setShowEncashModal(true);
                        }}
                        className='flex items-center gap-1 px-2 py-1 text-xs font-medium text-status-success-text bg-status-success-bg border border-status-success-border rounded-md hover:bg-status-success-bg transition-colors'
                        title="Encash available leaves"
                      >
                        <Banknote className="h-3 w-3"/>
                        Encash
                      </button>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    {leaveType?.leaveName || 'Unknown'}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Available</span>
                      <span className='font-semibold text-status-success-text skeuo-emboss'>
                        {balance.available}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Used</span>
                      <span className="font-semibold text-[var(--text-primary)] skeuo-emboss">
                        {balance.used}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Pending</span>
                      <span className='font-semibold text-status-warning-text skeuo-emboss'>
                        {balance.pending}
                      </span>
                    </div>
                    {balance.encashed > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">Encashed</span>
                        <span className='font-semibold text-status-success-text skeuo-emboss'>
                          {balance.encashed}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="h-2 bg-[var(--border-main)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-accent-500 to-accent-700 rounded-full transition-all"
                        style={{
                          width: `${Math.min((balance.used / (balance.used + balance.available)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Leave Requests */}
        <Card className="skeuo-card">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 skeuo-emboss">
                  <FileText className="h-5 w-5"/>
                  Leave History
                </CardTitle>
                <CardDescription>
                  Your past and current leave requests
                  {hasActiveFilters && (
                    <span className='ml-2 text-accent'>
                      ({filteredLeaveRequests.length} of {leaveRequests.length})
                    </span>
                  )}
                </CardDescription>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-[var(--text-muted)]"/>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as LeaveRequestStatus | 'ALL')}
                    className='input-aura px-4 py-1.5 text-sm rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-[var(--accent-primary)]'
                  >
                    <option value="ALL">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <select
                  value={leaveTypeFilter}
                  onChange={(e) => setLeaveTypeFilter(e.target.value)}
                  className='input-aura px-4 py-1.5 text-sm rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-[var(--accent-primary)]'
                >
                  <option value="ALL">All Leave Types</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.leaveName}
                    </option>
                  ))}
                </select>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-1.5 text-body-secondary hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {leaveRequests.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto text-[var(--text-muted)] mb-4"/>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  No Leave Requests
                </h3>
                <p className="text-[var(--text-secondary)]">
                  You haven&apos;t applied for any leaves yet
                </p>
              </div>
            ) : filteredLeaveRequests.length === 0 ? (
              <div className="text-center py-12">
                <Filter className="h-16 w-16 mx-auto text-[var(--text-muted)] mb-4"/>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  No Matching Requests
                </h3>
                <p className="text-[var(--text-secondary)]">
                  No leave requests match the selected filters
                </p>
                <button
                  onClick={clearFilters}
                  className='mt-4 px-4 py-2 text-sm text-accent hover:text-accent hover:bg-accent-subtle rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLeaveRequests.map((request) => (
                  <div
                    key={request.id}
                    className="card-aura p-6 rounded-lg hover:shadow-[var(--shadow-elevated)] transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                            {getLeaveTypeName(request.leaveTypeId)}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {getStatusIcon(request.status)}
                            {request.status}
                          </span>
                        </div>
                        <div className="meta-row">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4"/>
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4"/>
                            {request.totalDays} {request.totalDays === 1 ? 'day' : 'days'}
                            {request.isHalfDay && ' (Half Day)'}
                          </div>
                        </div>
                        <p className="text-body-secondary mt-2">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </p>
                        {/* Approver Info for PENDING */}
                        {request.status === 'PENDING' && request.pendingApproverName && (
                          <div className="flex items-center gap-2 mt-4 text-sm">
                            <User className='h-4 w-4 text-accent'/>
                            <span className="text-[var(--text-secondary)]">
                              Pending approval from:{' '}
                              <span className='font-medium text-accent'>
                                {request.pendingApproverName}
                              </span>
                            </span>
                          </div>
                        )}
                        {(request.status === 'APPROVED' || request.status === 'REJECTED') && request.approverName && (
                          <div className="flex items-center gap-2 mt-4 text-sm">
                            <User className="h-4 w-4 text-[var(--text-muted)]"/>
                            <span className="text-[var(--text-secondary)]">
                              {request.status === 'APPROVED' ? 'Approved' : 'Rejected'} by:{' '}
                              <span className="font-medium text-[var(--text-primary)]">
                                {request.approverName}
                              </span>
                            </span>
                          </div>
                        )}
                        {request.rejectionReason && (
                          <p className='text-sm text-status-danger-text mt-2'>
                            <span className="font-medium">Rejection Reason:</span>{' '}
                            {request.rejectionReason}
                          </p>
                        )}
                        {request.cancellationReason && (
                          <p className="text-body-secondary mt-2">
                            <span className="font-medium">Cancellation Reason:</span>{' '}
                            {request.cancellationReason}
                          </p>
                        )}
                      </div>
                      {/* Actions for PENDING - top right */}
                      {request.status === 'PENDING' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(request)}
                            className='inline-flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-accent hover:text-accent bg-accent-subtle hover:bg-accent-subtle rounded-lg transition-colors'
                          >
                            <Edit3 className="h-3 w-3"/>
                            Edit
                          </button>
                          <button
                            onClick={() => handleCancelClick(request)}
                            className='inline-flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-status-danger-text hover:text-status-danger-text bg-status-danger-bg hover:bg-status-danger-bg rounded-lg transition-colors'
                          >
                            <Ban className="h-3 w-3"/>
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Applied on date - bottom right */}
                    <div className="flex justify-end mt-4 pt-4 border-t border-[var(--border-subtle)]">
                      <div className="text-right">
                        <p className="text-caption ">
                          Applied on {formatDate(request.appliedOn)}
                        </p>
                        {request.approvedOn && (
                          <p className="text-caption  mt-1">
                            {request.status === 'APPROVED' ? 'Approved' : 'Rejected'} on{' '}
                            {formatDate(request.approvedOn)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Apply/Edit Leave Modal */}
        {showApplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)]">
            <div
              className="w-full max-w-2xl bg-[var(--bg-card)] rounded-xl shadow-[var(--shadow-elevated)] animate-in fade-in zoom-in-95 duration-200 skeuo-card">
              <div className="row-between p-6 border-b border-[var(--border-main)]">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {editingRequest ? 'Edit Leave Request' : 'Apply for Leave'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  <X className="h-5 w-5"/>
                </button>
              </div>

              <form onSubmit={handleLeaveSubmit(onLeaveSubmit)} className="p-6 space-y-4">
                {/* Leave Type */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Leave Type *
                  </label>
                  <select
                    {...registerLeave('leaveTypeId')}
                    className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-accent-500 dark:bg-[var(--bg-surface)]"
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.leaveName}
                      </option>
                    ))}
                  </select>
                  {leaveErrors.leaveTypeId &&
                    <p className='text-status-danger-text text-sm mt-1'>{leaveErrors.leaveTypeId.message}</p>}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      {...registerLeave('startDate')}
                      className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-accent-500 dark:bg-[var(--bg-surface)]"
                    />
                    {leaveErrors.startDate &&
                      <p className='text-status-danger-text text-sm mt-1'>{leaveErrors.startDate.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      {...registerLeave('endDate')}
                      min={startDate}
                      className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-accent-500 dark:bg-[var(--bg-surface)]"
                    />
                    {leaveErrors.endDate &&
                      <p className='text-status-danger-text text-sm mt-1'>{leaveErrors.endDate.message}</p>}
                  </div>
                </div>

                {/* Half Day */}
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    id="halfDay"
                    {...registerLeave('isHalfDay')}
                    className='w-4 h-4 text-accent rounded focus:ring-accent-500'
                  />
                  <label
                    htmlFor="halfDay"
                    className="text-sm font-medium text-[var(--text-secondary)]"
                  >
                    This is a half-day leave
                  </label>
                </div>

                {/* Total Days */}
                <div className='p-4 bg-accent-subtle rounded-lg'>
                  <p className="text-body-secondary">
                    Total Days: <span className='font-bold text-accent'>{calculateDays()}</span>
                  </p>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Reason *
                  </label>
                  <textarea
                    {...registerLeave('reason')}
                    rows={4}
                    placeholder="Please provide a reason for your leave..."
                    className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-accent-500 dark:bg-[var(--bg-surface)]"
                  />
                  {leaveErrors.reason &&
                    <p className='text-status-danger-text text-sm mt-1'>{leaveErrors.reason.message}</p>}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={createLeaveRequest.isPending || updateLeaveRequest.isPending || leaveSubmitting}
                    className="px-6 py-2 border border-[var(--border-main)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLeaveRequest.isPending || updateLeaveRequest.isPending || leaveSubmitting}
                    className='flex items-center gap-2 px-6 py-2 bg-accent text-inverse rounded-lg hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                  >
                    {createLeaveRequest.isPending || updateLeaveRequest.isPending || leaveSubmitting ? (
                      <>
                        <div
                          className='w-4 h-4 border-2 border-[var(--bg-card)] border-t-transparent rounded-full animate-spin'/>
                        {editingRequest ? 'Updating...' : 'Submitting...'}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4"/>
                        {editingRequest ? 'Update Request' : 'Submit Request'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cancel Leave Modal */}
        {showCancelModal && cancellingRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)]">
            <div
              className="w-full max-w-md bg-[var(--bg-card)] rounded-xl shadow-[var(--shadow-elevated)] animate-in fade-in zoom-in-95 duration-200 skeuo-card">
              <div className="row-between p-6 border-b border-[var(--border-main)]">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Cancel Leave Request
                </h2>
                <button
                  onClick={handleCloseCancelModal}
                  className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  <X className="h-5 w-5"/>
                </button>
              </div>

              <form onSubmit={handleCancelSubmit(onCancelSubmit)} className="p-6 space-y-4">
                <div
                  className='p-4 bg-status-danger-bg border border-status-danger-border rounded-lg'>
                  <p className='text-sm text-status-danger-text'>
                    Are you sure you want to cancel your{' '}
                    <span className="font-semibold">{getLeaveTypeName(cancellingRequest.leaveTypeId)}</span>{' '}
                    request for{' '}
                    <span className="font-semibold">
                      {formatDate(cancellingRequest.startDate)} - {formatDate(cancellingRequest.endDate)}
                    </span>
                    ?
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Reason for cancellation *
                  </label>
                  <textarea
                    {...registerCancel('reason')}
                    rows={3}
                    placeholder="Please provide a reason for cancelling this leave request..."
                    className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-danger-500 dark:bg-[var(--bg-surface)]"
                  />
                  {cancelErrors.reason &&
                    <p className='text-status-danger-text text-sm mt-1'>{cancelErrors.reason.message}</p>}
                </div>

                <div className="flex items-center justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseCancelModal}
                    disabled={cancelLeaveRequest.isPending || cancelSubmitting}
                    className="px-6 py-2 border border-[var(--border-main)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    Keep Request
                  </button>
                  <button
                    type="submit"
                    disabled={cancelLeaveRequest.isPending || cancelSubmitting}
                    className='flex items-center gap-2 px-6 py-2 bg-status-danger-bg text-inverse rounded-lg hover:bg-status-danger-bg transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                  >
                    {cancelLeaveRequest.isPending || cancelSubmitting ? (
                      <>
                        <div
                          className='w-4 h-4 border-2 border-[var(--bg-card)] border-t-transparent rounded-full animate-spin'/>
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4"/>
                        Cancel Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Leave Encashment Modal */}
        {showEncashModal && encashBalance && (
          <div className="modal-backdrop">
            <div
              className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-xl max-w-md w-full shadow-[var(--shadow-dropdown)]">
              <div className="p-6 border-b border-[var(--border-main)]">
                <div className="row-between">
                  <div className="flex items-center gap-4">
                    <div className='p-2 bg-status-success-bg rounded-lg'>
                      <Banknote className='h-5 w-5 text-status-success-text'/>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                        Leave Encashment
                      </h2>
                      <p className="text-body-secondary">
                        Convert leave balance to salary payout
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEncashModal(false)}
                    className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <X className="h-5 w-5 text-[var(--text-muted)]"/>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Balance Summary */}
                <div
                  className='p-4 bg-status-success-bg border border-status-success-border rounded-lg'>
                  <div className="row-between mb-2">
                    <span className='text-sm font-medium text-status-success-text'>
                      {leaveTypes.find((lt) => lt.id === encashBalance.leaveTypeId)?.leaveName || 'Leave Type'}
                    </span>
                    <span className='text-lg font-bold text-status-success-text'>
                      {encashBalance.available} days available
                    </span>
                  </div>
                  {encashBalance.encashed > 0 && (
                    <p className='text-xs text-status-success-text'>
                      Previously encashed: {encashBalance.encashed} days
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Days to Encash *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={encashBalance.available}
                    value={encashDays}
                    onChange={(e) => setEncashDays(Math.min(Number(e.target.value), encashBalance.available))}
                    className="input-aura w-full px-4 py-2 rounded-lg"
                  />
                  <p className="text-caption mt-1">
                    Maximum encashable: {encashBalance.available} days
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Reason (optional)
                  </label>
                  <textarea
                    value={encashReason}
                    onChange={(e) => setEncashReason(e.target.value)}
                    rows={2}
                    placeholder="Reason for encashment request"
                    className="input-aura w-full px-4 py-2 rounded-lg"
                  />
                </div>

                <div
                  className='flex items-start gap-2 p-4 bg-status-warning-bg border border-status-warning-border rounded-lg'>
                  <AlertCircle className='h-4 w-4 text-status-warning-text mt-0.5 flex-shrink-0'/>
                  <p className='text-xs text-status-warning-text'>
                    Encashment will be processed as part of your next payroll cycle. The amount will be calculated based
                    on your current basic salary and applicable tax deductions.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-[var(--border-main)] flex justify-end gap-4">
                <button
                  onClick={() => setShowEncashModal(false)}
                  className="btn-secondary px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await encashmentMutation.mutateAsync({
                      leaveBalanceId: encashBalance.id,
                      daysToEncash: encashDays,
                      reason: encashReason || undefined,
                    });
                    setShowEncashModal(false);
                    setEncashBalance(null);
                  }}
                  disabled={encashmentMutation.isPending || encashDays < 1 || encashDays > encashBalance.available}
                  className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {encashmentMutation.isPending ? (
                    <>
                      <div
                        className='w-4 h-4 border-2 border-[var(--bg-card)] border-t-transparent rounded-full animate-spin'/>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Banknote className="h-4 w-4"/>
                      Request Encashment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
