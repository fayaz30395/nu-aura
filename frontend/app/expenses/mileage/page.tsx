'use client';

import {useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AppLayout} from '@/components/layout';
import {Car, CheckCircle, Filter, MapPin, Plus, Send,} from 'lucide-react';
import {useAuth} from '@/lib/hooks/useAuth';
import {Permissions} from '@/lib/hooks/usePermissions';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {MileageLogEntry, MileageStatus, VehicleType,} from '@/lib/types/hrms/expense';
import {EmptyState, Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui';
import {format} from 'date-fns';
import {formatCurrency} from '@/lib/utils';
import {
  useApproveMileageLog,
  useCreateMileageLog,
  useEmployeeMileageLogs,
  useMileagePolicies,
  useMileageSummary,
  usePendingMileageApprovals,
  useRejectMileageLog,
  useSubmitMileageLog,
} from '@/lib/hooks/queries';

const mileageLogSchema = z.object({
  travelDate: z.string().min(1, 'Travel date is required'),
  fromLocation: z.string().min(1, 'From location is required').max(500),
  toLocation: z.string().min(1, 'To location is required').max(500),
  distanceKm: z.number({coerce: true}).positive('Distance must be positive'),
  purpose: z.string().max(1000).optional().or(z.literal('')),
  vehicleType: z.enum(['CAR', 'MOTORCYCLE', 'BICYCLE', 'PUBLIC_TRANSPORT'] as const),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

type MileageLogFormData = z.infer<typeof mileageLogSchema>;

type TabType = 'my-logs' | 'pending' | 'policies';

const VEHICLE_LABELS: Record<VehicleType, string> = {
  CAR: 'Car',
  MOTORCYCLE: 'Motorcycle',
  BICYCLE: 'Bicycle',
  PUBLIC_TRANSPORT: 'Public Transport',
};

const STATUS_COLORS: Record<MileageStatus, string> = {
  DRAFT: "bg-surface text-secondary",
  SUBMITTED: "bg-accent-subtle text-accent",
  APPROVED: "bg-status-success-bg text-status-success-text",
  REJECTED: "bg-status-danger-bg text-status-danger-text",
  PAID: "bg-status-success-bg text-status-success-text",
};

export default function MileagePage() {
  const {user} = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('my-logs');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<MileageStatus | 'ALL'>('ALL');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Queries
  const myLogsQuery = useEmployeeMileageLogs(user?.employeeId, 0, 50);
  const summaryQuery = useMileageSummary(user?.employeeId, currentYear, currentMonth);
  const pendingQuery = usePendingMileageApprovals(0, 50);
  const policiesQuery = useMileagePolicies();

  // Mutations
  const createMutation = useCreateMileageLog();
  const submitMutation = useSubmitMileageLog();
  const approveMutation = useApproveMileageLog();
  const rejectMutation = useRejectMileageLog();

  const {
    register,
    handleSubmit,
    reset: resetForm,
    watch,
    formState: {errors, isSubmitting},
  } = useForm<MileageLogFormData>({
    resolver: zodResolver(mileageLogSchema),
    defaultValues: {
      travelDate: format(new Date(), 'yyyy-MM-dd'),
      vehicleType: 'CAR',
      distanceKm: undefined,
    },
  });

  const watchedDistance = watch('distanceKm');
  const watchedVehicle = watch('vehicleType');

  // Calculate estimated reimbursement
  const estimatedReimbursement = useMemo(() => {
    const policies = policiesQuery.data;
    if (!policies || policies.length === 0 || !watchedDistance || watchedDistance <= 0) return 0;
    const policy = policies[0];
    let rate = policy.ratePerKm;
    if (policy.vehicleRates) {
      try {
        const rates = JSON.parse(policy.vehicleRates) as Record<string, number>;
        if (rates[watchedVehicle]) {
          rate = rates[watchedVehicle];
        }
      } catch {
        // use default rate
      }
    }
    return Number((watchedDistance * rate).toFixed(2));
  }, [watchedDistance, watchedVehicle, policiesQuery.data]);

  const filteredLogs = useMemo(() => {
    const logs = myLogsQuery.data?.content || [];
    if (statusFilter === 'ALL') return logs;
    return logs.filter((log) => log.status === statusFilter);
  }, [myLogsQuery.data, statusFilter]);

  const handleCreateLog = async (data: MileageLogFormData) => {
    if (!user?.employeeId) return;
    try {
      await createMutation.mutateAsync({
        employeeId: user.employeeId,
        data: {
          travelDate: data.travelDate,
          fromLocation: data.fromLocation,
          toLocation: data.toLocation,
          distanceKm: data.distanceKm,
          purpose: data.purpose || undefined,
          vehicleType: data.vehicleType as VehicleType,
          notes: data.notes || undefined,
        },
      });
      setShowForm(false);
      resetForm();
    } catch {
      // error handled by React Query
    }
  };

  const handleSubmitLog = async (logId: string) => {
    try {
      await submitMutation.mutateAsync(logId);
    } catch {
      // error handled by React Query
    }
  };

  const handleApproveLog = async (logId: string) => {
    try {
      await approveMutation.mutateAsync(logId);
    } catch {
      // error handled by React Query
    }
  };

  const handleRejectLog = async () => {
    if (!selectedLogId || !rejectReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({logId: selectedLogId, reason: rejectReason});
      setShowRejectModal(false);
      setSelectedLogId(null);
      setRejectReason('');
    } catch {
      // error handled by React Query
    }
  };

  const summary = summaryQuery.data;
  const policies = policiesQuery.data || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="row-between">
          <div>
            <h1 className='text-2xl font-bold text-primary'>
              Mileage Tracking
            </h1>
            <p className='text-sm text-muted mt-1'>
              Log travel distance and get auto-calculated reimbursement
            </p>
          </div>
          <PermissionGate permission={Permissions.EXPENSE_CREATE}>
            <button
              onClick={() => setShowForm(true)}
              className='flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-inverse rounded-lg text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
            >
              <Plus className="h-4 w-4"/>
              Log Mileage
            </button>
          </PermissionGate>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className='bg-[var(--bg-card)] rounded-xl border border-subtle p-4'>
              <div className="flex items-center gap-2">
                <div className='p-2 bg-accent-subtle rounded-lg'>
                  <Car className='h-5 w-5 text-accent'/>
                </div>
                <div>
                  <p className='text-xs text-muted'>Total Distance</p>
                  <p className='text-lg font-bold text-primary'>
                    {summary.totalDistanceKm.toFixed(1)} km
                  </p>
                </div>
              </div>
            </div>
            <div className='bg-[var(--bg-card)] rounded-xl border border-subtle p-4'>
              <div className="flex items-center gap-2">
                <div className='p-2 bg-status-success-bg rounded-lg'>
                  <CheckCircle className='h-5 w-5 text-status-success-text'/>
                </div>
                <div>
                  <p className='text-xs text-muted'>Reimbursement</p>
                  <p className='text-lg font-bold text-primary'>
                    {formatCurrency(summary.totalReimbursement)}
                  </p>
                </div>
              </div>
            </div>
            <div className='bg-[var(--bg-card)] rounded-xl border border-subtle p-4'>
              <div className="flex items-center gap-2">
                <div className='p-2 bg-accent-subtle rounded-lg'>
                  <MapPin className='h-5 w-5 text-accent'/>
                </div>
                <div>
                  <p className='text-xs text-muted'>Trips This Month</p>
                  <p className='text-lg font-bold text-primary'>
                    {summary.totalTrips}
                  </p>
                </div>
              </div>
            </div>
            {summary.policyMaxMonthlyKm != null && summary.remainingMonthlyKm != null && (
              <div className='bg-[var(--bg-card)] rounded-xl border border-subtle p-4'>
                <div className="flex items-center gap-2">
                  <div className='p-2 bg-status-warning-bg rounded-lg'>
                    <Filter className='h-5 w-5 text-status-warning-text'/>
                  </div>
                  <div>
                    <p className='text-xs text-muted'>Remaining Limit</p>
                    <p className='text-lg font-bold text-primary'>
                      {summary.remainingMonthlyKm.toFixed(1)} km
                    </p>
                    <p className='text-xs text-muted'>
                      of {summary.policyMaxMonthlyKm.toFixed(0)} km/month
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className='border-b border-subtle'>
          <nav className="flex gap-6">
            {(
              [
                {key: 'my-logs' as TabType, label: 'My Mileage Logs'},
                {key: 'pending' as TabType, label: 'Pending Approvals'},
                {key: 'policies' as TabType, label: 'Policy Info'},
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-4 text-sm font-medium border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                  activeTab === tab.key
                    ? "border-[var(--accent-primary)] text-accent"
                    : "border-transparent text-muted hover:text-secondary"
                }`}
              >
                {tab.label}
                {tab.key === 'pending' && pendingQuery.data && pendingQuery.data.totalElements > 0 && (
                  <span className='ml-2 px-2 py-0.5 text-xs bg-accent-subtle text-accent rounded-full'>
                    {pendingQuery.data.totalElements}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'my-logs' && (
          <div className="space-y-4">
            {/* Status Filter */}
            <div className="flex gap-2">
              {(['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'] as const).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                      statusFilter === status
                        ? "bg-accent text-inverse"
                        : "bg-surface text-secondary hover:bg-elevated"
                    }`}
                  >
                    {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                  </button>
                )
              )}
            </div>

            {/* Logs Table */}
            {myLogsQuery.isLoading ? (
              <div className='text-center py-12 text-muted'>Loading mileage logs...</div>
            ) : filteredLogs.length === 0 ? (
              <EmptyState
                title="No mileage logs"
                description="Start logging your travel mileage for reimbursement."
                icon={<Car className='h-12 w-12 text-muted'/>}
              />
            ) : (
              <div
                className='bg-[var(--bg-card)] rounded-xl border border-subtle overflow-hidden'>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className='bg-base'>
                    <tr>
                      <th className='px-4 py-2 text-left text-xs font-medium text-muted uppercase'>
                        Date
                      </th>
                      <th className='px-4 py-2 text-left text-xs font-medium text-muted uppercase'>
                        Route
                      </th>
                      <th className='px-4 py-2 text-left text-xs font-medium text-muted uppercase'>
                        Distance
                      </th>
                      <th className='px-4 py-2 text-left text-xs font-medium text-muted uppercase'>
                        Vehicle
                      </th>
                      <th className='px-4 py-2 text-left text-xs font-medium text-muted uppercase'>
                        Reimbursement
                      </th>
                      <th className='px-4 py-2 text-left text-xs font-medium text-muted uppercase'>
                        Status
                      </th>
                      <th className='px-4 py-2 text-right text-xs font-medium text-muted uppercase'>
                        Actions
                      </th>
                    </tr>
                    </thead>
                    <tbody className='divide-y divide-surface-200'>
                    {filteredLogs.map((logEntry) => (
                      <MileageLogRow
                        key={logEntry.id}
                        log={logEntry}
                        onSubmit={handleSubmitLog}
                        isSubmitting={submitMutation.isPending}
                      />
                    ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <PermissionGate permission={Permissions.EXPENSE_APPROVE}>
            <div className="space-y-4">
              {pendingQuery.isLoading ? (
                <div className='text-center py-12 text-muted'>Loading pending approvals...</div>
              ) : !pendingQuery.data || pendingQuery.data.content.length === 0 ? (
                <EmptyState
                  title="No pending approvals"
                  description="All mileage logs have been reviewed."
                  icon={<CheckCircle className='h-12 w-12 text-muted'/>}
                />
              ) : (
                <div
                  className='bg-[var(--bg-card)] rounded-xl border border-subtle overflow-hidden'>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className='bg-base'>
                      <tr>
                        <th className='px-4 py-2 text-left text-xs font-medium text-muted uppercase'>
                          Employee
                        </th>
                        <th className='px-4 py-2 text-left text-xs font-medium text-muted uppercase'>
                          Date
                        </th>
                        <th className='px-4 py-2 text-left text-xs font-medium text-muted uppercase'>
                          Route
                        </th>
                        <th className='px-4 py-2 text-left text-xs font-medium text-muted uppercase'>
                          Distance
                        </th>
                        <th className='px-4 py-2 text-left text-xs font-medium text-muted uppercase'>
                          Amount
                        </th>
                        <th className='px-4 py-2 text-right text-xs font-medium text-muted uppercase'>
                          Actions
                        </th>
                      </tr>
                      </thead>
                      <tbody className='divide-y divide-surface-200'>
                      {pendingQuery.data.content.map((logEntry) => (
                        <tr key={logEntry.id}>
                          <td className='px-4 py-2 font-medium text-primary'>
                            {logEntry.employeeName || 'N/A'}
                          </td>
                          <td className='px-4 py-2 text-secondary'>
                            {logEntry.travelDate}
                          </td>
                          <td className='px-4 py-2 text-secondary'>
                            {logEntry.fromLocation} &rarr; {logEntry.toLocation}
                          </td>
                          <td className='px-4 py-2 text-primary font-medium'>
                            {logEntry.distanceKm} km
                          </td>
                          <td className='px-4 py-2 text-primary font-medium'>
                            {formatCurrency(logEntry.reimbursementAmount)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveLog(logEntry.id)}
                                disabled={approveMutation.isPending}
                                className='px-2 py-1.5 text-xs bg-status-success-bg hover:bg-status-success-bg text-inverse rounded-lg transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedLogId(logEntry.id);
                                  setShowRejectModal(true);
                                }}
                                className='px-2 py-1.5 text-xs bg-status-danger-bg hover:bg-status-danger-bg text-inverse rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </PermissionGate>
        )}

        {activeTab === 'policies' && (
          <div className="space-y-4">
            {policies.length === 0 ? (
              <EmptyState
                title="No mileage policies"
                description="No active mileage reimbursement policies have been configured."
                icon={<Car className='h-12 w-12 text-muted'/>}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {policies.map((policy) => (
                  <div
                    key={policy.id}
                    className='bg-[var(--bg-card)] rounded-xl border border-subtle p-4'
                  >
                    <div className="row-between mb-2">
                      <h3 className='font-semibold text-primary'>{policy.name}</h3>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          policy.isActive
                            ? "bg-status-success-bg text-status-success-text"
                            : "bg-surface text-muted"
                        }`}
                      >
                        {policy.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className='space-y-2 text-sm text-secondary'>
                      <div className="flex justify-between">
                        <span>Rate per km</span>
                        <span className='font-medium text-primary'>
                          {formatCurrency(policy.ratePerKm)}
                        </span>
                      </div>
                      {policy.maxDailyKm != null && (
                        <div className="flex justify-between">
                          <span>Daily limit</span>
                          <span className="font-medium">{policy.maxDailyKm} km</span>
                        </div>
                      )}
                      {policy.maxMonthlyKm != null && (
                        <div className="flex justify-between">
                          <span>Monthly limit</span>
                          <span className="font-medium">{policy.maxMonthlyKm} km</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Effective from</span>
                        <span className="font-medium">{policy.effectiveFrom}</span>
                      </div>
                      {policy.effectiveTo && (
                        <div className="flex justify-between">
                          <span>Effective to</span>
                          <span className="font-medium">{policy.effectiveTo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Mileage Log Modal */}
        <Modal isOpen={showForm} onClose={() => setShowForm(false)} size="lg">
          <ModalHeader onClose={() => setShowForm(false)}>Log Mileage</ModalHeader>
          <form onSubmit={handleSubmit(handleCreateLog)}>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className='block text-sm font-medium text-secondary mb-1'>
                    Travel Date *
                  </label>
                  <input
                    type="date"
                    {...register('travelDate')}
                    className='w-full px-4 py-2 border border-subtle rounded-lg bg-[var(--bg-input)] text-primary focus:ring-2 focus:ring-accent-700 focus:border-transparent'
                  />
                  {errors.travelDate && (
                    <p className='text-status-danger-text text-xs mt-1'>{errors.travelDate.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className='block text-sm font-medium text-secondary mb-1'>
                      From Location *
                    </label>
                    <input
                      type="text"
                      {...register('fromLocation')}
                      placeholder="Starting point"
                      className='w-full px-4 py-2 border border-subtle rounded-lg bg-[var(--bg-input)] text-primary focus:ring-2 focus:ring-accent-700 focus:border-transparent'
                    />
                    {errors.fromLocation && (
                      <p className='text-status-danger-text text-xs mt-1'>{errors.fromLocation.message}</p>
                    )}
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-secondary mb-1'>
                      To Location *
                    </label>
                    <input
                      type="text"
                      {...register('toLocation')}
                      placeholder="Destination"
                      className='w-full px-4 py-2 border border-subtle rounded-lg bg-[var(--bg-input)] text-primary focus:ring-2 focus:ring-accent-700 focus:border-transparent'
                    />
                    {errors.toLocation && (
                      <p className='text-status-danger-text text-xs mt-1'>{errors.toLocation.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className='block text-sm font-medium text-secondary mb-1'>
                      Distance (km) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...register('distanceKm')}
                      placeholder="0.00"
                      className='w-full px-4 py-2 border border-subtle rounded-lg bg-[var(--bg-input)] text-primary focus:ring-2 focus:ring-accent-700 focus:border-transparent'
                    />
                    {errors.distanceKm && (
                      <p className='text-status-danger-text text-xs mt-1'>{errors.distanceKm.message}</p>
                    )}
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-secondary mb-1'>
                      Vehicle Type *
                    </label>
                    <select
                      {...register('vehicleType')}
                      className='w-full px-4 py-2 border border-subtle rounded-lg bg-[var(--bg-input)] text-primary focus:ring-2 focus:ring-accent-700 focus:border-transparent'
                    >
                      <option value="CAR">Car</option>
                      <option value="MOTORCYCLE">Motorcycle</option>
                      <option value="BICYCLE">Bicycle</option>
                      <option value="PUBLIC_TRANSPORT">Public Transport</option>
                    </select>
                  </div>
                </div>

                {estimatedReimbursement > 0 && (
                  <div
                    className='bg-accent-subtle rounded-lg p-2 border border-[var(--accent-primary)]'>
                    <p className='text-sm text-accent'>
                      Estimated reimbursement:{' '}
                      <span className="font-bold">{formatCurrency(estimatedReimbursement)}</span>
                    </p>
                  </div>
                )}

                <div>
                  <label className='block text-sm font-medium text-secondary mb-1'>
                    Purpose
                  </label>
                  <input
                    type="text"
                    {...register('purpose')}
                    placeholder="e.g., Client meeting, site visit"
                    className='w-full px-4 py-2 border border-subtle rounded-lg bg-[var(--bg-input)] text-primary focus:ring-2 focus:ring-accent-700 focus:border-transparent'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-secondary mb-1'>
                    Notes
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={2}
                    placeholder="Additional notes..."
                    className='w-full px-4 py-2 border border-subtle rounded-lg bg-[var(--bg-input)] text-primary focus:ring-2 focus:ring-accent-700 focus:border-transparent'
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className='px-4 py-2 text-sm text-secondary hover:bg-surface rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
                className='px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-inverse rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
              >
                {createMutation.isPending ? 'Creating...' : 'Create Log'}
              </button>
            </ModalFooter>
          </form>
        </Modal>

        {/* Reject Modal */}
        <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} size="sm">
          <ModalHeader onClose={() => setShowRejectModal(false)}>Reject Mileage Log</ModalHeader>
          <ModalBody>
            <div>
              <label className='block text-sm font-medium text-secondary mb-1'>
                Rejection Reason *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for rejection..."
                className='w-full px-4 py-2 border border-subtle rounded-lg bg-[var(--bg-input)] text-primary focus:ring-2 focus:ring-accent-700 focus:border-transparent'
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setShowRejectModal(false)}
              className='px-4 py-2 text-sm text-secondary hover:bg-surface rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
            >
              Cancel
            </button>
            <button
              onClick={handleRejectLog}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              className='px-4 py-2 text-sm bg-status-danger-bg hover:bg-status-danger-bg text-inverse rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </button>
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}

// ─── Row Component ─────────────────────────────────────────────────────────

interface MileageLogRowProps {
  log: MileageLogEntry;
  onSubmit: (logId: string) => void;
  isSubmitting: boolean;
}

function MileageLogRow({log, onSubmit, isSubmitting}: MileageLogRowProps) {
  return (
    <tr>
      <td className='px-4 py-2 text-primary'>{log.travelDate}</td>
      <td className='px-4 py-2 text-secondary'>
        <div className="flex items-center gap-1">
          <span>{log.fromLocation}</span>
          <span className='text-muted'>&rarr;</span>
          <span>{log.toLocation}</span>
        </div>
        {log.purpose && <p className='text-xs text-muted mt-0.5'>{log.purpose}</p>}
      </td>
      <td className='px-4 py-2 font-medium text-primary'>{log.distanceKm} km</td>
      <td className='px-4 py-2 text-secondary'>
        {VEHICLE_LABELS[log.vehicleType]}
      </td>
      <td className='px-4 py-2 font-medium text-primary'>
        {formatCurrency(log.reimbursementAmount)}
        <p className='text-xs text-muted'>@ {formatCurrency(log.ratePerKm)}/km</p>
      </td>
      <td className="px-4 py-2">
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[log.status]}`}>
          {log.status}
        </span>
        {log.rejectionReason && (
          <p className='text-xs text-status-danger-text mt-1'>{log.rejectionReason}</p>
        )}
      </td>
      <td className="px-4 py-2 text-right">
        {log.status === 'DRAFT' && (
          <button
            onClick={() => onSubmit(log.id)}
            disabled={isSubmitting}
            className='flex items-center gap-1 px-2 py-1.5 text-xs bg-accent hover:bg-accent-hover text-inverse rounded-lg transition-colors disabled:opacity-50 ml-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
          >
            <Send className="h-3 w-3"/>
            Submit
          </button>
        )}
      </td>
    </tr>
  );
}
