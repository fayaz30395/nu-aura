'use client';

import React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {ChevronDown} from 'lucide-react';
import {cn} from '@/lib/utils';
import {density} from '@/lib/design-system';

const selectVariants = cva(
  cn(
    'w-full appearance-none rounded-lg border bg-[var(--bg-card)] text-[var(--text-primary)]',
    'transition-all duration-150 outline-none',
    'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-[var(--bg-secondary)]'
  ),
  {
    variants: {
      selectSize: {
        sm: cn(density.input.sm, 'pr-9'),
        md: cn(density.input.md, 'pr-9'),
        lg: cn(density.input.lg, 'pr-9'),
      },
      state: {
        default: cn(
          'border-[var(--border-main)]',
          'hover:border-[var(--border-strong)]',
          'focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--ring-primary)]'
        ),
        error: 'border-[var(--status-danger-text)] focus:border-[var(--status-danger-text)] focus:ring-2 focus:ring-[var(--ring-danger)]',
      },
    },
    defaultVariants: {
      selectSize: 'md',
      state: 'default',
    },
  }
);

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  label?: string;
  error?: string;
  helper?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({className, children, label, error, helper, selectSize = 'md', disabled, ...props}, ref) => {
    const state: VariantProps<typeof selectVariants>['state'] = error ? 'error' : 'default';

    return (
      <div className="w-full">
        {label && (
          <label
            className={cn(
              'block text-sm font-medium mb-1.5',
              error
                ? 'text-[var(--status-danger-text)]'
                : 'text-[var(--text-secondary)]'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            className={cn(selectVariants({selectSize, state}), className)}
            disabled={disabled}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none',
              'text-[var(--text-muted)]',
              disabled && 'opacity-60'
            )}
          />
        </div>

        {(error || helper) && (
          <p
            className={cn(
              'text-xs mt-1',
              error
                ? 'text-[var(--status-danger-text)]'
                : 'text-[var(--text-muted)]'
            )}
          >
            {error || helper}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export {Select, selectVariants};
