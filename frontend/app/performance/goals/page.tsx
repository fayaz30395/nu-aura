'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { goalService } from '@/lib/services/performance.service';
import { Goal, GoalRequest, GoalType, GoalStatus } from '@/lib/types/performance';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [filterType, setFilterType] = useState<GoalType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<GoalStatus | 'ALL'>('ALL');
  const [formData, setFormData] = useState<GoalRequest>({
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
    parentGoalId: undefined,
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await goalService.getByEmployee(user.employeeId);
      setGoals(response);
    } catch (error) {
      console.error('Error loading goals:', error);
      alert('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const goalData = { ...formData, employeeId: user.employeeId };

      if (selectedGoal) {
        await goalService.update(selectedGoal.id, goalData);
      } else {
        await goalService.create(goalData);
      }

      setShowModal(false);
      resetForm();
      await loadGoals();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save goal');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGoal) return;
    try {
      setLoading(true);
      await goalService.delete(selectedGoal.id);
      setShowDeleteConfirm(false);
      setSelectedGoal(null);
      await loadGoals();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete goal');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setFormData({
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
      parentGoalId: goal.parentGoalId,
    });
    setShowModal(true);
  };

  const openDeleteConfirm = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowDeleteConfirm(true);
  };

  const resetForm = () => {
    setSelectedGoal(null);
    setFormData({
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
      parentGoalId: undefined,
    });
  };

  const getStatusColor = (status: GoalStatus) => {
    switch (status) {
      case 'DRAFT': return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
      case 'ACTIVE': return 'bg-primary-50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'ON_HOLD': return 'bg-orange-100 text-orange-800';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
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
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
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

  return (
    <AppLayout activeMenuItem="performance">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Goals</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create Goal
          </button>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Filter by Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as GoalType | 'ALL')}
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as GoalStatus | 'ALL')}
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            <div className="text-surface-600 dark:text-surface-400">Loading goals...</div>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-12 text-center">
            <div className="text-surface-600 dark:text-surface-400 mb-4">No goals found</div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoals.map((goal) => {
              const progress = calculateProgress(goal.currentValue, goal.targetValue);
              return (
                <div key={goal.id} className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
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
                    <p className="text-sm text-surface-600 dark:text-surface-400 mb-4 line-clamp-2">{goal.description}</p>
                  )}

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-surface-600 dark:text-surface-400">Progress</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                    <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: progress + '%' }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-surface-600 dark:text-surface-400 mt-1">
                      <span>{goal.currentValue} {goal.unit}</span>
                      <span>{goal.targetValue} {goal.unit}</span>
                    </div>
                  </div>

                  <div className="text-sm text-surface-600 dark:text-surface-400 mb-4">
                    <div>Start: {goal.startDate ? new Date(goal.startDate).toLocaleDateString() : 'N/A'}</div>
                    <div>End: {goal.endDate ? new Date(goal.endDate).toLocaleDateString() : 'N/A'}</div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(goal)}
                      className="flex-1 px-3 py-2 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded hover:bg-primary-100 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(goal)}
                      className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">
                  {selectedGoal ? 'Edit Goal' : 'Create Goal'}
                </h2>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Goal Type *
                        </label>
                        <select
                          required
                          value={formData.goalType}
                          onChange={(e) => setFormData({ ...formData, goalType: e.target.value as GoalType })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="OKR">OKR</option>
                          <option value="KPI">KPI</option>
                          <option value="PERSONAL">Personal</option>
                          <option value="TEAM">Team</option>
                          <option value="DEPARTMENT">Department</option>
                          <option value="ORGANIZATION">Organization</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Status *
                        </label>
                        <select
                          required
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as GoalStatus })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="ACTIVE">Active</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                          <option value="ON_HOLD">On Hold</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Target Value *
                        </label>
                        <input
                          type="number"
                          required
                          value={formData.targetValue}
                          onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Current Value *
                        </label>
                        <input
                          type="number"
                          required
                          value={formData.currentValue}
                          onChange={(e) => setFormData({ ...formData, currentValue: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Unit *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          placeholder="e.g., tasks, %"
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          End Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="flex-1 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : selectedGoal ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && selectedGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Delete Goal</h2>
              <p className="text-surface-600 dark:text-surface-400 mb-6">
                Are you sure you want to delete "{selectedGoal.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedGoal(null);
                  }}
                  className="flex-1 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50"
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
