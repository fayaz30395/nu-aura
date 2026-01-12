'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { leaveService } from '@/lib/services/leave.service';
import {
  LeaveRequest,
  LeaveBalance,
  LeaveType,
  LeaveRequestRequest,
  LeaveRequestStatus,
} from '@/lib/types/leave';

export default function MyLeavesPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Leave request submitted successfully!');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState<LeaveRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Filter states
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | 'ALL'>('ALL');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('ALL');

  const [formData, setFormData] = useState<LeaveRequestRequest>({
    employeeId: user?.employeeId || '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    totalDays: 1,
    isHalfDay: false,
    reason: '',
  });

  useEffect(() => {
    // Wait for auth store to hydrate before checking authentication
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
    } else if (user) {
      if (user.employeeId) {
        loadData();
      } else {
        // User is authenticated but doesn't have an employee record
        setIsLoading(false);
        setError('No employee profile found for your account. Please contact your administrator.');
      }
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [requests, balances, types] = await Promise.all([
        leaveService.getEmployeeLeaveRequests(user!.employeeId!),
        leaveService.getEmployeeBalances(user!.employeeId!),
        leaveService.getActiveLeaveTypes(),
      ]);

      setLeaveRequests(requests.content);
      setLeaveBalances(balances);
      setLeaveTypes(types);
    } catch (err: any) {
      console.error('Failed to load leave data:', err);
      setError(err.response?.data?.message || 'Failed to load leave data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 1;

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return formData.isHalfDay ? 0.5 : diffDays;
  };

  useEffect(() => {
    const days = calculateDays();
    setFormData((prev) => ({ ...prev, totalDays: days }));
  }, [formData.startDate, formData.endDate, formData.isHalfDay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.leaveTypeId || !formData.startDate || !formData.endDate || !formData.reason) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (editingRequest) {
        // Update existing request
        await leaveService.updateLeaveRequest(editingRequest.id, {
          ...formData,
          employeeId: user!.employeeId!,
        });
        setSuccessMessage('Leave request updated successfully!');
      } else {
        // Create new request
        await leaveService.createLeaveRequest({
          ...formData,
          employeeId: user!.employeeId!,
        });
        setSuccessMessage('Leave request submitted successfully!');
      }

      setSuccess(true);
      setShowApplyModal(false);
      setEditingRequest(null);
      await loadData();

      // Reset form
      setFormData({
        employeeId: user!.employeeId || '',
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        totalDays: 1,
        isHalfDay: false,
        reason: '',
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to submit leave request:', err);
      setError(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (request: LeaveRequest) => {
    setEditingRequest(request);
    setFormData({
      employeeId: request.employeeId,
      leaveTypeId: request.leaveTypeId,
      startDate: request.startDate,
      endDate: request.endDate,
      totalDays: request.totalDays,
      isHalfDay: request.isHalfDay,
      halfDayPeriod: request.halfDayPeriod,
      reason: request.reason,
    });
    setShowApplyModal(true);
  };

  const handleCloseModal = () => {
    setShowApplyModal(false);
    setEditingRequest(null);
    setFormData({
      employeeId: user?.employeeId || '',
      leaveTypeId: '',
      startDate: '',
      endDate: '',
      totalDays: 1,
      isHalfDay: false,
      reason: '',
    });
  };

  const handleCancelClick = (request: LeaveRequest) => {
    setCancellingRequest(request);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancellingRequest || !cancelReason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await leaveService.cancelLeaveRequest(cancellingRequest.id, cancelReason);
      setSuccessMessage('Leave request cancelled successfully!');
      setSuccess(true);
      setShowCancelModal(false);
      setCancellingRequest(null);
      setCancelReason('');
      await loadData();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to cancel leave request:', err);
      setError(err.response?.data?.message || 'Failed to cancel leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setCancellingRequest(null);
    setCancelReason('');
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
                  You haven't applied for any leaves yet
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

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Leave Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Leave Type *
                    </label>
                    <select
                      value={formData.leaveTypeId}
                      onChange={(e) =>
                        setFormData({ ...formData, leaveTypeId: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                    >
                      <option value="">Select leave type</option>
                      {leaveTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.leaveName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({ ...formData, startDate: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        End Date *
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        required
                        min={formData.startDate}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  {/* Half Day */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="halfDay"
                      checked={formData.isHalfDay}
                      onChange={(e) =>
                        setFormData({ ...formData, isHalfDay: e.target.checked })
                      }
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
                      Total Days: <span className="font-bold text-primary-600">{formData.totalDays}</span>
                    </p>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Reason *
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      required
                      rows={4}
                      placeholder="Please provide a reason for your leave..."
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-800"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      disabled={isSubmitting}
                      className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? (
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

              <div className="p-6 space-y-4">
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
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                    rows={3}
                    placeholder="Please provide a reason for cancelling this leave request..."
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-slate-800"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseCancelModal}
                    disabled={isSubmitting}
                    className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    Keep Request
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelConfirm}
                    disabled={isSubmitting || !cancelReason.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? (
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
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
