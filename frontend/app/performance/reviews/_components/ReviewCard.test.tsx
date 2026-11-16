/**
 * Tests for ReviewCard rating fallback.
 * Run with: npx vitest run app/performance/reviews/_components/ReviewCard.test.tsx
 */

import {MantineProvider} from '@mantine/core';
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {ReviewCard} from './ReviewCard';
import type {PerformanceReview} from '@/lib/types/grow/performance';

vi.mock('@/components/auth/PermissionGate', () => ({
  PermissionGate: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

const baseReview = {
  id: 'r-1',
  reviewType: 'SELF',
  status: 'SUBMITTED',
  reviewPeriodStart: undefined,
  reviewPeriodEnd: undefined,
} as unknown as PerformanceReview;

function renderCard(review: PerformanceReview) {
  return render(
    <MantineProvider>
      <ReviewCard review={review} onEdit={vi.fn()} onDelete={vi.fn()} />
    </MantineProvider>,
  );
}

describe('ReviewCard rating fallback', () => {
  it('shows self rating with "Self Rating" label when only selfRating is set', () => {
    // Arrange
    const review = {...baseReview, selfRating: 4} as PerformanceReview;

    // Act
    renderCard(review);

    // Assert
    expect(screen.getByTestId('review-rating')).toHaveTextContent('4.0/5.0');
    expect(screen.getByText('Self Rating')).toBeInTheDocument();
  });

  it('shows "Not rated" when no ratings are set', () => {
    // Arrange
    const review = {...baseReview} as PerformanceReview;

    // Act
    renderCard(review);

    // Assert
    expect(screen.getByTestId('review-rating')).toHaveTextContent('Not rated');
  });
});
