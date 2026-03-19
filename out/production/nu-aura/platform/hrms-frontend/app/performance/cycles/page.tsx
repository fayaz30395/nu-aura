'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { reviewCycleService } from '@/lib/services/performance.service';
import { ReviewCycle, ReviewCycleRequest, CycleType, CycleStatus } from '@/lib/types/performance';

export default function ReviewCyclesPage() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<ReviewCycle | null>(null);
  const [filterType, setFilterType] = useState<CycleType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<CycleStatus | 'ALL'>('ALL');
  const [formData, setFormData] = useState<ReviewCycleRequest>({
    name: '',
    description: '',
    cycleType: 'ANNUAL',
    status: 'PLANNING',
    startDate: '',
    endDate: '',
    reviewDeadline: '',
    selfReviewDeadline: '',
  });

  useEffect(() => {
    loadCycles();
  }, []);

  const loadCycles = async () => {
    try {
      setLoading(true);
      const response = await reviewCycleService.getAll();
      setCycles(response.content);
    } catch (error) {
      console.error('Error loading cycles:', error);
      alert('Failed to load review cycles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (selectedCycle) {
        await reviewCycleService.update(selectedCycle.id, formData);
      } else {
        await reviewCycleService.create(formData);
      }

      setShowModal(false);
      resetForm();
      await loadCycles();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save review cycle');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCycle) return;
    try {
      setLoading(true);
      await reviewCycleService.delete(selectedCycle.id);
      setShowDeleteConfirm(false);
      setSelectedCycle(null);
      await loadCycles();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete review cycle');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (cycle: ReviewCycle) => {
    setSelectedCycle(cycle);
    setFormData({
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

  const resetForm = () => {
    setSelectedCycle(null);
    setFormData({
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
      case 'PLANNING': return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
      case 'ACTIVE': return 'bg-primary-50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
    }
  };

  const getTypeColor = (type: CycleType) => {
    switch (type) {
      case 'ANNUAL': return 'bg-purple-100 text-purple-800';
      case 'SEMI_ANNUAL': return 'bg-indigo-100 text-indigo-800';
      case 'QUARTERLY': return 'bg-primary-50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400';
      case 'MONTHLY': return 'bg-green-100 text-green-800';
      case 'PROBATION': return 'bg-orange-100 text-orange-800';
      case 'PROJECT_END': return 'bg-pink-100 text-pink-800';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
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
          <h1 className="text-3xl font-bold">Review Cycles</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create Cycle
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
                onChange={(e) => setFilterType(e.target.value as CycleType | 'ALL')}
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as CycleStatus | 'ALL')}
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            <div className="text-surface-600 dark:text-surface-400">Loading review cycles...</div>
          </div>
        ) : filteredCycles.length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-12 text-center">
            <div className="text-surface-600 dark:text-surface-400 mb-4">No review cycles found</div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Create Your First Cycle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCycles.map((cycle) => (
              <div key={cycle.id} className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{cycle.name}</h3>
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
                  <p className="text-sm text-surface-600 dark:text-surface-400 mb-4 line-clamp-2">{cycle.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <span className="text-surface-600 dark:text-surface-400">Period:</span>
                    <div className="font-medium">
                      {cycle.startDate ? new Date(cycle.startDate).toLocaleDateString() : 'N/A'} - {cycle.endDate ? new Date(cycle.endDate).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>

                  <div className="text-sm">
                    <span className="text-surface-600 dark:text-surface-400">Review Deadline:</span>
                    <div className={'font-medium ' + (isDeadlinePassed(cycle.reviewDeadline) ? 'text-red-600' : isDeadlineNear(cycle.reviewDeadline) ? 'text-orange-600' : '')}>
                      {cycle.reviewDeadline ? new Date(cycle.reviewDeadline).toLocaleDateString() : 'N/A'}
                      {isDeadlinePassed(cycle.reviewDeadline) && ' (Passed)'}
                      {isDeadlineNear(cycle.reviewDeadline) && !isDeadlinePassed(cycle.reviewDeadline) && ' (Soon)'}
                    </div>
                  </div>

                  {cycle.selfReviewDeadline && (
                    <div className="text-sm">
                      <span className="text-surface-600 dark:text-surface-400">Self Review Deadline:</span>
                      <div className={'font-medium ' + (isDeadlinePassed(cycle.selfReviewDeadline) ? 'text-red-600' : isDeadlineNear(cycle.selfReviewDeadline) ? 'text-orange-600' : '')}>
                        {new Date(cycle.selfReviewDeadline).toLocaleDateString()}
                        {isDeadlinePassed(cycle.selfReviewDeadline) && ' (Passed)'}
                        {isDeadlineNear(cycle.selfReviewDeadline) && !isDeadlinePassed(cycle.selfReviewDeadline) && ' (Soon)'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(cycle)}
                    className="flex-1 px-3 py-2 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded hover:bg-primary-100 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteConfirm(cycle)}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">
                  {selectedCycle ? 'Edit Review Cycle' : 'Create Review Cycle'}
                </h2>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Cycle Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g., Annual Review 2024"
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
                          Cycle Type *
                        </label>
                        <select
                          required
                          value={formData.cycleType}
                          onChange={(e) => setFormData({ ...formData, cycleType: e.target.value as CycleType })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="ANNUAL">Annual</option>
                          <option value="SEMI_ANNUAL">Semi-Annual</option>
                          <option value="QUARTERLY">Quarterly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="PROBATION">Probation</option>
                          <option value="PROJECT_END">Project End</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Status *
                        </label>
                        <select
                          required
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as CycleStatus })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="PLANNING">Planning</option>
                          <option value="ACTIVE">Active</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Review Deadline *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.reviewDeadline}
                          onChange={(e) => setFormData({ ...formData, reviewDeadline: e.target.value })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Self Review Deadline
                        </label>
                        <input
                          type="date"
                          value={formData.selfReviewDeadline}
                          onChange={(e) => setFormData({ ...formData, selfReviewDeadline: e.target.value })}
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
                      {loading ? 'Saving...' : selectedCycle ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && selectedCycle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Delete Review Cycle</h2>
              <p className="text-surface-600 dark:text-surface-400 mb-6">
                Are you sure you want to delete "{selectedCycle.name}"? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedCycle(null);
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
