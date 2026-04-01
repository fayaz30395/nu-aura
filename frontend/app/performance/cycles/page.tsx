'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import { ReviewCycle, ReviewCycleRequest, CycleType, CycleStatus, ActivateCycleRequest, ActivateCycleResponse } from '@/lib/types/grow/performance';
import { Play, Users, CheckCircle, Building2, MapPin } from 'lucide-react';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const cycleFormSchema = z.object({
  name: z.string().min(1, 'Cycle name is required').max(255),
  description: z.string().max(1000).optional().or(z.literal('')),
  cycleType: z.enum(['ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'MONTHLY', 'PROBATION', 'PROJECT_END'] as const) as z.ZodType<CycleType>,
  status: z.enum(['PLANNING', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const) as z.ZodType<CycleStatus>,
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reviewDeadline: z.string().min(1, 'Review deadline is required'),
  selfReviewDeadline: z.string().optional().or(z.literal('')),
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

type CycleFormData = z.infer<typeof cycleFormSchema>;
import {
  usePerformanceAllCycles,
  useCreatePerformanceCycle,
  useUpdatePerformanceCycle,
  useDeletePerformanceCycle,
  useActivatePerformanceCycle,
} from '@/lib/hooks/queries/usePerformance';
import { useActiveDepartments } from '@/lib/hooks/queries/useDepartments';
import { useActiveOfficeLocations } from '@/lib/hooks/queries/useOfficeLocations';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

export default function ReviewCyclesPage() {
  // React Query hooks
  const { data: cyclesResponse, isLoading: cyclesLoading } = usePerformanceAllCycles();
  const { data: departmentsData = [] } = useActiveDepartments();
  const { data: locationsData = [] } = useActiveOfficeLocations();
  const createMutation = useCreatePerformanceCycle();
  const updateMutation = useUpdatePerformanceCycle();
  const deleteMutation = useDeletePerformanceCycle();
  const activateMutation = useActivatePerformanceCycle();

  const cycles = cyclesResponse?.content || [];
  const loading = cyclesLoading;
  const departments = departmentsData;
  const locations = locationsData;
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showActivationResult, setShowActivationResult] = useState(false);
  const [activationResult, setActivationResult] = useState<ActivateCycleResponse | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<ReviewCycle | null>(null);
  const [filterType, setFilterType] = useState<CycleType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<CycleStatus | 'ALL'>('ALL');
  const [activateFormData, setActivateFormData] = useState<ActivateCycleRequest>({
    scopeType: 'ALL',
    departmentIds: [],
    locationIds: [],
    createSelfReviews: true,
    createManagerReviews: true,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CycleFormData>({
    resolver: zodResolver(cycleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      cycleType: 'ANNUAL',
      status: 'PLANNING',
      startDate: '',
      endDate: '',
      reviewDeadline: '',
      selfReviewDeadline: '',
    },
  });

  const handleFormSubmit = (data: CycleFormData) => {
    const cycleData = {
      ...data,
      description: data.description || '',
      selfReviewDeadline: data.selfReviewDeadline || '',
    };

    if (selectedCycle) {
      updateMutation.mutate({ id: selectedCycle.id, data: cycleData as ReviewCycleRequest });
    } else {
      createMutation.mutate(cycleData as ReviewCycleRequest);
    }

    setShowModal(false);
    resetFormHandler();
  };

  const handleDelete = () => {
    if (!selectedCycle) return;
    deleteMutation.mutate(selectedCycle.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        setSelectedCycle(null);
      },
    });
  };

  const openEditModal = (cycle: ReviewCycle) => {
    setSelectedCycle(cycle);
    reset({
      name: cycle.name,
      description: cycle.description || '',
      cycleType: cycle.cycleType,
      status: cycle.status,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      reviewDeadline: cycle.reviewDeadline,
      selfReviewDeadline: cycle.selfReviewDeadline || '',
    });
    setShowModal(true);
  };

  const openDeleteConfirm = (cycle: ReviewCycle) => {
    setSelectedCycle(cycle);
    setShowDeleteConfirm(true);
  };

  const openActivateModal = (cycle: ReviewCycle) => {
    setSelectedCycle(cycle);
    setActivateFormData({
      scopeType: 'ALL',
      departmentIds: [],
      locationIds: [],
      createSelfReviews: true,
      createManagerReviews: true,
    });
    setShowActivateModal(true);
  };

  const handleActivate = () => {
    if (!selectedCycle) return;
    activateMutation.mutate(
      { id: selectedCycle.id, data: activateFormData },
      {
        onSuccess: (result) => {
          setActivationResult(result);
          setShowActivateModal(false);
          setShowActivationResult(true);
        },
      }
    );
  };

  const handleDepartmentToggle = (deptId: string) => {
    setActivateFormData(prev => ({
      ...prev,
      departmentIds: prev.departmentIds?.includes(deptId)
        ? prev.departmentIds.filter(id => id !== deptId)
        : [...(prev.departmentIds || []), deptId],
    }));
  };

  const handleLocationToggle = (locId: string) => {
    setActivateFormData(prev => ({
      ...prev,
      locationIds: prev.locationIds?.includes(locId)
        ? prev.locationIds.filter(id => id !== locId)
        : [...(prev.locationIds || []), locId],
    }));
  };

  const resetFormHandler = () => {
    setSelectedCycle(null);
    reset({
      name: '',
      description: '',
      cycleType: 'ANNUAL',
      status: 'PLANNING',
      startDate: '',
      endDate: '',
      reviewDeadline: '',
      selfReviewDeadline: '',
    });
  };

  const getStatusColor = (status: CycleStatus) => {
    switch (status) {
      case 'PLANNING': return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
      case 'ACTIVE': return 'bg-accent-50 dark:bg-accent-950/30 text-accent-800 dark:text-accent-400';
      case 'IN_PROGRESS': return 'bg-warning-100 text-warning-800';
      case 'COMPLETED': return 'bg-success-100 text-success-800';
      case 'CANCELLED': return 'bg-danger-100 text-danger-800';
      default: return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
    }
  };

  const getTypeColor = (type: CycleType) => {
    switch (type) {
      case 'ANNUAL': return 'bg-accent-300 text-accent-900';
      case 'SEMI_ANNUAL': return 'bg-accent-100 text-accent-800';
      case 'QUARTERLY': return 'bg-accent-50 dark:bg-accent-950/30 text-accent-800 dark:text-accent-400';
      case 'MONTHLY': return 'bg-success-100 text-success-800';
      case 'PROBATION': return 'bg-warning-100 text-warning-800';
      case 'PROJECT_END': return 'bg-accent-300 text-accent-900';
      default: return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
    }
  };

  const isDeadlineNear = (deadline?: string) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline <= 7 && daysUntilDeadline >= 0;
  };

  const isDeadlinePassed = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const filteredCycles = cycles.filter(cycle => {
    if (filterType !== 'ALL' && cycle.cycleType !== filterType) return false;
    if (filterStatus !== 'ALL' && cycle.status !== filterStatus) return false;
    return true;
  });

  return (
    <AppLayout activeMenuItem="performance">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold skeuo-emboss">Review Cycles</h1>
          <PermissionGate permission={Permissions.REVIEW_CREATE}>
            <button
              onClick={() => {
                resetFormHandler();
                setShowModal(true);
              }}
              className="px-4 py-2 bg-accent-700 text-white rounded-lg hover:bg-accent-700"
            >
              Create Cycle
            </button>
          </PermissionGate>
        </div>

        <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg shadow-[var(--shadow-elevated)] p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Filter by Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as CycleType | 'ALL')}
                className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="ALL">All Types</option>
                <option value="ANNUAL">Annual</option>
                <option value="SEMI_ANNUAL">Semi-Annual</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="PROBATION">Probation</option>
                <option value="PROJECT_END">Project End</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as CycleStatus | 'ALL')}
                className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="ALL">All Status</option>
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-[var(--text-secondary)]">Loading review cycles...</div>
          </div>
        ) : filteredCycles.length === 0 ? (
          <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg shadow-[var(--shadow-elevated)] p-12 text-center">
            <div className="text-[var(--text-secondary)] mb-4">No review cycles found</div>
            <PermissionGate permission={Permissions.REVIEW_CREATE}>
              <button
                onClick={() => {
                  resetFormHandler();
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-accent-700 text-white rounded-lg hover:bg-accent-700"
              >
                Create Your First Cycle
              </button>
            </PermissionGate>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCycles.map((cycle) => (
              <div key={cycle.id} className="card-interactive p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{cycle.name}</h3>
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <span className={'px-2 py-1 rounded text-xs font-medium ' + getTypeColor(cycle.cycleType)}>
                        {cycle.cycleType}
                      </span>
                      <span className={'px-2 py-1 rounded text-xs font-medium ' + getStatusColor(cycle.status)}>
                        {cycle.status}
                      </span>
                    </div>
                  </div>
                </div>

                {cycle.description && (
                  <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">{cycle.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <span className="text-[var(--text-secondary)]">Period:</span>
                    <div className="font-medium">
                      {cycle.startDate ? new Date(cycle.startDate).toLocaleDateString() : 'N/A'} - {cycle.endDate ? new Date(cycle.endDate).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>

                  <div className="text-sm">
                    <span className="text-[var(--text-secondary)]">Review Deadline:</span>
                    <div className={'font-medium ' + (isDeadlinePassed(cycle.reviewDeadline) ? 'text-danger-600' : isDeadlineNear(cycle.reviewDeadline) ? 'text-warning-600' : '')}>
                      {cycle.reviewDeadline ? new Date(cycle.reviewDeadline).toLocaleDateString() : 'N/A'}
                      {isDeadlinePassed(cycle.reviewDeadline) && ' (Passed)'}
                      {isDeadlineNear(cycle.reviewDeadline) && !isDeadlinePassed(cycle.reviewDeadline) && ' (Soon)'}
                    </div>
                  </div>

                  {cycle.selfReviewDeadline && (
                    <div className="text-sm">
                      <span className="text-[var(--text-secondary)]">Self Review Deadline:</span>
                      <div className={'font-medium ' + (isDeadlinePassed(cycle.selfReviewDeadline) ? 'text-danger-600' : isDeadlineNear(cycle.selfReviewDeadline) ? 'text-warning-600' : '')}>
                        {new Date(cycle.selfReviewDeadline).toLocaleDateString()}
                        {isDeadlinePassed(cycle.selfReviewDeadline) && ' (Passed)'}
                        {isDeadlineNear(cycle.selfReviewDeadline) && !isDeadlinePassed(cycle.selfReviewDeadline) && ' (Soon)'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {cycle.status === 'PLANNING' && (
                    <PermissionGate permission={Permissions.REVIEW_UPDATE}>
                      <button
                        onClick={() => openActivateModal(cycle)}
                        className="flex-1 px-4 py-2 tint-success text-success-600 dark:text-success-400 rounded hover:opacity-80 text-sm font-medium flex items-center justify-center gap-1"
                      >
                        <Play className="h-4 w-4" />
                        Activate
                      </button>
                    </PermissionGate>
                  )}
                  <PermissionGate permission={Permissions.REVIEW_UPDATE}>
                    <button
                      onClick={() => openEditModal(cycle)}
                      className="flex-1 px-4 py-2 tint-info text-accent-700 dark:text-accent-400 rounded hover:opacity-80 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </PermissionGate>
                  <PermissionGate permission={Permissions.REVIEW_DELETE}>
                    <button
                      onClick={() => openDeleteConfirm(cycle)}
                      className="flex-1 px-4 py-2 tint-danger text-danger-600 rounded hover:opacity-80 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </PermissionGate>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">
                  {selectedCycle ? 'Edit Review Cycle' : 'Create Review Cycle'}
                </h2>
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Cycle Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Annual Review 2024"
                        {...register('name')}
                        className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                      {errors.name && (
                        <p className="text-danger-500 text-sm mt-1">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        {...register('description')}
                        className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                      {errors.description && (
                        <p className="text-danger-500 text-sm mt-1">{errors.description.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Cycle Type *
                        </label>
                        <select
                          {...register('cycleType')}
                          className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                        >
                          <option value="ANNUAL">Annual</option>
                          <option value="SEMI_ANNUAL">Semi-Annual</option>
                          <option value="QUARTERLY">Quarterly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="PROBATION">Probation</option>
                          <option value="PROJECT_END">Project End</option>
                        </select>
                        {errors.cycleType && (
                          <p className="text-danger-500 text-sm mt-1">{errors.cycleType.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Status *
                        </label>
                        <select
                          {...register('status')}
                          className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                        >
                          <option value="PLANNING">Planning</option>
                          <option value="ACTIVE">Active</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                        {errors.status && (
                          <p className="text-danger-500 text-sm mt-1">{errors.status.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          {...register('startDate')}
                          className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                        />
                        {errors.startDate && (
                          <p className="text-danger-500 text-sm mt-1">{errors.startDate.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          End Date *
                        </label>
                        <input
                          type="date"
                          {...register('endDate')}
                          className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                        />
                        {errors.endDate && (
                          <p className="text-danger-500 text-sm mt-1">{errors.endDate.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Review Deadline *
                        </label>
                        <input
                          type="date"
                          {...register('reviewDeadline')}
                          className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                        />
                        {errors.reviewDeadline && (
                          <p className="text-danger-500 text-sm mt-1">{errors.reviewDeadline.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Self Review Deadline
                        </label>
                        <input
                          type="date"
                          {...register('selfReviewDeadline')}
                          className="w-full px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                        />
                        {errors.selfReviewDeadline && (
                          <p className="text-danger-500 text-sm mt-1">{errors.selfReviewDeadline.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetFormHandler();
                      }}
                      className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
                    >
                      Cancel
                    </button>
                    <PermissionGate permission={selectedCycle ? Permissions.REVIEW_UPDATE : Permissions.REVIEW_CREATE}>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                      >
                        {isSubmitting ? 'Saving...' : selectedCycle ? 'Update' : 'Create'}
                      </button>
                    </PermissionGate>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && selectedCycle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Delete Review Cycle</h2>
              <p className="text-[var(--text-secondary)] mb-6">
                Are you sure you want to delete &quot;{selectedCycle.name}&quot;? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedCycle(null);
                  }}
                  className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
                >
                  Cancel
                </button>
                <PermissionGate permission={Permissions.REVIEW_DELETE}>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </PermissionGate>
              </div>
            </div>
          </div>
        )}

        {/* Activate Modal */}
        {showActivateModal && selectedCycle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
                    <Play className="h-6 w-6 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Activate Review Cycle</h2>
                    <p className="text-xs text-[var(--text-secondary)]">{selectedCycle.name}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Scope Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                      Activation Scope
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        type="button"
                        onClick={() => setActivateFormData({ ...activateFormData, scopeType: 'ALL', departmentIds: [], locationIds: [] })}
                        className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                          activateFormData.scopeType === 'ALL'
                            ? 'border-success-500 tint-success'
                            : 'border-[var(--border-main)] dark:border-[var(--border-main)] hover:border-[var(--border-main)]'
                        }`}
                      >
                        <Users className={`h-6 w-6 ${activateFormData.scopeType === 'ALL' ? 'text-success-600' : 'text-[var(--text-muted)]'}`} />
                        <span className={`text-sm font-medium ${activateFormData.scopeType === 'ALL' ? 'text-success-700 dark:text-success-400' : ''}`}>
                          All Employees
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivateFormData({ ...activateFormData, scopeType: 'DEPARTMENT', locationIds: [] })}
                        className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                          activateFormData.scopeType === 'DEPARTMENT'
                            ? 'border-success-500 tint-success'
                            : 'border-[var(--border-main)] dark:border-[var(--border-main)] hover:border-[var(--border-main)]'
                        }`}
                      >
                        <Building2 className={`h-6 w-6 ${activateFormData.scopeType === 'DEPARTMENT' ? 'text-success-600' : 'text-[var(--text-muted)]'}`} />
                        <span className={`text-sm font-medium ${activateFormData.scopeType === 'DEPARTMENT' ? 'text-success-700 dark:text-success-400' : ''}`}>
                          By Department
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivateFormData({ ...activateFormData, scopeType: 'LOCATION', departmentIds: [] })}
                        className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                          activateFormData.scopeType === 'LOCATION'
                            ? 'border-success-500 tint-success'
                            : 'border-[var(--border-main)] dark:border-[var(--border-main)] hover:border-[var(--border-main)]'
                        }`}
                      >
                        <MapPin className={`h-6 w-6 ${activateFormData.scopeType === 'LOCATION' ? 'text-success-600' : 'text-[var(--text-muted)]'}`} />
                        <span className={`text-sm font-medium ${activateFormData.scopeType === 'LOCATION' ? 'text-success-700 dark:text-success-400' : ''}`}>
                          By Location
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Department Selection */}
                  {activateFormData.scopeType === 'DEPARTMENT' && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                        Select Departments
                      </label>
                      <div className="border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg max-h-48 overflow-y-auto">
                        {departments.length === 0 ? (
                          <p className="p-4 text-sm text-[var(--text-muted)]">No departments available</p>
                        ) : (
                          departments.map((dept) => (
                            <label
                              key={dept.id}
                              className="flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 cursor-pointer border-b border-[var(--border-main)] last:border-b-0"
                            >
                              <input
                                type="checkbox"
                                checked={activateFormData.departmentIds?.includes(dept.id) || false}
                                onChange={() => handleDepartmentToggle(dept.id)}
                                className="h-4 w-4 text-success-600 focus:ring-success-500 border-[var(--border-main)] rounded"
                              />
                              <span className="text-sm">{dept.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                      {activateFormData.departmentIds && activateFormData.departmentIds.length > 0 && (
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          {activateFormData.departmentIds.length} department(s) selected
                        </p>
                      )}
                    </div>
                  )}

                  {/* Location Selection */}
                  {activateFormData.scopeType === 'LOCATION' && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                        Select Locations
                      </label>
                      <div className="border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg max-h-48 overflow-y-auto">
                        {locations.length === 0 ? (
                          <p className="p-4 text-sm text-[var(--text-muted)]">No locations available</p>
                        ) : (
                          locations.map((loc) => (
                            <label
                              key={loc.id}
                              className="flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 cursor-pointer border-b border-[var(--border-main)] last:border-b-0"
                            >
                              <input
                                type="checkbox"
                                checked={activateFormData.locationIds?.includes(loc.id) || false}
                                onChange={() => handleLocationToggle(loc.id)}
                                className="h-4 w-4 text-success-600 focus:ring-success-500 border-[var(--border-main)] rounded"
                              />
                              <div>
                                <span className="text-sm font-medium">{loc.name}</span>
                                <span className="text-xs text-[var(--text-muted)] ml-2">{loc.city}, {loc.country}</span>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                      {activateFormData.locationIds && activateFormData.locationIds.length > 0 && (
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          {activateFormData.locationIds.length} location(s) selected
                        </p>
                      )}
                    </div>
                  )}

                  {/* Review Options */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                      Review Types to Create
                    </label>
                    <div className="space-y-4">
                      <label className="flex items-center gap-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activateFormData.createSelfReviews}
                          onChange={(e) => setActivateFormData({ ...activateFormData, createSelfReviews: e.target.checked })}
                          className="h-4 w-4 text-success-600 focus:ring-success-500 border-[var(--border-main)] rounded"
                        />
                        <div>
                          <span className="text-sm font-medium">Self Reviews</span>
                          <p className="text-xs text-[var(--text-muted)]">Each employee will receive a self-assessment form</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activateFormData.createManagerReviews}
                          onChange={(e) => setActivateFormData({ ...activateFormData, createManagerReviews: e.target.checked })}
                          className="h-4 w-4 text-success-600 focus:ring-success-500 border-[var(--border-main)] rounded"
                        />
                        <div>
                          <span className="text-sm font-medium">Manager Reviews</span>
                          <p className="text-xs text-[var(--text-muted)]">Managers will receive review forms for their direct reports</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowActivateModal(false);
                      setSelectedCycle(null);
                    }}
                    className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleActivate}
                    disabled={loading || (activateFormData.scopeType === 'DEPARTMENT' && (!activateFormData.departmentIds || activateFormData.departmentIds.length === 0)) || (activateFormData.scopeType === 'LOCATION' && (!activateFormData.locationIds || activateFormData.locationIds.length === 0))}
                    className="flex-1 px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Activating...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Activate Cycle
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activation Result Modal */}
        {showActivationResult && activationResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg max-w-md w-full p-6">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-success-100 dark:bg-success-900/30 rounded-full mb-4">
                  <CheckCircle className="h-12 w-12 text-success-600 dark:text-success-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">Cycle Activated!</h2>
                <p className="text-[var(--text-secondary)] mb-6">
                  Review cycle has been successfully activated
                </p>

                <div className="w-full bg-[var(--bg-secondary)] rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-accent-700">{activationResult.employeesInScope}</div>
                      <div className="text-sm text-[var(--text-secondary)]">Employees in Scope</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-success-600">{activationResult.reviewsCreated}</div>
                      <div className="text-sm text-[var(--text-secondary)]">Reviews Created</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowActivationResult(false);
                    setActivationResult(null);
                    setSelectedCycle(null);
                  }}
                  className="w-full px-4 py-2 bg-accent-700 text-white rounded-lg hover:bg-accent-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
