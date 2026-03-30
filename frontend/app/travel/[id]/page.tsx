'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { AppLayout } from '@/components/layout/AppLayout';
import { TravelStatus } from '@/lib/types/travel';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/components/notifications/ToastProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
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
  Plus,
  Receipt,
  User,
  Building,
  Info,
} from 'lucide-react';
import { createLogger } from '@/lib/utils/logger';
import { formatCurrency } from '@/lib/utils';

const log = createLogger('TravelPage');

export default function TravelRequestDetailsPage() {
  const toast = useToast();
  const router = useRouter();
  const params = useParams();
  const { hasPermission, isReady: permissionsReady } = usePermissions();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [error] = useState<string | null>(null);
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const travelId = params?.id as string;

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  useEffect(() => {
    if (!permissionsReady) return;
    if (!hasPermission(Permissions.TRAVEL_VIEW)) {
      router.replace('/me/dashboard');
    }
  }, [permissionsReady, hasPermission, router]);

  // React Query hooks
  const { data: travelRequest, isLoading } = useTravelRequest(travelId, !!travelId);
  const { data: expensesData } = useTravelExpensesByRequest(travelId, 0, 100);
  const expenses = expensesData?.content || [];

  const approveMutation = useApproveTravelRequest();
  const rejectMutation = useRejectTravelRequest();
  const cancelMutation = useCancelTravelRequest();
  const completeMutation = useCompleteTravelRequest();

  const handleReject = () => {
    if (!user?.employeeId || !travelRequest) return;

    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }

    rejectMutation.mutate(
      { id: travelRequest.id, approverId: user.employeeId, reason: rejectReason },
      {
        onError: (error: unknown) => {
          log.error('Error rejecting travel request:', error);
          toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to reject travel request');
        },
        onSuccess: () => {
          setShowRejectReasonModal(false);
          setRejectReason('');
        },
      }
    );
  };

  const handleCancel = () => {
    if (!travelRequest) return;

    if (!cancelReason.trim()) {
      toast.error('Please enter a cancellation reason');
      return;
    }

    cancelMutation.mutate(
      { id: travelRequest.id, reason: cancelReason },
      {
        onError: (error: unknown) => {
          log.error('Error cancelling travel request:', error);
          toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to cancel travel request');
        },
        onSuccess: () => {
          setShowCancelReasonModal(false);
          setCancelReason('');
        },
      }
    );
  };

  const handleComplete = () => {
    if (!travelRequest) return;
    setShowCompleteConfirm(true);
  };

  const handleConfirmComplete = async () => {
    if (!travelRequest) return;

    completeMutation.mutate(travelRequest.id, {
      onError: (error: unknown) => {
        log.error('Error completing travel request:', error);
        toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to complete travel request');
      },
      onSuccess: () => {
        setShowCompleteConfirm(false);
      },
    });
  };

  const getStatusConfig = (status: TravelStatus) => {
    const configs = {
      DRAFT: {
        bg: 'bg-[var(--bg-secondary)]',
        text: 'text-[var(--text-secondary)]',
        icon: Clock,
      },
      SUBMITTED: {
        bg: 'bg-accent-100 dark:bg-accent-900/30',
        text: 'text-accent-700 dark:text-accent-400',
        icon: Clock,
      },
      PENDING_APPROVAL: {
        bg: 'bg-warning-100 dark:bg-warning-900/30',
        text: 'text-warning-700 dark:text-warning-400',
        icon: Clock,
      },
      APPROVED: {
        bg: 'bg-success-100 dark:bg-success-900/30',
        text: 'text-success-700 dark:text-success-400',
        icon: CheckCircle,
      },
      REJECTED: {
        bg: 'bg-danger-100 dark:bg-danger-900/30',
        text: 'text-danger-700 dark:text-danger-400',
        icon: XCircle,
      },
      BOOKED: {
        bg: 'bg-accent-300 dark:bg-accent-900/30',
        text: 'text-accent-900 dark:text-accent-600',
        icon: CheckCircle,
      },
      IN_PROGRESS: {
        bg: 'bg-accent-100 dark:bg-accent-900/30',
        text: 'text-accent-700 dark:text-accent-400',
        icon: Plane,
      },
      COMPLETED: {
        bg: 'bg-success-100 dark:bg-success-900/30',
        text: 'text-success-700 dark:text-success-400',
        icon: CheckCircle,
      },
      CANCELLED: {
        bg: 'bg-[var(--bg-secondary)]',
        text: 'text-[var(--text-secondary)]',
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


  if (!permissionsReady || !hasPermission(Permissions.TRAVEL_VIEW)) {
    return null;
  }

  if (isLoading) {
    return (
      <AppLayout activeMenuItem="travel">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
            <p className="text-[var(--text-secondary)]">Loading travel request...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isLoading && !error && !travelRequest) {
    notFound();
  }

  if (error || !travelRequest) {
    return (
      <AppLayout activeMenuItem="travel">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-danger-500" />
            <p className="text-[var(--text-secondary)]">{error || 'Travel request not found'}</p>
            <button
              onClick={() => router.push('/travel')}
              className="px-4 py-2 bg-accent-500 text-white rounded-xl hover:bg-accent-700 transition-colors"
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
              className="p-2 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] rounded-xl transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
            </button>
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
                  {travelRequest.requestNumber}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg ${statusConfig.bg} ${statusConfig.text}`}
                >
                  <StatusIcon className="h-4 w-4" />
                  {travelRequest.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-[var(--text-muted)] mt-1">
                {travelRequest.travelType.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => router.push(`/travel/${travelRequest.id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => setShowCancelReasonModal(true)}
                disabled={approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending || completeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-danger-200 dark:border-danger-800 text-danger-600 dark:text-danger-400 rounded-xl hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Cancel Request
              </button>
            )}
            {canComplete && (
              <button
                onClick={handleComplete}
                disabled={approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending || completeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl hover:from-success-600 hover:to-success-700 transition-colors disabled:opacity-50"
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
            <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] overflow-hidden">
              <div className="p-6 border-b border-[var(--border-main)]">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-accent-100 dark:bg-accent-900/30 rounded-lg">
                    <Plane className="h-5 w-5 text-accent-700 dark:text-accent-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                    Travel Information
                  </h2>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Journey */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
                    <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                      Journey
                    </h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-[var(--text-muted)]">From</p>
                      <p className="text-base font-medium text-[var(--text-primary)]">
                        {travelRequest.originCity}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                        <ArrowLeft className="h-4 w-4 text-accent-700 dark:text-accent-400 rotate-180" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[var(--text-muted)]">To</p>
                      <p className="text-base font-medium text-[var(--text-primary)]">
                        {travelRequest.destinationCity}
                      </p>
                    </div>
                  </div>
                  {travelRequest.isInternational && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-block text-xs px-2 py-1 bg-accent-300 dark:bg-accent-900/30 text-accent-900 dark:text-accent-600 rounded">
                        International Travel
                      </span>
                      {travelRequest.visaRequired && (
                        <span className="inline-block text-xs px-2 py-1 bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 rounded">
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
                      <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                      <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                        Departure
                      </h3>
                    </div>
                    <p className="text-base font-medium text-[var(--text-primary)]">
                      {formatDate(travelRequest.departureDate)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                      <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                        Return
                      </h3>
                    </div>
                    <p className="text-base font-medium text-[var(--text-primary)]">
                      {formatDate(travelRequest.returnDate)}
                    </p>
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-[var(--text-muted)]" />
                    <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                      Purpose
                    </h3>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {travelRequest.purpose}
                  </p>
                </div>

                {/* Client Name */}
                {travelRequest.clientName && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="h-4 w-4 text-[var(--text-muted)]" />
                      <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                        Client
                      </h3>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {travelRequest.clientName}
                    </p>
                  </div>
                )}

                {/* Transport */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Car className="h-4 w-4 text-[var(--text-muted)]" />
                      <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                        Transport
                      </h3>
                    </div>
                    <p className="text-base font-medium text-[var(--text-primary)]">
                      {travelRequest.transportMode}
                    </p>
                    {travelRequest.transportClass && (
                      <p className="text-sm text-[var(--text-muted)]">
                        {travelRequest.transportClass}
                      </p>
                    )}
                  </div>
                  {travelRequest.cabRequired && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Car className="h-4 w-4 text-[var(--text-muted)]" />
                        <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                          Local Transport
                        </h3>
                      </div>
                      <p className="text-base font-medium text-[var(--text-primary)]">
                        Cab Required
                      </p>
                    </div>
                  )}
                </div>

                {/* Accommodation */}
                {travelRequest.accommodationRequired && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Hotel className="h-4 w-4 text-[var(--text-muted)]" />
                      <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                        Accommodation
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-[var(--text-muted)]">Check-in</p>
                        <p className="text-base font-medium text-[var(--text-primary)]">
                          {travelRequest.checkInDate && formatDate(travelRequest.checkInDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--text-muted)]">Check-out</p>
                        <p className="text-base font-medium text-[var(--text-primary)]">
                          {travelRequest.checkOutDate && formatDate(travelRequest.checkOutDate)}
                        </p>
                      </div>
                    </div>
                    {travelRequest.hotelPreference && (
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Preference: {travelRequest.hotelPreference}
                      </p>
                    )}
                  </div>
                )}

                {/* Special Instructions */}
                {travelRequest.specialInstructions && (
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Special Instructions
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-secondary)] p-4 rounded-lg">
                      {travelRequest.specialInstructions}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Travel Expenses */}
            <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] overflow-hidden">
              <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
                    <Receipt className="h-5 w-5 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                      Travel Expenses
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      {expenses.length} expense(s)
                    </p>
                  </div>
                </div>
                {isOwner && travelRequest.status === 'COMPLETED' && (
                  <button
                    onClick={() => router.push(`/travel/${travelRequest.id}/expenses/new`)}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-xl hover:bg-accent-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Expense
                  </button>
                )}
              </div>

              {expenses.length === 0 ? (
                <div className="p-12 text-center">
                  <Receipt className="h-12 w-12 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mx-auto mb-4" />
                  <p className="text-[var(--text-muted)]">No expenses added yet</p>
                </div>
              ) : (
                <div className="divide-y divide-surface-100 dark:divide-surface-800">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="p-6 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-[var(--text-primary)]">
                              {expense.expenseType.replace(/_/g, ' ')}
                            </h3>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                expense.status === 'APPROVED'
                                  ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400'
                                  : expense.status === 'REJECTED'
                                  ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400'
                                  : 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400'
                              }`}
                            >
                              {expense.status}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)]">
                            {expense.description}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {formatDate(expense.expenseDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[var(--text-primary)]">
                            {formatCurrency(expense.amount)}
                          </p>
                          {expense.approvedAmount && expense.approvedAmount !== expense.amount && (
                            <p className="text-sm text-success-600 dark:text-success-400">
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
            <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-main)]">
                <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                  <DollarSign className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                </div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Budget Summary
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">
                    Estimated Cost
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatCurrency(travelRequest.estimatedCost)}
                  </span>
                </div>

                {travelRequest.advanceRequired > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">
                        Advance Required
                      </span>
                      <span className="font-medium text-warning-600 dark:text-warning-400">
                        {formatCurrency(travelRequest.advanceRequired)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">
                        Advance Approved
                      </span>
                      <span className="font-medium text-success-600 dark:text-success-400">
                        {formatCurrency(travelRequest.advanceApproved)}
                      </span>
                    </div>
                  </>
                )}

                {expenses.length > 0 && (
                  <>
                    <div className="pt-3 border-t border-[var(--border-main)]" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">
                        Total Expenses
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {formatCurrency(totalExpenses)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">
                        Approved Expenses
                      </span>
                      <span className="font-medium text-success-600 dark:text-success-400">
                        {formatCurrency(approvedExpenses)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-main)]">
                <div className="p-2 bg-accent-100 dark:bg-accent-900/30 rounded-lg">
                  <Clock className="h-5 w-5 text-accent-600 dark:text-accent-400" />
                </div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Status Information
                </h2>
              </div>

              <div className="space-y-4">
                {travelRequest.submittedDate && (
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Submitted On</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {formatDate(travelRequest.submittedDate)}
                    </p>
                  </div>
                )}

                {travelRequest.approvedDate && (
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Approved On</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {formatDate(travelRequest.approvedDate)}
                    </p>
                    {travelRequest.approverName && (
                      <p className="text-sm text-[var(--text-muted)]">
                        By: {travelRequest.approverName}
                      </p>
                    )}
                  </div>
                )}

                {travelRequest.rejectionReason && (
                  <div className="p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
                    <p className="text-sm font-medium text-danger-900 dark:text-danger-100 mb-1">
                      Rejection Reason
                    </p>
                    <p className="text-sm text-danger-700 dark:text-danger-300">
                      {travelRequest.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Employee Info */}
            <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-main)]">
                <div className="p-2 bg-accent-100 dark:bg-accent-900/30 rounded-lg">
                  <User className="h-5 w-5 text-accent-700 dark:text-accent-400" />
                </div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Employee Details
                </h2>
              </div>

              <div>
                <p className="text-sm text-[var(--text-secondary)]">Employee Name</p>
                <p className="font-medium text-[var(--text-primary)]">
                  {travelRequest.employeeName || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Reason Modal */}
      <Modal isOpen={showRejectReasonModal} onClose={() => setShowRejectReasonModal(false)} size="sm">
        <ModalHeader onClose={() => setShowRejectReasonModal(false)}>
          Reject Travel Request
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Please provide a reason for rejecting this travel request.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowRejectReasonModal(false);
              setRejectReason('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            disabled={!rejectReason.trim() || rejectMutation.isPending}
          >
            {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Cancel Reason Modal */}
      <Modal isOpen={showCancelReasonModal} onClose={() => setShowCancelReasonModal(false)} size="sm">
        <ModalHeader onClose={() => setShowCancelReasonModal(false)}>
          Cancel Travel Request
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Please provide a reason for cancelling this travel request.
            </p>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter cancellation reason..."
              rows={4}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowCancelReasonModal(false);
              setCancelReason('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCancel}
            disabled={!cancelReason.trim() || cancelMutation.isPending}
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Complete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCompleteConfirm}
        onClose={() => setShowCompleteConfirm(false)}
        onConfirm={handleConfirmComplete}
        title="Mark Completed"
        message="Are you sure you want to mark this travel request as completed?"
        confirmText="Mark Completed"
        type="info"
        loading={completeMutation.isPending}
      />
    </AppLayout>
  );
}
