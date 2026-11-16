import {
  useCreateReview,
  useDeleteReview,
  useSubmitSelfAssessment,
  useUpdateReview,
} from '@/lib/hooks/queries/useReviews';
import type {PerformanceReview, ReviewRequest} from '@/lib/types/grow/performance';
import {createLogger} from '@/lib/utils/logger';
import {type ReviewFormData, SELF_ASSESSMENT_COMPETENCIES} from '../_components/reviewForm';

const log = createLogger('ReviewsPage');

/** Review save/delete mutations. Each action resolves to `true` on success; failures are logged and toasted globally. */
export function useReviewActions(employeeId: string | undefined) {
  const createReviewMutation = useCreateReview();
  const updateReviewMutation = useUpdateReview();
  const submitSelfAssessmentMutation = useSubmitSelfAssessment();
  const deleteReviewMutation = useDeleteReview();

  const saveReview = async (
    formData: ReviewFormData,
    selectedReview: PerformanceReview | null,
    competencyRatings: Record<string, number>,
  ): Promise<boolean> => {
    try {
      const reviewData = {
        ...formData,
        cycleId: formData.cycleId || '',
        employeeId: employeeId || '',
        reviewerId: formData.reviewerId || employeeId || '',
        strengths: formData.strengths || '',
        areasForImprovement: formData.areasForImprovement || '',
        goals: formData.goals || '',
        reviewerComments: formData.reviewerComments || '',
        employeeComments: formData.employeeComments || '',
      };

      if (selectedReview?.reviewType === 'SELF') {
        const mappedCompetencies = SELF_ASSESSMENT_COMPETENCIES.map((c) => ({
          competencyName: c.name,
          rating: competencyRatings[c.name] ?? 3,
          comments: formData.employeeComments || '',
        }));
        const avgRating = mappedCompetencies.reduce((sum, c) => sum + c.rating, 0) / mappedCompetencies.length;
        await submitSelfAssessmentMutation.mutateAsync({
          reviewId: selectedReview.id,
          data: {
            competencyRatings: mappedCompetencies,
            overallComments: formData.employeeComments || formData.strengths || '',
            goalAchievementPercent: Math.min(100, Math.max(0, Math.round(avgRating * 20))),
          },
        });
      } else if (selectedReview) {
        await updateReviewMutation.mutateAsync({id: selectedReview.id, data: reviewData as ReviewRequest});
      } else {
        await createReviewMutation.mutateAsync(reviewData as ReviewRequest);
      }
      return true;
    } catch (error: unknown) {
      log.error('Error saving review:', error);
      return false;
    }
  };

  const deleteReview = async (review: PerformanceReview): Promise<boolean> => {
    try {
      await deleteReviewMutation.mutateAsync(review.id);
      return true;
    } catch (error: unknown) {
      log.error('Error deleting review:', error);
      return false;
    }
  };

  return {
    saveReview,
    deleteReview,
    isSaving: createReviewMutation.isPending || updateReviewMutation.isPending || submitSelfAssessmentMutation.isPending,
    isDeleting: deleteReviewMutation.isPending,
  };
}
