'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import {
  useEmployeeReviews,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
} from '@/lib/hooks/queries/usePerformance';
import { PerformanceReview, ReviewRequest, ReviewType, ReviewStatus } from '@/lib/types/performance';
import { useAuth } from '@/lib/hooks/useAuth';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const reviewFormSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  reviewerId: z.string().min(1, 'Reviewer ID is required'),
  cycleId: z.string().optional().or(z.literal('')),
  reviewType: z.enum(['SELF', 'MANAGER', 'PEER', 'SUBORDINATE', 'SKIP_LEVEL'] as const) as z.ZodType<ReviewType>,
  status: z.enum(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'COMPLETED', 'APPROVED', 'REJECTED'] as const) as z.ZodType<ReviewStatus>,
  reviewPeriodStart: z.string().min(1, 'Review period start is required'),
  reviewPeriodEnd: z.string().min(1, 'Review period end is required'),
  overallRating: z.number({ coerce: true }).min(0, 'Min 0').max(5, 'Max 5'),
  strengths: z.string().optional().or(z.literal('')),
  areasForImprovement: z.string().optional().or(z.literal('')),
  goals: z.string().optional().or(z.literal('')),
  reviewerComments: z.string().optional().or(z.literal('')),
  employeeComments: z.string().optional().or(z.literal('')),
}).refine(data => new Date(data.reviewPeriodEnd) > new Date(data.reviewPeriodStart), {
  message: 'Review period end must be after start',
  path: ['reviewPeriodEnd'],
});

type ReviewFormData = z.infer<typeof reviewFormSchema>;

