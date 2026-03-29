'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  helper?: string;
  inputSize?: 'sm' | 'md' | 'lg';
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
    const [isFocused, setIsFocused] = React.useState(false);

    const handleRightIconClick = () => {
      if (type === 'password') {
        setShowPassword(!showPassword);
      } else if (onRightIconClick) {
        onRightIconClick();
      }
    };

    const inputType = type === 'password' && showPassword ? 'text' : type;

    const sizeStyles = {
      sm: 'h-9 text-sm px-4',
      md: 'h-10 text-sm px-4',
      lg: 'h-12 text-base px-4',
    };

    return (
      <div className="w-full">
        {label && (
          <label
            className={cn(
              'block text-sm font-medium mb-1.5',
              error
                ? 'text-danger-600 dark:text-danger-400'
                : success
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-surface-700 dark:text-surface-200'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <span
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 text-surface-400',
                isFocused && !error && !success && 'text-accent-500',
                error && 'text-danger-500',
                success && 'text-success-500'
              )}
            >
              {icon}
            </span>
          )}

          <input
            type={inputType}
            style={{
              backgroundColor: disabled ? undefined : 'var(--bg-input)',
              borderColor: error ? undefined : success ? undefined : 'var(--border-main)',
            }}
            className={cn(
              // Base styles
              'w-full rounded-lg border transition-all duration-150',
              'placeholder:text-surface-400 dark:placeholder:text-surface-500',
              // Size
              sizeStyles[inputSize],
              // Icon padding
              icon && 'pl-10',
              (rightIcon || type === 'password' || error || success) && 'pr-10',
              // Hover state
              !error && !success && !disabled && 'hover:border-surface-400 dark:hover:border-surface-500',
              // Focus state
              !error && !success && 'focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 dark:focus:border-accent-400 dark:focus:ring-accent-400/20',
              // Error state
              error && 'border-danger-500 focus:border-danger-500 focus:ring-2 focus:ring-danger-500/20',
              // Success state
              success && 'border-success-500 focus:border-success-500 focus:ring-2 focus:ring-success-500/20',
              // Disabled
              disabled && 'bg-surface-100 dark:bg-surface-700 cursor-not-allowed opacity-60',
              // Remove default outline
              'outline-none',
              className
            )}
            ref={ref}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            {...props}
          />

          {/* Right side icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {rightIcon && !error && !success && type !== 'password' && (
              <button
                type="button"
                onClick={handleRightIconClick}
                className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                tabIndex={-1}
                disabled={disabled}
              >
                {rightIcon}
              </button>
            )}

            {type === 'password' && !error && !success && (
              <button
                type="button"
                onClick={handleRightIconClick}
                className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 p-1 rounded transition-colors"
                tabIndex={-1}
                disabled={disabled}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}

            {error && (
              <AlertCircle className="h-4 w-4 text-danger-500" />
            )}

            {success && !error && (
              <CheckCircle className="h-4 w-4 text-success-500" />
            )}
          </div>
        </div>

        {(error || helper) && (
          <p
            className={cn(
              'text-sm mt-1.5',
              error
                ? 'text-danger-600 dark:text-danger-400'
                : 'text-surface-500 dark:text-surface-400'
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

export { Input };
