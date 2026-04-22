'use client';

import * as React from 'react';
import type {LucideIcon} from 'lucide-react';
import {cn} from '@/lib/utils';
import {typography} from '@/lib/design-system';

export interface EmptyPageStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary action — rendered right of the body, typically a <Button>. */
  action?: React.ReactNode;
  /** Secondary action rendered beside the primary. */
  secondaryAction?: React.ReactNode;
  /** Density preset. 'md' fills most of a content area; 'sm' fits inline in a card. */
  size?: 'sm' | 'md';
}

const SIZE_CLASS: Record<NonNullable<EmptyPageStateProps['size']>, string> = {
  sm: 'py-8',
  md: 'py-16',
};

const ICON_SIZE: Record<NonNullable<EmptyPageStateProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
};

/**
 * EmptyPageState is the canonical zero-data surface for list pages, search
 * results, and empty tabs. For inline card emptiness prefer `size="sm"`.
 */
export const EmptyPageState = React.forwardRef<HTMLDivElement, EmptyPageStateProps>(
  ({
     className,
     icon: Icon,
     title,
     description,
     action,
     secondaryAction,
     size = 'md',
     ...props
   }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center text-center px-4',
        SIZE_CLASS[size],
        className
      )}
      role="status"
      {...props}
    >
      {Icon && (
        <span
          aria-hidden
          className="mb-2 inline-flex items-center justify-center text-[var(--text-muted)]"
        >
          <Icon className={ICON_SIZE[size]}/>
        </span>
      )}
      <h2 className={cn(typography.sectionTitle, 'text-sm')}>{title}</h2>
      {description && (
        <p className={cn(typography.bodySecondary, 'mt-1 max-w-md')}>{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-4 flex items-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
);

EmptyPageState.displayName = 'EmptyPageState';

export default EmptyPageState;
