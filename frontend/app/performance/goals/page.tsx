'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import {
  useEmployeeGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
} from '@/lib/hooks/queries/usePerformance';
import { Goal, GoalRequest, GoalType, GoalStatus } from '@/lib/types/performance';
import { useAuth } from '@/lib/hooks/useAuth';
import { createLogger } from '@/lib/utils/logger';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

const log = createLogger('GoalsPage');

// ─── Validation Schemas ───────────────────────────────────────────────────────

const goalFormSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional().or(z.literal('')),
  goalType: z.enum(['OKR', 'KPI', 'PERSONAL', 'TEAM', 'DEPARTMENT', 'ORGANIZATION'] as const) as z.ZodType<GoalType>,
  targetValue: z.number({ coerce: true }).min(0, 'Target value must be >= 0'),
  currentValue: z.number({ coerce: true }).min(0, 'Current value must be >= 0'),
  unit: z.string().min(1, 'Unit is required'),
  status: z.enum(['DRAFT', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD'] as const) as z.ZodType<GoalStatus>,
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

type GoalFormData = z.infer<typeof goalFormSchema>;

export default function GoalsPage() {
  const { user } = useAuth();
  const goalsQuery = useEmployeeGoals(user?.employeeId || '');
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [filterType, setFilterType] = useState<GoalType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<GoalStatus | 'ALL'>('ALL');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      employeeId: '',
      title: '',
      description: '',
      goalType: 'PERSONAL',
      targetValue: 0,
      currentValue: 0,
      unit: '',
      status: 'DRAFT',
      startDate: '',
      endDate: '',
    },
  });

  const goals = goalsQuery.data || [];
  const loading = goalsQuery.isLoading || createGoalMutation.isPending || updateGoalMutation.isPending || deleteGoalMutation.isPending;

  const handleFormSubmit = async (formData: GoalFormData) => {
    try {
      const goalData = {
        ...formData,
        employeeId: user?.employeeId || '',
        description: formData.description || '',
      };

      if (selectedGoal) {
        await updateGoalMutation.mutateAsync({ id: selectedGoal.id, data: goalData as GoalRequest });
      } else {
        await createGoalMutation.mutateAsync(goalData as GoalRequest);
      }

      setShowModal(false);
      resetFormHandler();
    } catch (error: unknown) {
      log.error('Error saving goal:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedGoal) return;
    try {
      await deleteGoalMutation.mutateAsync(selectedGoal.id);
      setShowDeleteConfirm(false);
      setSelectedGoal(null);
    } catch (error: unknown) {
      log.error('Error deleting goal:', error);
    }
  };

  const openEditModal = (goal: Goal) => {
    setSelectedGoal(goal);
    reset({
      employeeId: goal.employeeId,
      title: goal.title,
      description: goal.description || '',
      goalType: goal.goalType,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      unit: goal.unit,
      status: goal.status,
      startDate: goal.startDate,
      endDate: goal.endDate,
    });
    setShowModal(true);
  };

  const openDeleteConfirm = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowDeleteConfirm(true);
  };

  const resetFormHandler = () => {
    setSelectedGoal(null);
    reset({
      employeeId: '',
      title: '',
      description: '',
      goalType: 'PERSONAL',
      targetValue: 0,
      currentValue: 0,
      unit: '',
      status: 'DRAFT',
      startDate: '',
      endDate: '',
    });
  };

  const getStatusColor = (status: GoalStatus) => {
    switch (status) {
      case 'DRAFT': return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
      case 'ACTIVE': return 'bg-primary-50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'ON_HOLD': return 'bg-orange-100 text-orange-800';
      default: return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
    }
  };

  const getTypeColor = (type: GoalType) => {
    switch (type) {
      case 'OKR': return 'bg-purple-100 text-purple-800';
      case 'KPI': return 'bg-indigo-100 text-indigo-800';
      case 'PERSONAL': return 'bg-green-100 text-green-800';
      case 'TEAM': return 'bg-primary-50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400';
      case 'DEPARTMENT': return 'bg-pink-100 text-pink-800';
      case 'ORGANIZATION': return 'bg-red-100 text-red-800';
      default: return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
    }
  };

  const calculateProgress = (current?: number, target?: number) => {
    if (!target || target === 0) return 0;
    return Math.min(Math.round(((current || 0) / target) * 100), 100);
  };

  const filteredGoals = goals.filter(goal => {
    if (filterType !== 'ALL' && goal.goalType !== filterType) return false;
    if (filterStatus !== 'ALL' && goal.status !== filterStatus) return false;
    return true;
  });

  if (!user?.employeeId) {
    return (
      <AppLayout activeMenuItem="performance">
        <div className="text-center py-12">
          <div className="h-16 w-16 mx-auto text-[var(--text-muted)] mb-4">
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No Employee Profile Linked</h2>
          <p className="text-[var(--text-muted)] max-w-md mx-auto">
            Goal management requires an employee profile. Use the admin panels to manage employee goals.
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-6 btn-primary !h-auto transition-colors"
          >
            Go Back
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="performance">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold skeuo-emboss">Goals</h1>
          <PermissionGate permission={Permissions.GOAL_CREATE}>
            <button
              onClick={() => {
                resetFormHandler();
                setShowModal(true);
              }}
              className="btn-primary !h-auto"
            >
              Create Goal
            </button>
          </PermissionGate>
        </div>

        <div className="skeuo-card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Filter by Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as GoalType | 'ALL')}
                className="input-aura"
              >
                <option value="ALL">All Types</option>
                <option value="OKR">OKR</option>
                <option value="KPI">KPI</option>
                <option value="PERSONAL">Personal</option>
                <option value="TEAM">Team</option>
                <option value="DEPARTMENT">Department</option>
                <option value="ORGANIZATION">Organization</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as GoalStatus | 'ALL')}
                className="input-aura"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-[var(--text-secondary)]">Loading goals...</div>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="skeuo-card p-12 text-center">
            <div className="text-[var(--text-secondary)] mb-4">No goals found</div>
            <PermissionGate permission={Permissions.GOAL_CREATE}>
              <button
                onClick={() => {
                  resetFormHandler();
                  setShowModal(true);
                }}
                className="btn-primary !h-auto"
              >
                Create Your First Goal
              </button>
            </PermissionGate>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoals.map((goal) => {
              const progress = calculateProgress(goal.currentValue, goal.targetValue);
              return (
                <div key={goal.id} className="skeuo-card p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{goal.title}</h3>
                      <div className="flex gap-2 mb-3">
                        <span className={'px-2 py-1 rounded text-xs font-medium ' + getTypeColor(goal.goalType)}>
                          {goal.goalType}
                        </span>
                        <span className={'px-2 py-1 rounded text-xs font-medium ' + getStatusColor(goal.status)}>
                          {goal.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {goal.description && (
                    <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">{goal.description}</p>
                  )}

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[var(--text-secondary)]">Progress</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                    <div className="w-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: progress + '%' }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
                      <span>{goal.currentValue} {goal.unit}</span>
                      <span>{goal.targetValue} {goal.unit}</span>
                    </div>
                  </div>

                  <div className="text-sm text-[var(--text-secondary)] mb-4">
                    <div>Start: {goal.startDate ? new Date(goal.startDate).toLocaleDateString() : 'N/A'}</div>
                    <div>End: {goal.endDate ? new Date(goal.endDate).toLocaleDateString() : 'N/A'}</div>
                  </div>

                  <div className="flex gap-2">
                    <PermissionGate permission={Permissions.GOAL_UPDATE}>
                      <button
                        onClick={() => openEditModal(goal)}
                        className="flex-1 px-3 py-2 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded hover:bg-primary-100 text-sm font-medium"
                      >
                        Edit
                      </button>
                    </PermissionGate>
                    <PermissionGate permission={Permissions.GOAL_DELETE}>
                      <button
                        onClick={() => openDeleteConfirm(goal)}
                        className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 glass-aura !rounded-none flex items-center justify-center p-4 z-50">
            <div className="skeuo-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">
                  {selectedGoal ? 'Edit Goal' : 'Create Goal'}
                </h2>
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Title *
                      </label>
                      <input
                        type="text"
                        {...register('title')}
                        className="input-aura"
                      />
                      {errors.title && (
                        <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        {...register('description')}
                        className="input-aura"
                      />
                      {errors.description && (
                        <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Goal Type *
                        </label>
                        <select
                          {...register('goalType')}
                          className="input-aura"
                        >
                          <option value="OKR">OKR</option>
                          <option value="KPI">KPI</option>
                          <option value="PERSONAL">Personal</option>
                          <option value="TEAM">Team</option>
                          <option value="DEPARTMENT">Department</option>
                          <option value="ORGANIZATION">Organization</option>
                        </select>
                        {errors.goalType && (
                          <p className="text-red-500 text-sm mt-1">{errors.goalType.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Status *
                        </label>
                        <select
                          {...register('status')}
                          className="input-aura"
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="ACTIVE">Active</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                          <option value="ON_HOLD">On Hold</option>
                        </select>
                        {errors.status && (
                          <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Target Value *
                        </label>
                        <input
                          type="number"
                          {...register('targetValue')}
                          className="input-aura"
                        />
                        {errors.targetValue && (
                          <p className="text-red-500 text-sm mt-1">{errors.targetValue.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Current Value *
                        </label>
                        <input
                          type="number"
                          {...register('currentValue')}
                          className="input-aura"
                        />
                        {errors.currentValue && (
                          <p className="text-red-500 text-sm mt-1">{errors.currentValue.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Unit *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., tasks, %"
                          {...register('unit')}
                          className="input-aura"
                        />
                        {errors.unit && (
                          <p className="text-red-500 text-sm mt-1">{errors.unit.message}</p>
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
                          className="input-aura"
                        />
                        {errors.startDate && (
                          <p className="text-red-500 text-sm mt-1">{errors.startDate.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          End Date *
                        </label>
                        <input
                          type="date"
                          {...register('endDate')}
                          className="input-aura"
                        />
                        {errors.endDate && (
                          <p className="text-red-500 text-sm mt-1">{errors.endDate.message}</p>
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
                      className="flex-1 btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 btn-primary !h-auto disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : selectedGoal ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && selectedGoal && (
          <div className="fixed inset-0 glass-aura !rounded-none flex items-center justify-center p-4 z-50">
            <div className="skeuo-card max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Delete Goal</h2>
              <p className="text-[var(--text-secondary)] mb-6">
                Are you sure you want to delete &quot;{selectedGoal.title}&quot;? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedGoal(null);
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
