'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { performanceReviewService } from '@/lib/services/performance.service';
import { PerformanceReview, ReviewRequest, ReviewType, ReviewStatus } from '@/lib/types/performance';

export default function PerformanceReviewsPage() {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [filterType, setFilterType] = useState<ReviewType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<ReviewStatus | 'ALL'>('ALL');
  const [formData, setFormData] = useState<ReviewRequest>({
    employeeId: '',
    reviewerId: '',
    cycleId: '',
    reviewType: 'SELF',
    status: 'DRAFT',
    reviewPeriodStart: '',
    reviewPeriodEnd: '',
    overallRating: 0,
    strengths: '',
    areasForImprovement: '',
    goals: '',
    reviewerComments: '',
    employeeComments: '',
    submittedAt: undefined,
    completedAt: undefined,
  });

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await performanceReviewService.getByEmployee(user.employeeId);
      setReviews(response);
    } catch (error) {
      console.error('Error loading reviews:', error);
      alert('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const reviewData = { 
        ...formData, 
        employeeId: user.employeeId,
        reviewerId: formData.reviewerId || user.employeeId
      };

      if (selectedReview) {
        await performanceReviewService.update(selectedReview.id, reviewData);
      } else {
        await performanceReviewService.create(reviewData);
      }

      setShowModal(false);
      resetForm();
      await loadReviews();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save review');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedReview) return;
    try {
      setLoading(true);
      await performanceReviewService.delete(selectedReview.id);
      setShowDeleteConfirm(false);
      setSelectedReview(null);
      await loadReviews();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete review');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (review: PerformanceReview) => {
    setSelectedReview(review);
    setFormData({
      employeeId: review.employeeId,
      reviewerId: review.reviewerId,
      cycleId: review.cycleId || '',
      reviewType: review.reviewType,
      status: review.status,
      reviewPeriodStart: review.reviewPeriodStart,
      reviewPeriodEnd: review.reviewPeriodEnd,
      overallRating: review.overallRating,
      strengths: review.strengths || '',
      areasForImprovement: review.areasForImprovement || '',
      goals: review.goals || '',
      reviewerComments: review.reviewerComments || '',
      employeeComments: review.employeeComments || '',
      submittedAt: review.submittedAt,
      completedAt: review.completedAt,
    });
    setShowModal(true);
  };

  const openDeleteConfirm = (review: PerformanceReview) => {
    setSelectedReview(review);
    setShowDeleteConfirm(true);
  };

  const resetForm = () => {
    setSelectedReview(null);
    setFormData({
      employeeId: '',
      reviewerId: '',
      cycleId: '',
      reviewType: 'SELF',
      status: 'DRAFT',
      reviewPeriodStart: '',
      reviewPeriodEnd: '',
      overallRating: 0,
      strengths: '',
      areasForImprovement: '',
      goals: '',
      reviewerComments: '',
      employeeComments: '',
      submittedAt: undefined,
      completedAt: undefined,
    });
  };

  const getStatusColor = (status: ReviewStatus) => {
    switch (status) {
      case 'DRAFT': return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
      case 'SUBMITTED': return 'bg-primary-50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400';
      case 'IN_REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'APPROVED': return 'bg-purple-100 text-purple-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
    }
  };

  const getTypeColor = (type: ReviewType) => {
    switch (type) {
      case 'SELF': return 'bg-primary-50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400';
      case 'MANAGER': return 'bg-purple-100 text-purple-800';
      case 'PEER': return 'bg-green-100 text-green-800';
      case 'SUBORDINATE': return 'bg-yellow-100 text-yellow-800';
      case 'SKIP_LEVEL': return 'bg-pink-100 text-pink-800';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
    }
  };

  const renderRatingStars = (rating?: number) => {
    const stars = [];
    const ratingValue = rating || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= ratingValue ? 'text-yellow-500' : 'text-surface-300 dark:text-surface-600'}>
          ★
        </span>
      );
    }
    return <div className="flex gap-1">{stars}</div>;
  };

  const filteredReviews = reviews.filter(review => {
    if (filterType !== 'ALL' && review.reviewType !== filterType) return false;
    if (filterStatus !== 'ALL' && review.status !== filterStatus) return false;
    return true;
  });

  return (
    <AppLayout activeMenuItem="performance">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Performance Reviews</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create Review
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
                onChange={(e) => setFilterType(e.target.value as ReviewType | 'ALL')}
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">All Types</option>
                <option value="SELF">Self Review</option>
                <option value="MANAGER">Manager Review</option>
                <option value="PEER">Peer Review</option>
                <option value="SUBORDINATE">Subordinate Review</option>
                <option value="SKIP_LEVEL">Skip Level</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ReviewStatus | 'ALL')}
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="COMPLETED">Completed</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-surface-600 dark:text-surface-400">Loading reviews...</div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-12 text-center">
            <div className="text-surface-600 dark:text-surface-400 mb-4">No reviews found</div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Create Your First Review
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div key={review.id} className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-3">
                      <span className={'px-2 py-1 rounded text-xs font-medium ' + getTypeColor(review.reviewType)}>
                        {review.reviewType}
                      </span>
                      <span className={'px-2 py-1 rounded text-xs font-medium ' + getStatusColor(review.status)}>
                        {review.status}
                      </span>
                    </div>
                    <div className="text-sm text-surface-600 dark:text-surface-400">
                      Period: {review.reviewPeriodStart ? new Date(review.reviewPeriodStart).toLocaleDateString() : 'N/A'} - {review.reviewPeriodEnd ? new Date(review.reviewPeriodEnd).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-surface-600 dark:text-surface-400 mb-1">Overall Rating</div>
                    {renderRatingStars(review.overallRating)}
                    <div className="text-lg font-bold mt-1">{(review.overallRating || 0).toFixed(1)}/5.0</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {review.strengths && (
                    <div>
                      <div className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">Strengths</div>
                      <p className="text-sm text-surface-600 dark:text-surface-400 line-clamp-2">{review.strengths}</p>
                    </div>
                  )}
                  {review.areasForImprovement && (
                    <div>
                      <div className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">Areas for Improvement</div>
                      <p className="text-sm text-surface-600 dark:text-surface-400 line-clamp-2">{review.areasForImprovement}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => openEditModal(review)}
                    className="flex-1 px-3 py-2 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded hover:bg-primary-100 text-sm font-medium"
                  >
                    View/Edit
                  </button>
                  <button
                    onClick={() => openDeleteConfirm(review)}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">
                  {selectedReview ? 'Edit Review' : 'Create Review'}
                </h2>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Review Type *
                        </label>
                        <select
                          required
                          value={formData.reviewType}
                          onChange={(e) => setFormData({ ...formData, reviewType: e.target.value as ReviewType })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="SELF">Self Review</option>
                          <option value="MANAGER">Manager Review</option>
                          <option value="PEER">Peer Review</option>
                          <option value="SUBORDINATE">Subordinate Review</option>
                          <option value="SKIP_LEVEL">Skip Level</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Status *
                        </label>
                        <select
                          required
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as ReviewStatus })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="SUBMITTED">Submitted</option>
                          <option value="IN_REVIEW">In Review</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="APPROVED">Approved</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Review Period Start *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.reviewPeriodStart}
                          onChange={(e) => setFormData({ ...formData, reviewPeriodStart: e.target.value })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          Review Period End *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.reviewPeriodEnd}
                          onChange={(e) => setFormData({ ...formData, reviewPeriodEnd: e.target.value })}
                          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Overall Rating (0-5) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="5"
                        step="0.1"
                        value={formData.overallRating}
                        onChange={(e) => setFormData({ ...formData, overallRating: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Strengths
                      </label>
                      <textarea
                        value={formData.strengths}
                        onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Areas for Improvement
                      </label>
                      <textarea
                        value={formData.areasForImprovement}
                        onChange={(e) => setFormData({ ...formData, areasForImprovement: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Goals
                      </label>
                      <textarea
                        value={formData.goals}
                        onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Reviewer Comments
                      </label>
                      <textarea
                        value={formData.reviewerComments}
                        onChange={(e) => setFormData({ ...formData, reviewerComments: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                        Employee Comments
                      </label>
                      <textarea
                        value={formData.employeeComments}
                        onChange={(e) => setFormData({ ...formData, employeeComments: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
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
                      {loading ? 'Saving...' : selectedReview ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && selectedReview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface-light dark:bg-surface-dark rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Delete Review</h2>
              <p className="text-surface-600 dark:text-surface-400 mb-6">
                Are you sure you want to delete this review? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedReview(null);
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
