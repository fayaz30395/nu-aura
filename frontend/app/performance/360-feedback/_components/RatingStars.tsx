'use client';

import {ActionIcon} from '@mantine/core';
import {Star} from 'lucide-react';
import {cn} from '@/lib/utils';

const STARS = [1, 2, 3, 4, 5];

interface RatingStarsProps {
  rating: number;
  onChange?: (rating: number) => void;
  /** Accessible name for the rating group, e.g. the competency label. */
  label?: string;
}

const starClass = (filled: boolean) =>
  cn('h-4 w-4', filled ? 'fill-warning-400 text-warning-400' : 'text-text-3');

export function RatingStars({rating, onChange, label = 'Rating'}: RatingStarsProps) {
  if (!onChange) {
    return (
      <div className="flex gap-1" role="img" aria-label={`${label}: ${rating} of 5`}>
        {STARS.map((star) => <Star key={star} className={starClass(star <= rating)} aria-hidden/>)}
      </div>
    );
  }

  return (
    <div className="flex gap-1" role="group" aria-label={label}>
      {STARS.map((star) => (
        <ActionIcon
          key={star}
          type="button"
          variant="subtle"
          color="gray"
          onClick={() => onChange(star)}
          aria-label={`${label}: ${star} of 5`}
          aria-pressed={star <= rating}
        >
          <Star className={starClass(star <= rating)} aria-hidden/>
        </ActionIcon>
      ))}
    </div>
  );
}
