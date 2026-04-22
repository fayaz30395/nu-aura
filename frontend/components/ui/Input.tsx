'use client';

import React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {AlertCircle, CheckCircle, Eye, EyeOff} from 'lucide-react';
import {cn} from '@/lib/utils';
import {density} from '@/lib/design-system';

const inputVariants = cva(
  cn(
    'w-full rounded-lg border bg-[var(--bg-input)] text-[var(--text-primary)]',
    'transition-all duration-150 outline-none',
    'placeholder:text-[var(--text-muted)]',
    'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-[var(--bg-secondary)]'
  ),
  {
    variants: {
      inputSize: {
        sm: density.input.sm,
        md: density.input.md,
        lg: density.input.lg,
      },
      state: {
        default: cn(
          'border-[var(--border-main)]',
          'hover:border-[var(--border-strong)]',
          'focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--ring-primary)]'
        ),
        error: 'border-[var(--status-danger-text)] focus:border-[var(--status-danger-text)] focus:ring-2 focus:ring-[var(--ring-danger)]',
        success: 'border-[var(--status-success-text)] focus:border-[var(--status-success-text)] focus:ring-2 focus:ring-[var(--ring-success)]',
      },
    },
    defaultVariants: {
      inputSize: 'md',
      state: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  success?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  helper?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      error,
      success,
      icon,
      rightIcon,
      onRightIconClick,
      helper,
      inputSize = 'md',
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);

    const handleRightIconClick = () => {
      if (type === 'password') {
        setShowPassword(!showPassword);
      } else if (onRightIconClick) {
        onRightIconClick();
      }
    };

    const inputType = type === 'password' && showPassword ? 'text' : type;
    const state: VariantProps<typeof inputVariants>['state'] = error
      ? 'error'
      : success
        ? 'success'
        : 'default';

    return (
      <div className="w-full">
        {label && (
          <label
            className={cn(
              'block text-sm font-medium mb-1.5',
              error
                ? 'text-[var(--status-danger-text)]'
                : success
                  ? 'text-[var(--status-success-text)]'
                  : 'text-[var(--text-secondary)]'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <span
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]',
                error && 'text-[var(--status-danger-text)]',
                success && 'text-[var(--status-success-text)]'
              )}
            >
              {icon}
            </span>
          )}

          <input
            type={inputType}
            className={cn(
              inputVariants({inputSize, state}),
              icon && 'pl-10',
              (rightIcon || type === 'password' || error || success) && 'pr-10',
              className
            )}
            ref={ref}
            disabled={disabled}
            {...props}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {rightIcon && !error && !success && type !== 'password' && (
              <button
                type="button"
                onClick={handleRightIconClick}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] rounded"
                tabIndex={-1}
                disabled={disabled}
                aria-label="Toggle right icon"
              >
                {rightIcon}
              </button>
            )}

            {type === 'password' && !error && !success && (
              <button
                type="button"
                onClick={handleRightIconClick}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                disabled={disabled}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4"/>
                ) : (
                  <Eye className="h-4 w-4"/>
                )}
              </button>
            )}

            {error && (
              <AlertCircle className="h-4 w-4 text-[var(--status-danger-text)]"/>
            )}

            {success && !error && (
              <CheckCircle className="h-4 w-4 text-[var(--status-success-text)]"/>
            )}
          </div>
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

Input.displayName = 'Input';

export {Input, inputVariants};
