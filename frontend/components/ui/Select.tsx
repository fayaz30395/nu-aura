'use client';

import React from 'react';
import {cn} from '@/lib/utils';
import {ChevronDown} from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  selectSize?: 'sm' | 'md' | 'lg';
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({className, children, label, error, helper, selectSize = 'md', disabled, ...props}, ref) => {
    const sizeStyles = {
      sm: 'h-9 min-h-9 text-sm pl-3 pr-9',
      md: 'h-10 min-h-10 text-sm pl-3 pr-9',
      lg: 'h-11 min-h-11 text-base pl-3.5 pr-10',
    };
    const hasError = Boolean(error);

    return (
      <div className="w-full">
        {label && (
          <label
            className={cn(
              'block text-[13px] font-medium mb-1 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)]',
              error
                ? 'text-[var(--err-fg)]'
                : 'text-[var(--text-secondary)]'
            )}
          >
            {label}
          </label>
        )}

        <div className="group relative">
          <select
            ref={ref}
            aria-label={label}
            className={cn(
              // Aura: 10px control radius + inset top shadow, token-driven accent focus.
              // Compositor-safe: only border-color + box-shadow transition.
              'w-full appearance-none rounded-[var(--radius-md)] border bg-[var(--bg-input)] transition-[border-color,box-shadow] duration-[var(--motion-base)] ease-[var(--ease-standard)]',
              'text-[var(--text-primary)]',
              // Size
              sizeStyles[selectSize],
              // Default border
              !hasError && 'border-[var(--border-main)]',
              // Hover state
              !hasError && !disabled && 'hover:border-[var(--border-strong)]',
              // Focus state — Aura accent border + soft focus ring
              !hasError && 'focus:border-[var(--accent)] focus:shadow-[var(--sh-focus)]',
              // Error state
              hasError && 'border-[var(--err-fg)] focus:border-[var(--err-fg)] focus:shadow-[0_0_0_3px_var(--ring-danger)]',
              // Disabled
              disabled && 'bg-[var(--surface-sunken)] cursor-not-allowed opacity-60',
              // Remove default outline
              'outline-none',
              className
            )}
            disabled={disabled}
            aria-invalid={hasError}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none',
            'text-[var(--text-muted)]',
            // Animate rotation + accent on focus (transform/color only — compositor-safe)
            'transition-[transform,color] duration-[var(--motion-base)] ease-[var(--ease-out-expo)]',
            'group-focus-within:text-[var(--accent)]',
            hasError && 'group-focus-within:text-danger-500',
            disabled && 'opacity-60'
          )}/>
        </div>

        {(error || helper) && (
          <p
            className={cn(
              'motion-fade text-xs mt-1',
              error
                ? 'text-[var(--err-fg)]'
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

export {Select};
