'use client';

import React from 'react';
import {motion} from 'framer-motion';
import {cn} from '@/lib/utils';

/** Legacy nested action shape. Prefer the flat `actionLabel`/`onAction` props. */
interface EmptyStateAction {
  label: string;
  onClick: () => void;
  loading?: boolean;
}

/** Props for {@link EmptyState}. */
interface EmptyStateProps {
  /** Icon node; sized by the wrapper, so use `w-full h-full` on the inner SVG. */
  icon?: React.ReactNode;
  /** Tailwind classes for the icon container (background + foreground). */
  iconColor?: string;
  title: string;
  description?: string;
  /** Flat action label. Wins over legacy `action.label` when both are set. */
  actionLabel?: string;
  /** Flat action handler. Wins over legacy `action.onClick` when both are set. */
  onAction?: () => void;
  actionLoading?: boolean;
  /** Legacy combined action prop kept for back-compat with older call sites. */
  action?: EmptyStateAction;
  iconSize?: number | string;
  /**
   * Visual size variant.
   * - `'default'` (existing behavior): large py-16 outer padding, w-16 h-16 icon container, text-xl title.
   * - `'compact'`: py-6 outer padding, w-10 h-10 icon container, text-sm title, text-xs description.
   *   Use inside chart tiles (h-[300px]), popovers (max-h-48), and dense table-cell empties.
   */
  size?: 'default' | 'compact';
}

/**
 * Canonical empty-state surface: icon + title + optional description + optional action.
 * Pair with `EmptyStatePresets` for shared iconography across the product.
 */
export function EmptyState({
                             icon,
                             iconColor,
                             title,
                             description,
                             actionLabel,
                             onAction,
                             actionLoading = false,
                             action,
                             size = 'default',
                           }: EmptyStateProps) {
  // Support legacy 'action' prop for backward compatibility
  const finalActionLabel = actionLabel || action?.label;
  const finalOnAction = onAction || action?.onClick;
  const finalActionLoading = actionLoading || action?.loading || false;
  const isCompact = size === 'compact';
  return (
    <motion.div
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.3, ease: 'easeOut'}}
      className="w-full"
    >
      <div
        className={cn(
          'flex flex-col items-center justify-center px-6',
          isCompact ? 'py-6' : 'py-16'
        )}
      >
        {/* Icon Container */}
        {icon && (
          <div
            className={cn(
              'flex items-center justify-center rounded-lg',
              isCompact ? 'w-10 h-10 mb-3' : 'w-16 h-16 mb-6',
              iconColor || 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center',
                isCompact ? 'w-5 h-5' : 'w-8 h-8'
              )}
            >
              {icon}
            </div>
          </div>
        )}

        {/* Title */}
        <h3
          className={cn(
            'font-semibold text-center max-w-xs text-[var(--text-primary)]',
            isCompact ? 'text-sm mb-1' : 'text-xl mb-2'
          )}
        >
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p
            className={cn(
              'text-center max-w-sm leading-relaxed text-[var(--text-secondary)]',
              isCompact ? 'text-xs mb-3' : 'text-sm mb-6'
            )}
          >
            {description}
          </p>
        )}

        {/* Action Button */}
        {finalActionLabel && finalOnAction && (
          <button
            onClick={finalOnAction}
            disabled={finalActionLoading}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
              'bg-accent-700 hover:bg-accent-800 dark:bg-accent-700 dark:hover:bg-accent-800',
              'text-white disabled:opacity-50 disabled:cursor-not-allowed',
              'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
            )}
          >
            {finalActionLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading...
              </span>
            ) : (
              finalActionLabel
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
