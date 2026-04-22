'use client';

import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AppLayout} from '@/components/layout';
import {
  useCreateReview,
  useDeleteReview,
  useEmployeeReviews,
  useUpdateReview,
} from '@/lib/hooks/queries/usePerformance';
import {PerformanceReview, ReviewRequest, ReviewStatus, ReviewType} from '@/lib/types/grow/performance';
import {useAuth} from '@/lib/hooks/useAuth';
import {createLogger} from '@/lib/utils/logger';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';

const log = createLogger('ReviewsPage');

// ─── Validation Schemas ───────────────────────────────────────────────────────

const reviewFormSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  reviewerId: z.string().min(1, 'Reviewer ID is required'),
  cycleId: z.string().optional().or(z.literal('')),
  reviewType: z.enum(['SELF', 'MANAGER', 'PEER', 'SUBORDINATE', 'SKIP_LEVEL'] as const) as z.ZodType<ReviewType>,
  status: z.enum(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'COMPLETED', 'APPROVED', 'REJECTED'] as const) as z.ZodType<ReviewStatus>,
  reviewPeriodStart: z.string().min(1, 'Review period start is required'),
  reviewPeriodEnd: z.string().min(1, 'Review period end is required'),
  overallRating: z.number({coerce: true}).min(1, 'Rating must be at least 1').max(5, 'Max 5'),
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
  const {user} = useAuth();
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
    formState: {errors, isSubmitting},
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
        await updateReviewMutation.mutateAsync({id: selectedReview.id, data: reviewData as ReviewRequest});
      } else {
        await createReviewMutation.mutateAsync(reviewData as ReviewRequest);
      }

      setShowModal(false);
      resetFormHandler();
    } catch (error: unknown) {
      log.error('Error saving review:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedReview) return;
    try {
      await deleteReviewMutation.mutateAsync(selectedReview.id);
      setShowDeleteConfirm(false);
      setSelectedReview(null);
    } catch (error: unknown) {
      log.error('Error deleting review:', error);
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
      case 'DRAFT':
        return 'badge-status status-neutral';
      case 'SUBMITTED':
        return 'badge-status status-info';
      case 'IN_REVIEW':
        return 'badge-status status-warning';
      case 'COMPLETED':
        return 'badge-status status-success';
      case 'APPROVED':
        return 'badge-status status-success';
      case 'REJECTED':
        return 'badge-status status-danger';
      default:
        return 'badge-status status-neutral';
    }
  };

  const getTypeColor = (type: ReviewType) => {
    switch (type) {
      case 'SELF':
        return 'badge-status status-info';
      case 'MANAGER':
        return 'badge-status status-warning';
      case 'PEER':
        return 'badge-status status-success';
      case 'SUBORDINATE':
        return 'badge-status status-neutral';
      case 'SKIP_LEVEL':
        return 'badge-status status-danger';
      default:
        return 'badge-status status-neutral';
    }
  };

  const renderRatingStars = (rating?: number) => {
    const stars = [];
    const ratingValue = rating || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i}
              className={i <= ratingValue ? 'text-status-warning-text' : 'text-[var(--text-muted)] dark:text-[var(--text-secondary)]'}>
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
          <div className="h-16 w-16 mx-auto text-[var(--text-muted)] mb-4">
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No Employee Profile Linked</h2>
          <p className="text-[var(--text-muted)] max-w-md mx-auto">
            Performance reviews require an employee profile. Use the admin panels to manage employee reviews.
          </p>
          <button
            onClick={() => window.history.back()}
            className='mt-6 px-4 py-2 bg-accent text-inverse rounded-lg hover:bg-accent transition-colors'
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
          <h1 className="text-xl font-bold skeuo-emboss">Performance Reviews</h1>
          <PermissionGate permission={Permissions.REVIEW_CREATE}>
            <button
              onClick={() => {
                resetFormHandler();
                setShowModal(true);
              }}
              className="btn-primary px-4 py-2 rounded-lg"
            >
              Create Review
            </button>
          </PermissionGate>
        </div>

        <div className="skeuo-card rounded-lg border border-[var(--border-main)] p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Filter by Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as ReviewType | 'ALL')}
                className="w-full input-aura px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
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
                className="w-full input-aura px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
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
          <div className="skeuo-card rounded-lg border border-[var(--border-main)] p-12 text-center">
            <div className="text-[var(--text-secondary)] mb-4">No reviews found</div>
            <PermissionGate permission={Permissions.REVIEW_CREATE}>
              <button
                onClick={() => {
                  resetFormHandler();
                  setShowModal(true);
                }}
                className="btn-primary px-4 py-2 rounded-lg"
              >
                Create Your First Review
              </button>
            </PermissionGate>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div key={review.id}
                   className="skeuo-card card-interactive rounded-lg border border-[var(--border-main)] p-6 transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-4">
                      <span className={'px-2 py-1 rounded text-xs font-medium ' + getTypeColor(review.reviewType)}>
                        {review.reviewType}
                      </span>
                      <span className={'px-2 py-1 rounded text-xs font-medium ' + getStatusColor(review.status)}>
                        {review.status}
                      </span>
                    </div>
                    <div className="text-body-secondary">
                      Period: {review.reviewPeriodStart ? new Date(review.reviewPeriodStart).toLocaleDateString() : 'N/A'} - {review.reviewPeriodEnd ? new Date(review.reviewPeriodEnd).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-body-secondary mb-1">Overall Rating</div>
                    {renderRatingStars(review.overallRating)}
                    <div className="text-lg font-bold mt-1">{(review.overallRating || 0).toFixed(1)}/5.0</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {review.strengths && (
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-secondary)] mb-1">Strengths</div>
                      <p className="text-body-secondary line-clamp-2">{review.strengths}</p>
                    </div>
                  )}
                  {review.areasForImprovement && (
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-secondary)] mb-1">Areas for Improvement
                      </div>
                      <p className="text-body-secondary line-clamp-2">{review.areasForImprovement}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <PermissionGate permission={Permissions.REVIEW_UPDATE}>
                    <button
                      onClick={() => openEditModal(review)}
                      className='flex-1 px-4 py-2 tint-info text-accent rounded hover:opacity-80 text-sm font-medium'
                    >
                      View/Edit
                    </button>
                  </PermissionGate>
                  <PermissionGate permission={Permissions.REVIEW_DELETE}>
                    <button
                      onClick={() => openDeleteConfirm(review)}
                      className='flex-1 px-4 py-2 tint-danger text-status-danger-text rounded hover:opacity-80 text-sm font-medium'
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
          <div
            className="fixed inset-0 glass-aura !rounded-none flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div
              className="skeuo-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border-main)]">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-6 skeuo-emboss text-[var(--text-primary)]">
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
                          className="w-full input-aura px-4 py-2 rounded-lg"
                        >
                          <option value="SELF">Self Review</option>
                          <option value="MANAGER">Manager Review</option>
                          <option value="PEER">Peer Review</option>
                          <option value="SUBORDINATE">Subordinate Review</option>
                          <option value="SKIP_LEVEL">Skip Level</option>
                        </select>
                        {errors.reviewType && (
                          <p className='text-status-danger-text text-sm mt-1'>{errors.reviewType.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Status *
                        </label>
                        <select
                          {...register('status')}
                          className="w-full input-aura px-4 py-2 rounded-lg"
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="SUBMITTED">Submitted</option>
                          <option value="IN_REVIEW">In Review</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="APPROVED">Approved</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                        {errors.status && (
                          <p className='text-status-danger-text text-sm mt-1'>{errors.status.message}</p>
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
                          className="w-full input-aura px-4 py-2 rounded-lg"
                        />
                        {errors.reviewPeriodStart && (
                          <p className='text-status-danger-text text-sm mt-1'>{errors.reviewPeriodStart.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Review Period End *
                        </label>
                        <input
                          type="date"
                          {...register('reviewPeriodEnd')}
                          className="w-full input-aura px-4 py-2 rounded-lg"
                        />
                        {errors.reviewPeriodEnd && (
                          <p className='text-status-danger-text text-sm mt-1'>{errors.reviewPeriodEnd.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Overall Rating (1-5) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        {...register('overallRating')}
                        className="w-full input-aura px-4 py-2 rounded-lg"
                      />
                      {errors.overallRating && (
                        <p className='text-status-danger-text text-sm mt-1'>{errors.overallRating.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Strengths
                      </label>
                      <textarea
                        rows={3}
                        {...register('strengths')}
                        className="w-full input-aura px-4 py-2 rounded-lg"
                      />
                      {errors.strengths && (
                        <p className='text-status-danger-text text-sm mt-1'>{errors.strengths.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Areas for Improvement
                      </label>
                      <textarea
                        rows={3}
                        {...register('areasForImprovement')}
                        className="w-full input-aura px-4 py-2 rounded-lg"
                      />
                      {errors.areasForImprovement && (
                        <p className='text-status-danger-text text-sm mt-1'>{errors.areasForImprovement.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Goals
                      </label>
                      <textarea
                        rows={3}
                        {...register('goals')}
                        className="w-full input-aura px-4 py-2 rounded-lg"
                      />
                      {errors.goals && (
                        <p className='text-status-danger-text text-sm mt-1'>{errors.goals.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Reviewer Comments
                      </label>
                      <textarea
                        rows={3}
                        {...register('reviewerComments')}
                        className="w-full input-aura px-4 py-2 rounded-lg"
                      />
                      {errors.reviewerComments && (
                        <p className='text-status-danger-text text-sm mt-1'>{errors.reviewerComments.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Employee Comments
                      </label>
                      <textarea
                        rows={3}
                        {...register('employeeComments')}
                        className="w-full input-aura px-4 py-2 rounded-lg"
                      />
                      {errors.employeeComments && (
                        <p className='text-status-danger-text text-sm mt-1'>{errors.employeeComments.message}</p>
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
                      className="flex-1 btn-secondary px-4 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
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
          <div className="fixed inset-0 glass-aura !rounded-none flex items-center justify-center p-4 z-50">
            <div className="skeuo-card rounded-lg border border-[var(--border-main)] max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4 skeuo-emboss text-[var(--text-primary)]">Delete Review</h2>
              <p className="text-[var(--text-secondary)] mb-6">
                Are you sure you want to delete this review? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedReview(null);
                  }}
                  className="flex-1 btn-secondary px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className='flex-1 btn-primary px-4 py-2 rounded-lg bg-status-danger-bg hover:bg-status-danger-bg disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
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