export default function PerformanceReviewsPage() {
  const { user } = useAuth();
  const reviewsQuery = useEmployeeReviews(user?.employeeId || '');
  const createReviewMutation = useCreateReview();
  const updateReviewMutation = useUpdateReview();
  const deleteReviewMutation = useDeleteReview();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [filterType, setFilterType] = useState<ReviewType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<ReviewStatus | 'ALL'>('ALL');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
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
    },
  });

  const reviews = reviewsQuery.data || [];
  const loading = reviewsQuery.isLoading || createReviewMutation.isPending || updateReviewMutation.isPending || deleteReviewMutation.isPending;

  const handleFormSubmit = async (formData: ReviewFormData) => {
    try {
      const reviewData = {
        ...formData,
        cycleId: formData.cycleId || '',
        employeeId: user?.employeeId || '',
        reviewerId: formData.reviewerId || user?.employeeId || '',
        strengths: formData.strengths || '',
        areasForImprovement: formData.areasForImprovement || '',
        goals: formData.goals || '',
        reviewerComments: formData.reviewerComments || '',
        employeeComments: formData.employeeComments || '',
      };

      if (selectedReview) {
        await updateReviewMutation.mutateAsync({ id: selectedReview.id, data: reviewData as ReviewRequest });
      } else {
        await createReviewMutation.mutateAsync(reviewData as ReviewRequest);
      }

      setShowModal(false);
      resetFormHandler();
    } catch (error: unknown) {
      console.error('Error saving review:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedReview) return;
    try {
      await deleteReviewMutation.mutateAsync(selectedReview.id);
      setShowDeleteConfirm(false);
      setSelectedReview(null);
    } catch (error: unknown) {
      console.error('Error deleting review:', error);
    }
  };

  const openEditModal = (review: PerformanceReview) => {
    setSelectedReview(review);
    reset({
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
    });
    setShowModal(true);
  };

  const openDeleteConfirm = (review: PerformanceReview) => {
    setSelectedReview(review);
    setShowDeleteConfirm(true);
  };

  const resetFormHandler = () => {
    setSelectedReview(null);
    reset({
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
    });
  };

  const getStatusColor = (status: ReviewStatus) => {
    switch (status) {
      case 'DRAFT': return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
      case 'SUBMITTED': return 'bg-primary-50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400';
      case 'IN_REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'APPROVED': return 'bg-purple-100 text-purple-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
    }
  };

  const getTypeColor = (type: ReviewType) => {
    switch (type) {
      case 'SELF': return 'bg-primary-50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400';
      case 'MANAGER': return 'bg-purple-100 text-purple-800';
      case 'PEER': return 'bg-green-100 text-green-800';
      case 'SUBORDINATE': return 'bg-yellow-100 text-yellow-800';
      case 'SKIP_LEVEL': return 'bg-pink-100 text-pink-800';
      default: return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
    }
  };

  const renderRatingStars = (rating?: number) => {
    const stars = [];
    const ratingValue = rating || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= ratingValue ? 'text-yellow-500' : 'text-[var(--text-muted)] dark:text-[var(--text-secondary)]'}>
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

  if (!user?.employeeId) {
    return (
      <AppLayout activeMenuItem="performance">
        <div className="text-center py-12">
          <div className="h-16 w-16 mx-auto text-slate-300 mb-4">
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Employee Profile Linked</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Performance reviews require an employee profile. Use the admin panels to manage employee reviews.
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
          <h1 className="text-3xl font-bold">Performance Reviews</h1>
          <button
            onClick={() => {
              resetFormHandler();
              setShowModal(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create Review
          </button>
        </div>

        <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Filter by Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as ReviewType | 'ALL')}
                className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ReviewStatus | 'ALL')}
                className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            <div className="text-[var(--text-secondary)]">Loading reviews...</div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg shadow-md p-12 text-center">
            <div className="text-[var(--text-secondary)] mb-4">No reviews found</div>
            <button
              onClick={() => {
                resetFormHandler();
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
              <div key={review.id} className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
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
                    <div className="text-sm text-[var(--text-secondary)]">
                      Period: {review.reviewPeriodStart ? new Date(review.reviewPeriodStart).toLocaleDateString() : 'N/A'} - {review.reviewPeriodEnd ? new Date(review.reviewPeriodEnd).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-[var(--text-secondary)] mb-1">Overall Rating</div>
                    {renderRatingStars(review.overallRating)}
                    <div className="text-lg font-bold mt-1">{(review.overallRating || 0).toFixed(1)}/5.0</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {review.strengths && (
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-secondary)] mb-1">Strengths</div>
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{review.strengths}</p>
                    </div>
                  )}
                  {review.areasForImprovement && (
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-secondary)] mb-1">Areas for Improvement</div>
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{review.areasForImprovement}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => openEditModal(review)}
                    className="flex-1 px-3 py-2 tint-info text-primary-600 dark:text-primary-400 rounded hover:opacity-80 text-sm font-medium"
                  >
                    View/Edit
                  </button>
                  <button
                    onClick={() => openDeleteConfirm(review)}
                    className="flex-1 px-3 py-2 tint-danger text-red-600 rounded hover:opacity-80 text-sm font-medium"
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
            <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">
                  {selectedReview ? 'Edit Review' : 'Create Review'}
                </h2>
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Review Type *
                        </label>
                        <select
                          {...register('reviewType')}
                          className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="SELF">Self Review</option>
                          <option value="MANAGER">Manager Review</option>
                          <option value="PEER">Peer Review</option>
                          <option value="SUBORDINATE">Subordinate Review</option>
                          <option value="SKIP_LEVEL">Skip Level</option>
                        </select>
                        {errors.reviewType && (
                          <p className="text-red-500 text-sm mt-1">{errors.reviewType.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Status *
                        </label>
                        <select
                          {...register('status')}
                          className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="SUBMITTED">Submitted</option>
                          <option value="IN_REVIEW">In Review</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="APPROVED">Approved</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                        {errors.status && (
                          <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Review Period Start *
                        </label>
                        <input
                          type="date"
                          {...register('reviewPeriodStart')}
                          className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {errors.reviewPeriodStart && (
                          <p className="text-red-500 text-sm mt-1">{errors.reviewPeriodStart.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Review Period End *
                        </label>
                        <input
                          type="date"
                          {...register('reviewPeriodEnd')}
                          className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {errors.reviewPeriodEnd && (
                          <p className="text-red-500 text-sm mt-1">{errors.reviewPeriodEnd.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Overall Rating (0-5) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        {...register('overallRating')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {errors.overallRating && (
                        <p className="text-red-500 text-sm mt-1">{errors.overallRating.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Strengths
                      </label>
                      <textarea
                        rows={3}
                        {...register('strengths')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {errors.strengths && (
                        <p className="text-red-500 text-sm mt-1">{errors.strengths.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Areas for Improvement
                      </label>
                      <textarea
                        rows={3}
                        {...register('areasForImprovement')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {errors.areasForImprovement && (
                        <p className="text-red-500 text-sm mt-1">{errors.areasForImprovement.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Goals
                      </label>
                      <textarea
                        rows={3}
                        {...register('goals')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {errors.goals && (
                        <p className="text-red-500 text-sm mt-1">{errors.goals.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Reviewer Comments
                      </label>
                      <textarea
                        rows={3}
                        {...register('reviewerComments')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {errors.reviewerComments && (
                        <p className="text-red-500 text-sm mt-1">{errors.reviewerComments.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Employee Comments
                      </label>
                      <textarea
                        rows={3}
                        {...register('employeeComments')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {errors.employeeComments && (
                        <p className="text-red-500 text-sm mt-1">{errors.employeeComments.message}</p>
                      )}
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
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : selectedReview ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && selectedReview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Delete Review</h2>
              <p className="text-[var(--text-secondary)] mb-6">
                Are you sure you want to delete this review? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedReview(null);
                  }}
                  className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
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
