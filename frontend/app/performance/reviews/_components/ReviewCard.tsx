'use client';

import {CheckCircle2, Clock, FileEdit, Send, ShieldCheck, XCircle} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Badge, type BadgeProps} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {Permissions} from '@/lib/hooks/usePermissions';
import {formatDate} from '@/lib/utils/format/date';
import type {PerformanceReview, ReviewStatus, ReviewType} from '@/lib/types/grow/performance';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

const STATUS_VARIANT: Partial<Record<ReviewStatus, BadgeVariant>> = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  IN_REVIEW: 'warning',
  COMPLETED: 'success',
  APPROVED: 'success',
  REJECTED: 'danger',
};

const STATUS_ICON: Partial<Record<ReviewStatus, typeof FileEdit>> = {
  DRAFT: FileEdit,
  SUBMITTED: Send,
  IN_REVIEW: Clock,
  COMPLETED: CheckCircle2,
  APPROVED: ShieldCheck,
  REJECTED: XCircle,
};

const TYPE_VARIANT: Partial<Record<ReviewType, BadgeVariant>> = {
  SELF: 'info',
  MANAGER: 'warning',
  PEER: 'success',
  SUBORDINATE: 'default',
  SKIP_LEVEL: 'danger',
};

function RatingStars({rating}: {rating?: number}) {
  const value = rating || 0;
  return (
    <div className="review-rating flex gap-1" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= value ? 'text-[var(--warn-fg)]' : 'text-[var(--text-muted)]'}>★</span>
      ))}
    </div>
  );
}

interface ReviewCardProps {
  review: PerformanceReview;
  onEdit: (review: PerformanceReview) => void;
  onDelete: (review: PerformanceReview) => void;
}

function resolveRating(review: PerformanceReview): {value?: number; label: string} {
  if (review.overallRating != null) return {value: review.overallRating, label: 'Overall Rating'};
  if (review.selfRating != null) return {value: review.selfRating, label: 'Self Rating'};
  return {value: review.managerRating, label: 'Manager Rating'};
}

export function ReviewCard({review, onEdit, onDelete}: ReviewCardProps) {
  const StatusIcon = STATUS_ICON[review.status] ?? FileEdit;
  const {value: shownRating, label: ratingLabel} = resolveRating(review);

  return (
    <Card variant="bordered" padding="md" className="review-item flex flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant={TYPE_VARIANT[review.reviewType] ?? 'default'}>{review.reviewType}</Badge>
            <Badge variant={STATUS_VARIANT[review.status] ?? 'default'}>
              <StatusIcon className="h-3.5 w-3.5" aria-hidden/>
              {review.status}
            </Badge>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Period: {review.reviewPeriodStart ? formatDate(review.reviewPeriodStart) : 'N/A'} - {review.reviewPeriodEnd ? formatDate(review.reviewPeriodEnd) : 'N/A'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-[var(--text-secondary)]">{ratingLabel}</span>
          <RatingStars rating={shownRating}/>
          <span data-testid="review-rating" className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
            {shownRating == null ? 'Not rated' : `${shownRating.toFixed(1)}/5.0`}
          </span>
        </div>
      </header>

      {(review.strengths || review.areasForImprovement) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {review.strengths && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Strengths</span>
              <p className="line-clamp-2 text-sm text-[var(--text-secondary)]">{review.strengths}</p>
            </div>
          )}
          {review.areasForImprovement && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Areas for Improvement</span>
              <p className="line-clamp-2 text-sm text-[var(--text-secondary)]">{review.areasForImprovement}</p>
            </div>
          )}
        </div>
      )}

      <footer className="flex flex-wrap gap-2 border-t border-[var(--border-soft)] pt-4">
        {review.reviewType === 'SELF' && review.status === 'DRAFT' && (
          <PermissionGate permission={Permissions.REVIEW_SUBMIT}>
            <Button variant="secondary" onClick={() => onEdit(review)}>
              Start Self Assessment
            </Button>
          </PermissionGate>
        )}
        <PermissionGate permission={Permissions.REVIEW_UPDATE}>
          <Button variant="outline" onClick={() => onEdit(review)}>
            View/Edit
          </Button>
        </PermissionGate>
        <PermissionGate permission={Permissions.REVIEW_DELETE}>
          <Button variant="ghost" className="text-[var(--err-fg)]" onClick={() => onDelete(review)}>
            Delete
          </Button>
        </PermissionGate>
      </footer>
    </Card>
  );
}
