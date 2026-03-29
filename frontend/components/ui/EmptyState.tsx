'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  loading?: boolean;
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  iconColor?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  // Legacy prop support
  action?: EmptyStateAction;
  iconSize?: number | string;
}

export function EmptyState({
  icon,
  iconColor,
  title,
  description,
  actionLabel,
  onAction,
  actionLoading = false,
  action,
}: EmptyStateProps) {
  // Support legacy 'action' prop for backward compatibility
  const finalActionLabel = actionLabel || action?.label;
  const finalOnAction = onAction || action?.onClick;
  const finalActionLoading = actionLoading || action?.loading || false;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full"
    >
      <div className="flex flex-col items-center justify-center py-16 px-6">
        {/* Icon Container */}
        {icon && (
          <div
            className={cn(
              'flex items-center justify-center w-16 h-16 rounded-2xl mb-6',
              iconColor || 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
            )}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}

        {/* Title */}
        <h3 className="text-xl font-semibold text-center mb-2 max-w-xs text-[var(--text-primary)]">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-center mb-6 max-w-sm leading-relaxed text-[var(--text-secondary)]">
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
              'focus-ring-aura'
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
