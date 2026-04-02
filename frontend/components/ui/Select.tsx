'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  selectSize?: 'sm' | 'md' | 'lg';
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, label, error, helper, selectSize = 'md', disabled, ...props }, ref) => {
    const sizeStyles = {
      sm: 'h-9 text-sm pl-4 pr-9',
      md: 'h-10 text-sm pl-4 pr-9',
      lg: 'h-12 text-base pl-4 pr-10',
    };

    return (
      <div className="w-full">
        {label && (
          <label
            className={cn(
              'block text-sm font-medium mb-1.5',
              error
                ? 'text-danger-600 dark:text-danger-400'
                : 'text-[var(--text-secondary)]'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            className={cn(
              // Base styles
              'w-full appearance-none rounded-lg border bg-[var(--bg-card)] transition-all duration-150',
              'text-[var(--text-primary)]',
              // Size
              sizeStyles[selectSize],
              // Default border
              !error && 'border-[var(--border-main)]',
              // Hover state
              !error && !disabled && 'hover:border-accent-300 dark:hover:border-accent-700',
              // Focus state
              !error && 'focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 dark:focus:border-accent-400 dark:focus:ring-accent-400/20',
              // Error state
              error && 'border-danger-500 focus:border-danger-500 focus:ring-2 focus:ring-danger-500/20',
              // Disabled
              disabled && 'bg-[var(--bg-secondary)] cursor-not-allowed opacity-60',
              // Remove default outline
              'outline-none',
              className
            )}
            disabled={disabled}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none',
            'text-[var(--text-muted)]',
            disabled && 'opacity-60'
          )} />
        </div>

        {(error || helper) && (
          <p
            className={cn(
              'text-sm mt-1.5',
              error
                ? 'text-danger-600 dark:text-danger-400'
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

export { Select };
