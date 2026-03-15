'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { TravelStatus } from '@/lib/types/travel';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/components/notifications/ToastProvider';
import {
  useTravelRequest,
  useTravelExpensesByRequest,
  useApproveTravelRequest,
  useRejectTravelRequest,
  useCancelTravelRequest,
  useCompleteTravelRequest,
} from '@/lib/hooks/queries/useTravel';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  Plane,
  Hotel,
  Car,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Edit,
  Trash2,
  Send,
  FileText,
  Plus,
  Receipt,
  User,
  Building,
  Info,
} from 'lucide-react';

export default function TravelRequestDetailsPage() {
  const toast = useToast();
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const travelId = params?.id as string;

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  // React Query hooks
  const { data: travelRequest, isLoading } = useTravelRequest(travelId, !!travelId);
  const { data: expensesData } = useTravelExpensesByRequest(travelId, 0, 100);
  const expenses = expensesData?.content || [];

  const approveMutation = useApproveTravelRequest();
  const rejectMutation = useRejectTravelRequest();
  const cancelMutation = useCancelTravelRequest();
  const completeMutation = useCompleteTravelRequest();

  const handleApprove = () => {
    if (!user?.employeeId || !travelRequest) return;

    approveMutation.mutate(
      { id: travelRequest.id, approverId: user.employeeId },
      {
        onError: (error: unknown) => {
          console.error('Error approving travel request:', error);
          toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to approve travel request');
        },
      }
    );
  };

  const handleReject = () => {
    if (!user?.employeeId || !travelRequest) return;

    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    rejectMutation.mutate(
      { id: travelRequest.id, approverId: user.employeeId, reason },
      {
        onError: (error: unknown) => {
          console.error('Error rejecting travel request:', error);
          toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to reject travel request');
        },
      }
    );
  };

  const handleCancel = () => {
    if (!travelRequest) return;

    const reason = prompt('Please enter cancellation reason:');
    if (!reason) return;

    cancelMutation.mutate(
      { id: travelRequest.id, reason },
      {
        onError: (error: unknown) => {
          console.error('Error cancelling travel request:', error);
          toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to cancel travel request');
        },
      }
    );
  };

  const handleComplete = () => {
    if (!travelRequest) return;

    if (!confirm('Mark this travel request as completed?')) return;

    completeMutation.mutate(travelRequest.id, {
      onError: (error: unknown) => {
        console.error('Error completing travel request:', error);
        toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to complete travel request');
      },
    });
  };

  const getStatusConfig = (status: TravelStatus) => {
    const configs = {
      DRAFT: {
        bg: 'bg-surface-100 dark:bg-surface-800',
        text: 'text-surface-600 dark:text-surface-400',
        icon: Clock,
      },
      SUBMITTED: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        icon: Clock,
      },
      PENDING_APPROVAL: {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-400',
        icon: Clock,
      },
      APPROVED: {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        icon: CheckCircle,
      },
      REJECTED: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        icon: XCircle,
      },
      BOOKED: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-700 dark:text-purple-400',
        icon: CheckCircle,
      },
      IN_PROGRESS: {
        bg: 'bg-cyan-100 dark:bg-cyan-900/30',
        text: 'text-cyan-700 dark:text-cyan-400',
        icon: Plane,
      },
      COMPLETED: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        icon: CheckCircle,
      },
      CANCELLED: {
        bg: 'bg-surface-100 dark:bg-surface-800',
        text: 'text-surface-600 dark:text-surface-400',
        icon: XCircle,
      },
    };
    return configs[status] || configs.DRAFT;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="travel">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="text-surface-600 dark:text-surface-400">Loading travel request...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !travelRequest) {
    return (
      <AppLayout activeMenuItem="travel">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-surface-600 dark:text-surface-400">{error || 'Travel request not found'}</p>
            <button
              onClick={() => router.push('/travel')}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              Back to Travel Requests
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const statusConfig = getStatusConfig(travelRequest.status);
  const StatusIcon = statusConfig.icon;
  const isOwner = user?.employeeId === travelRequest.employeeId;
  const canEdit = isOwner && ['DRAFT', 'REJECTED'].includes(travelRequest.status);
  const canCancel = isOwner && ['SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'BOOKED'].includes(travelRequest.status);
  const canComplete = isOwner && travelRequest.status === 'IN_PROGRESS';

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const approvedExpenses = expenses
    .filter((e) => e.status === 'APPROVED')
    .reduce((sum, expense) => sum + (expense.approvedAmount || expense.amount), 0);

  return (
    <AppLayout activeMenuItem="travel">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/travel')}
              className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-surface-600 dark:text-surface-400" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {travelRequest.requestNumber}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg ${statusConfig.bg} ${statusConfig.text}`}
                >
                  <StatusIcon className="h-4 w-4" />
                  {travelRequest.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-surface-500 dark:text-surface-400 mt-1">
                {travelRequest.travelType.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => router.push(`/travel/${travelRequest.id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-700 dark:text-surface-300 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
            )}
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending || completeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-900 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Cancel Request
              </button>
            )}
            {canComplete && (
              <button
                onClick={handleComplete}
                disabled={approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending || completeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Mark Completed
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Travel Information */}
            <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
              <div className="p-6 border-b border-surface-200 dark:border-surface-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <Plane className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                    Travel Information
                  </h2>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Journey */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-surface-400" />
                    <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400">
                      Journey
                    </h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-surface-500 dark:text-surface-400">From</p>
                      <p className="text-base font-medium text-surface-900 dark:text-surface-100">
                        {travelRequest.originCity}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <ArrowLeft className="h-4 w-4 text-primary-600 dark:text-primary-400 rotate-180" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-surface-500 dark:text-surface-400">To</p>
                      <p className="text-base font-medium text-surface-900 dark:text-surface-100">
                        {travelRequest.destinationCity}
                      </p>
                    </div>
                  </div>
                  {travelRequest.isInternational && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-block text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                        International Travel
                      </span>
                      {travelRequest.visaRequired && (
                        <span className="inline-block text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                          Visa Required
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-surface-400" />
                      <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400">
                        Departure
                      </h3>
                    </div>
                    <p className="text-base font-medium text-surface-900 dark:text-surface-100">
                      {formatDate(travelRequest.departureDate)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-surface-400" />
                      <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400">
                        Return
                      </h3>
                    </div>
                    <p className="text-base font-medium text-surface-900 dark:text-surface-100">
                      {formatDate(travelRequest.returnDate)}
                    </p>
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-surface-400" />
                    <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400">
                      Purpose
                    </h3>
                  </div>
                  <p className="text-sm text-surface-700 dark:text-surface-300">
                    {travelRequest.purpose}
                  </p>
                </div>

                {/* Client Name */}
                {travelRequest.clientName && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="h-4 w-4 text-surface-400" />
                      <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400">
                        Client
                      </h3>
                    </div>
                    <p className="text-sm text-surface-700 dark:text-surface-300">
                      {travelRequest.clientName}
                    </p>
                  </div>
                )}

                {/* Transport */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Car className="h-4 w-4 text-surface-400" />
                      <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400">
                        Transport
                      </h3>
                    </div>
                    <p className="text-base font-medium text-surface-900 dark:text-surface-100">
                      {travelRequest.transportMode}
                    </p>
                    {travelRequest.transportClass && (
                      <p className="text-sm text-surface-500 dark:text-surface-400">
                        {travelRequest.transportClass}
                      </p>
                    )}
                  </div>
                  {travelRequest.cabRequired && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Car className="h-4 w-4 text-surface-400" />
                        <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400">
                          Local Transport
                        </h3>
                      </div>
                      <p className="text-base font-medium text-surface-900 dark:text-surface-100">
                        Cab Required
                      </p>
                    </div>
                  )}
                </div>

                {/* Accommodation */}
                {travelRequest.accommodationRequired && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Hotel className="h-4 w-4 text-surface-400" />
                      <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400">
                        Accommodation
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-surface-500 dark:text-surface-400">Check-in</p>
                        <p className="text-base font-medium text-surface-900 dark:text-surface-100">
                          {travelRequest.checkInDate && formatDate(travelRequest.checkInDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-surface-500 dark:text-surface-400">Check-out</p>
                        <p className="text-base font-medium text-surface-900 dark:text-surface-100">
                          {travelRequest.checkOutDate && formatDate(travelRequest.checkOutDate)}
                        </p>
                      </div>
                    </div>
                    {travelRequest.hotelPreference && (
                      <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
                        Preference: {travelRequest.hotelPreference}
                      </p>
                    )}
                  </div>
                )}

                {/* Special Instructions */}
                {travelRequest.specialInstructions && (
                  <div>
                    <h3 className="text-sm font-medium text-surface-600 dark:text-surface-400 mb-2">
                      Special Instructions
                    </h3>
                    <p className="text-sm text-surface-700 dark:text-surface-300 bg-surface-50 dark:bg-surface-800 p-3 rounded-lg">
                      {travelRequest.specialInstructions}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Travel Expenses */}
            <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
              <div className="p-6 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                      Travel Expenses
                    </h2>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      {expenses.length} expense(s)
                    </p>
                  </div>
                </div>
                {isOwner && travelRequest.status === 'COMPLETED' && (
                  <button
                    onClick={() => router.push(`/travel/${travelRequest.id}/expenses/new`)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Expense
                  </button>
                )}
              </div>

              {expenses.length === 0 ? (
                <div className="p-12 text-center">
                  <Receipt className="h-12 w-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
                  <p className="text-surface-500 dark:text-surface-400">No expenses added yet</p>
                </div>
              ) : (
                <div className="divide-y divide-surface-100 dark:divide-surface-800">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="p-6 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-surface-900 dark:text-surface-100">
                              {expense.expenseType.replace(/_/g, ' ')}
                            </h3>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                expense.status === 'APPROVED'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                  : expense.status === 'REJECTED'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {expense.status}
                            </span>
                          </div>
                          <p className="text-sm text-surface-600 dark:text-surface-400">
                            {expense.description}
                          </p>
                          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                            {formatDate(expense.expenseDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-surface-900 dark:text-surface-100">
                            {formatCurrency(expense.amount)}
                          </p>
                          {expense.approvedAmount && expense.approvedAmount !== expense.amount && (
                            <p className="text-sm text-emerald-600 dark:text-emerald-400">
                              Approved: {formatCurrency(expense.approvedAmount)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Budget Summary */}
            <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-surface-800">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                  Budget Summary
                </h2>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-600 dark:text-surface-400">
                    Estimated Cost
                  </span>
                  <span className="font-medium text-surface-900 dark:text-surface-100">
                    {formatCurrency(travelRequest.estimatedCost)}
                  </span>
                </div>

                {travelRequest.advanceRequired > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-surface-600 dark:text-surface-400">
                        Advance Required
                      </span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {formatCurrency(travelRequest.advanceRequired)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-surface-600 dark:text-surface-400">
                        Advance Approved
                      </span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(travelRequest.advanceApproved)}
                      </span>
                    </div>
                  </>
                )}

                {expenses.length > 0 && (
                  <>
                    <div className="pt-3 border-t border-surface-200 dark:border-surface-800" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-surface-600 dark:text-surface-400">
                        Total Expenses
                      </span>
                      <span className="font-medium text-surface-900 dark:text-surface-100">
                        {formatCurrency(totalExpenses)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-surface-600 dark:text-surface-400">
                        Approved Expenses
                      </span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(approvedExpenses)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-surface-800">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                  <Clock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                  Status Information
                </h2>
              </div>

              <div className="space-y-3">
                {travelRequest.submittedDate && (
                  <div>
                    <p className="text-sm text-surface-600 dark:text-surface-400">Submitted On</p>
                    <p className="font-medium text-surface-900 dark:text-surface-100">
                      {formatDate(travelRequest.submittedDate)}
                    </p>
                  </div>
                )}

                {travelRequest.approvedDate && (
                  <div>
                    <p className="text-sm text-surface-600 dark:text-surface-400">Approved On</p>
                    <p className="font-medium text-surface-900 dark:text-surface-100">
                      {formatDate(travelRequest.approvedDate)}
                    </p>
                    {travelRequest.approverName && (
                      <p className="text-sm text-surface-500 dark:text-surface-400">
                        By: {travelRequest.approverName}
                      </p>
                    )}
                  </div>
                )}

                {travelRequest.rejectionReason && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                      Rejection Reason
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {travelRequest.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Employee Info */}
            <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-surface-800">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                  Employee Details
                </h2>
              </div>

              <div>
                <p className="text-sm text-surface-600 dark:text-surface-400">Employee Name</p>
                <p className="font-medium text-surface-900 dark:text-surface-100">
                  {travelRequest.employeeName || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
