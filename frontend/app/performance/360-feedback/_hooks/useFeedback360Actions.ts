'use client';

import {useState} from 'react';
import type {CycleRequest, FeedbackResponse, NominationRequest} from '@/lib/services/grow/feedback360.service';
import {
  useActivateFeedback360Cycle,
  useCloseFeedback360Cycle,
  useCreateFeedback360Cycle,
  useCreateFeedback360Request,
  useDeleteFeedback360Cycle,
  useShareFeedback360Summary,
  useSubmitFeedback360Response,
} from '@/lib/hooks/queries/useFeedback360';
import {createLogger} from '@/lib/utils/logger';

const log = createLogger('FeedbackPage');

/**
 * Feedback 360 mutations. Each handler resolves to `true` on success so callers
 * only close their modal/dialog when the request succeeded.
 */
export function useFeedback360Actions() {
  const [error, setError] = useState<string | null>(null);

  const createCycleMutation = useCreateFeedback360Cycle();
  const activateCycleMutation = useActivateFeedback360Cycle();
  const closeCycleMutation = useCloseFeedback360Cycle();
  const deleteCycleMutation = useDeleteFeedback360Cycle();
  const submitResponseMutation = useSubmitFeedback360Response();
  const shareSummaryMutation = useShareFeedback360Summary();
  const createRequestMutation = useCreateFeedback360Request();

  const run = async (action: () => Promise<unknown>, logMessage: string, userMessage: string) => {
    try {
      await action();
      return true;
    } catch (err) {
      log.error(logMessage, err);
      setError(userMessage);
      return false;
    }
  };

  return {
    error,
    createCycle: (data: CycleRequest) =>
      run(() => createCycleMutation.mutateAsync(data), 'Error creating cycle:', 'Failed to create cycle'),
    activateCycle: (id: string) =>
      run(() => activateCycleMutation.mutateAsync(id), 'Error activating cycle:', 'Failed to activate cycle'),
    closeCycle: (id: string) =>
      run(() => closeCycleMutation.mutateAsync(id), 'Error closing cycle:', 'Failed to close cycle'),
    deleteCycle: (id: string) =>
      run(() => deleteCycleMutation.mutateAsync(id), 'Error deleting cycle:', 'Failed to delete cycle'),
    submitResponse: (data: FeedbackResponse) =>
      run(() => submitResponseMutation.mutateAsync(data), 'Error submitting response:', 'Failed to submit response'),
    nominateReviewer: (data: NominationRequest) =>
      run(() => createRequestMutation.mutateAsync(data), 'Error nominating reviewer:', 'Failed to nominate reviewer'),
    shareSummary: (summaryId: string) =>
      run(() => shareSummaryMutation.mutateAsync(summaryId), 'Error sharing summary:', 'Failed to share summary'),
    pending: {
      createCycle: createCycleMutation.isPending,
      activateCycle: activateCycleMutation.isPending,
      closeCycle: closeCycleMutation.isPending,
      deleteCycle: deleteCycleMutation.isPending,
      submitResponse: submitResponseMutation.isPending,
      nominateReviewer: createRequestMutation.isPending,
      shareSummary: shareSummaryMutation.isPending,
    },
  };
}
