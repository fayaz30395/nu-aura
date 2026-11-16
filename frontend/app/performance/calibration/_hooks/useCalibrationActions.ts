'use client';

import {useState} from 'react';
import {notifications} from '@mantine/notifications';
import {useUpdateReview} from '@/lib/hooks/queries/useReviews';
import {useUpdateCalibrationRating} from '@/lib/generated/api/review-cycle-controller/review-cycle-controller';
import type {PerformanceReview, ReviewRequest} from '@/lib/types/grow/performance';
import type {EmployeeRatingRow} from '../_components/calibrationModel';

interface UseCalibrationActionsArgs {
  reviews: PerformanceReview[];
  overrides: Record<string, number>;
  refetchReviews: () => Promise<unknown>;
}

export function useCalibrationActions({reviews, overrides, refetchReviews}: UseCalibrationActionsArgs) {
  const updateReviewMutation = useUpdateReview();
  const updateCalibrationRatingMutation = useUpdateCalibrationRating();
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const saveFinalRating = async (row: EmployeeRatingRow) => {
    const final = overrides[row.employeeId];
    if (!final) return;

    const managerReview = reviews.find((r) => r.employeeId === row.employeeId && r.reviewType === 'MANAGER');
    if (!managerReview) {
      notifications.show({
        title: 'Rating not saved',
        message: `${row.employeeName} has no manager review in this cycle to update.`,
        color: 'yellow',
      });
      return;
    }

    setSavingEmployeeId(row.employeeId);
    try {
      const updateData: ReviewRequest = {
        ...managerReview,
        overallRating: final,
        reviewerId: managerReview.reviewerId,
        employeeId: managerReview.employeeId,
        reviewType: managerReview.reviewType,
      };
      await updateReviewMutation.mutateAsync({id: managerReview.id, data: updateData});
    } catch {
      // The global MutationCache handler shows the error toast.
    } finally {
      setSavingEmployeeId(null);
    }
  };

  /** Returns once every rating update has settled; partial failures are reported, never shown as success. */
  const publishRatings = async (rows: EmployeeRatingRow[]) => {
    const updates: Promise<unknown>[] = [];
    for (const row of rows) {
      const finalRating = overrides[row.employeeId] ?? row.finalRating;
      if (finalRating == null) continue;
      for (const reviewId of row.reviewIds) {
        updates.push(updateCalibrationRatingMutation.mutateAsync({reviewId, params: {finalRating}}));
      }
    }

    if (updates.length === 0) {
      notifications.show({
        title: 'Nothing to publish',
        message: 'None of the employees in view have a final rating yet.',
        color: 'yellow',
      });
      return;
    }

    setPublishing(true);
    try {
      const results = await Promise.allSettled(updates);
      const failed = results.filter((r) => r.status === 'rejected').length;
      await refetchReviews();
      if (failed === 0) {
        notifications.show({
          title: 'Ratings published',
          message: 'Calibrated ratings have been published successfully.',
          color: 'green',
        });
      } else {
        notifications.show({
          title: failed === updates.length ? 'Publish failed' : 'Ratings partially published',
          message: `${failed} of ${updates.length} rating updates failed. Review the table and publish again.`,
          color: 'red',
        });
      }
    } catch {
      notifications.show({
        title: 'Publish failed',
        message: 'An error occurred while publishing ratings. Please try again.',
        color: 'red',
      });
    } finally {
      setPublishing(false);
    }
  };

  return {saveFinalRating, publishRatings, savingEmployeeId, publishing};
}
