'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Send,
  FileText,
  TrendingUp,
  Edit3,
  User,
  Ban,
  Filter,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEmployeeLeaveRequests, useEmployeeBalances, useActiveLeaveTypes, useCreateLeaveRequest, useUpdateLeaveRequest, useCancelLeaveRequest } from '@/lib/hooks/queries/useLeaves';
import {
  LeaveRequest,
  LeaveType,
  LeaveRequestRequest,
  LeaveRequestStatus,
} from '@/lib/types/leave';

const leaveFormSchema = z.object({
  leaveTypeId: z.string().min(1, 'Please select a leave type'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isHalfDay: z.boolean().default(false),
  reason: z.string().min(1, 'Reason is required').max(1000, 'Reason must not exceed 1000 characters'),
});

type LeaveFormData = z.infer<typeof leaveFormSchema>;

const cancelFormSchema = z.object({
  reason: z.string().min(1, 'Please provide a reason for cancellation'),
});

type CancelFormData = z.infer<typeof cancelFormSchema>;

export default function MyLeavesPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
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
  const { register: registerLeave, handleSubmit: handleLeaveSubmit, watch: watchLeave, formState: { errors: leaveErrors, isSubmitting: leaveSubmitting }, reset: resetLeave } = useForm<LeaveFormData>({
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
  const { register: registerCancel, handleSubmit: handleCancelSubmit, formState: { errors: cancelErrors, isSubmitting: cancelSubmitting }, reset: resetCancel } = useForm<CancelFormData>({
    resolver: zodResolver(cancelFormSchema),
    defaultValues: {
      reason: '',
    },
  });

  const { data: leaveRequestsData } = useEmployeeLeaveRequests(user?.employeeId || '', 0, 100, Boolean(hasHydrated && user?.employeeId));
  const { data: balancesData = [] } = useEmployeeBalances(user?.employeeId || '', Boolean(hasHydrated && user?.employeeId));
  const { data: leaveTypesData = [] } = useActiveLeaveTypes();
  const createLeaveRequest = useCreateLeaveRequest();
  const updateLeaveRequest = useUpdateLeaveRequest();
  const cancelLeaveRequest = useCancelLeaveRequest();

  const leaveRequests = leaveRequestsData?.content ?? [];
  const leaveTypes = leaveTypesData;
  const leaveBalances = balancesData;
  const isLoading = !leaveRequestsData;

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
      console.error('Failed to submit leave request:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit leave request');
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
      await cancelLeaveRequest.mutateAsync({ id: cancellingRequest.id, reason: data.reason });
      setSuccessMessage('Leave request cancelled successfully!');
      setSuccess(true);
      setShowCancelModal(false);
      setCancellingRequest(null);
      resetCancel();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      console.error('Failed to cancel leave request:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to cancel leave request');
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
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getStatusIcon = (status: LeaveRequestStatus) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!user?.employeeId) {
    return (
      <AppLayout activeMenuItem="leaves">
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Employee Profile Linked</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Leave management requires an employee profile. Use the admin panels to manage employee leaves.
          </p>
          <button
            onClick={() => router.push('/leave')}
            className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">My Leaves</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage your leave requests and balances
            </p>
          </div>
          <button
            onClick={() => setShowApplyModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Apply for Leave
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800 dark:text-green-200 font-medium">
              {successMessage}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
          </div>
        )}

        {/* Leave Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {leaveBalances.map((balance) => {
            const leaveType = leaveTypes.find((lt) => lt.id === balance.leaveTypeId);
            return (
              <Card key={balance.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${leaveType?.colorCode || '#6b7280'}20` }}
                    >
                      <Calendar
                        className="h-6 w-6"
                        style={{ color: leaveType?.colorCode || '#6b7280' }}
                      />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">
                    {leaveType?.leaveName || 'Unknown'}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Available</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {balance.available}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Used</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-50">
                        {balance.used}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Pending</span>
                      <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                        {balance.pending}
                      </span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all"
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
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Leave History
                </CardTitle>
                <CardDescription>
                  Your past and current leave requests
                  {hasActiveFilters && (
                    <span className="ml-2 text-primary-600 dark:text-primary-400">
                      ({filteredLeaveRequests.length} of {leaveRequests.length})
                    </span>
                  )}
                </CardDescription>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as LeaveRequestStatus | 'ALL')}
                    className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                  className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                    className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
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
                <Calendar className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">
                  No Leave Requests
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  You haven&apos;t applied for any leaves yet
                </p>
              </div>
            ) : filteredLeaveRequests.length === 0 ? (
              <div className="text-center py-12">
                <Filter className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">
                  No Matching Requests
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  No leave requests match the selected filters
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLeaveRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-6 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
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
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {request.totalDays} {request.totalDays === 1 ? 'day' : 'days'}
                            {request.isHalfDay && ' (Half Day)'}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </p>
                        {/* Approver Info for PENDING */}
                        {request.status === 'PENDING' && request.pendingApproverName && (
                          <div className="flex items-center gap-2 mt-3 text-sm">
                            <User className="h-4 w-4 text-blue-500" />
                            <span className="text-slate-600 dark:text-slate-400">
                              Pending approval from:{' '}
                              <span className="font-medium text-blue-600 dark:text-blue-400">
                                {request.pendingApproverName}
                              </span>
                            </span>
                          </div>
                        )}
                        {(request.status === 'APPROVED' || request.status === 'REJECTED') && request.approverName && (
                          <div className="flex items-center gap-2 mt-3 text-sm">
                            <User className="h-4 w-4 text-slate-500" />
                            <span className="text-slate-600 dark:text-slate-400">
                              {request.status === 'APPROVED' ? 'Approved' : 'Rejected'} by:{' '}
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {request.approverName}
                              </span>
                            </span>
                          </div>
                        )}
                        {request.rejectionReason && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                            <span className="font-medium">Rejection Reason:</span>{' '}
                            {request.rejectionReason}
                          </p>
                        )}
                        {request.cancellationReason && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/30 dark:hover:bg-primary-950/50 rounded-lg transition-colors"
                          >
                            <Edit3 className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleCancelClick(request)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                          >
                            <Ban className="h-3 w-3" />
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Applied on date - bottom right */}
                    <div className="flex justify-end mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Applied on {formatDate(request.appliedOn)}
                        </p>
                        {request.approvedOn && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                    {editingRequest ? 'Edit Leave Request' : 'Apply for Leave'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleLeaveSubmit(onLeaveSubmit)} className="p-6 space-y-4">
                  {/* Leave Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Leave Type *
                    </label>
                    <select
                      {...registerLeave('leaveTypeId')}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                    >
                      <option value="">Select leave type</option>
                      {leaveTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.leaveName}
                        </option>
                      ))}
                    </select>
                    {leaveErrors.leaveTypeId && <p className="text-red-500 text-sm mt-1">{leaveErrors.leaveTypeId.message}</p>}
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        {...registerLeave('startDate')}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                      />
                      {leaveErrors.startDate && <p className="text-red-500 text-sm mt-1">{leaveErrors.startDate.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        End Date *
                      </label>
                      <input
                        type="date"
                        {...registerLeave('endDate')}
                        min={startDate}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                      />
                      {leaveErrors.endDate && <p className="text-red-500 text-sm mt-1">{leaveErrors.endDate.message}</p>}
                    </div>
                  </div>

                  {/* Half Day */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="halfDay"
                      {...registerLeave('isHalfDay')}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <label
                      htmlFor="halfDay"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      This is a half-day leave
                    </label>
                  </div>

                  {/* Total Days */}
                  <div className="p-4 bg-primary-50 dark:bg-primary-950/30 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Total Days: <span className="font-bold text-primary-600">{calculateDays()}</span>
                    </p>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Reason *
                    </label>
                    <textarea
                      {...registerLeave('reason')}
                      rows={4}
                      placeholder="Please provide a reason for your leave..."
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                    />
                    {leaveErrors.reason && <p className="text-red-500 text-sm mt-1">{leaveErrors.reason.message}</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      disabled={createLeaveRequest.isPending || updateLeaveRequest.isPending || leaveSubmitting}
                      className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createLeaveRequest.isPending || updateLeaveRequest.isPending || leaveSubmitting}
                      className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {createLeaveRequest.isPending || updateLeaveRequest.isPending || leaveSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {editingRequest ? 'Updating...' : 'Submitting...'}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  Cancel Leave Request
                </h2>
                <button
                  onClick={handleCloseCancelModal}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCancelSubmit(onCancelSubmit)} className="p-6 space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Reason for cancellation *
                  </label>
                  <textarea
                    {...registerCancel('reason')}
                    rows={3}
                    placeholder="Please provide a reason for cancelling this leave request..."
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-slate-800"
                  />
                  {cancelErrors.reason && <p className="text-red-500 text-sm mt-1">{cancelErrors.reason.message}</p>}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseCancelModal}
                    disabled={cancelLeaveRequest.isPending || cancelSubmitting}
                    className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    Keep Request
                  </button>
                  <button
                    type="submit"
                    disabled={cancelLeaveRequest.isPending || cancelSubmitting}
                    className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {cancelLeaveRequest.isPending || cancelSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4" />
                        Cancel Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
