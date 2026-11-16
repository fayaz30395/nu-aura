import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {PerformanceReview} from '@/lib/types/grow/performance';
import type {EmployeeRatingRow} from '../_components/calibrationModel';
import {useCalibrationActions} from './useCalibrationActions';

const showNotification = vi.fn();
const calibrate = vi.fn();
const updateReview = vi.fn();

vi.mock('@mantine/notifications', () => ({notifications: {show: (arg: unknown) => showNotification(arg)}}));
vi.mock('@/lib/hooks/queries/useReviews', () => ({
  useUpdateReview: () => ({mutateAsync: updateReview}),
}));
vi.mock('@/lib/generated/api/review-cycle-controller/review-cycle-controller', () => ({
  useUpdateCalibrationRating: () => ({mutateAsync: calibrate}),
}));

const row = (id: string, finalRating: number | null, reviewIds: string[]): EmployeeRatingRow => ({
  employeeId: id,
  employeeName: `Emp ${id}`,
  department: 'Eng',
  selfRating: null,
  managerRating: finalRating,
  finalRating,
  reviewIds,
});

function setup(reviews: PerformanceReview[] = [], overrides: Record<string, number> = {}) {
  const refetchReviews = vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() => useCalibrationActions({reviews, overrides, refetchReviews}));
  return {...hook, refetchReviews};
}

describe('useCalibrationActions', () => {
  beforeEach(() => {
    showNotification.mockReset();
    calibrate.mockReset();
    updateReview.mockReset();
  });

  it('reports success only when every rating update succeeds', async () => {
    calibrate.mockResolvedValue(undefined);
    const {result, refetchReviews} = setup();

    await act(() => result.current.publishRatings([row('a', 4, ['r1', 'r2'])]));

    expect(calibrate).toHaveBeenCalledTimes(2);
    expect(refetchReviews).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith(expect.objectContaining({title: 'Ratings published', color: 'green'}));
  });

  it('reports partial failures instead of a success toast', async () => {
    calibrate.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('boom'));
    const {result} = setup();

    await act(() => result.current.publishRatings([row('a', 4, ['r1']), row('b', 3, ['r2'])]));

    expect(showNotification).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith(
      expect.objectContaining({title: 'Ratings partially published', color: 'red'}),
    );
  });

  it('tells the user when there is nothing to publish', async () => {
    const {result} = setup();

    await act(() => result.current.publishRatings([row('a', null, ['r1'])]));

    expect(calibrate).not.toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalledWith(expect.objectContaining({title: 'Nothing to publish'}));
  });

  it('warns instead of silently skipping when no manager review exists', async () => {
    const {result} = setup([], {a: 4.5});

    await act(() => result.current.saveFinalRating(row('a', 3, ['r1'])));

    expect(updateReview).not.toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalledWith(expect.objectContaining({title: 'Rating not saved'}));
  });
});
