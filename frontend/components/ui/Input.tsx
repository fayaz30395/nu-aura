'use client';

import React from 'react';
import {cn} from '@/lib/utils';
import {AlertCircle, CheckCircle, Eye, EyeOff} from 'lucide-react';

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
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    const messageId = `${generatedId}-message`;
    const hasMessage = Boolean(error || helper);
    const describedBy =
      [props['aria-describedby'], hasMessage ? messageId : undefined]
        .filter(Boolean)
        .join(' ') || undefined;

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
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium mb-1.5 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)]',
              error
                ? 'text-danger-600 dark:text-danger-400'
                : success
                  ? 'text-success-600 dark:text-success-400'
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
                'absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]',
                'transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)]',
                isFocused && !error && !success && 'text-[var(--accent)]',
                error && 'text-danger-500',
                success && 'text-success-500'
              )}
            >
              {icon}
            </span>
          )}

          <input
            id={inputId}
            type={inputType}
            style={{
              backgroundColor: disabled ? undefined : 'var(--bg-input)',
              borderColor: error ? undefined : success ? undefined : 'var(--border-main)',
            }}
            className={cn(
              // Aura: 10px control radius + inset top shadow (--inset-input). Focus
              // and validation state layer on the token-driven accent/status ring.
              // Compositor-safe: only color + box-shadow transition.
              'w-full rounded-aura-control border shadow-[var(--inset-input)] transition-[border-color,box-shadow,color] duration-[var(--motion-base)] ease-[var(--ease-standard)]',
              'placeholder:text-[var(--text-3)]',
              // Size
              sizeStyles[inputSize],
              // Icon padding
              icon && 'pl-10',
              (rightIcon || type === 'password' || error || success) && 'pr-10',
              // Hover state
              !error && !success && !disabled && 'hover:border-[var(--border-strong)]',
              // Focus state — Aura accent border + soft focus ring (--sh-focus)
              !error && !success && 'focus:border-[var(--accent)] focus:shadow-[var(--inset-input),var(--sh-focus)]',
              // Error state
              error && 'border-danger-500 focus:border-danger-500 focus:shadow-[var(--inset-input),0_0_0_3px_var(--ring-danger)]',
              // Success state
              success && 'border-success-500 focus:border-success-500 focus:shadow-[var(--inset-input),0_0_0_3px_var(--ring-success)]',
              // Disabled
              disabled && 'bg-[var(--surface-sunken)] cursor-not-allowed opacity-60',
              // Remove default outline
              'outline-none',
              className
            )}
            ref={ref}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            {...props}
            aria-describedby={describedBy}
          />

          {/* Right side icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {rightIcon && !error && !success && type !== 'password' && (
              <button
                type="button"
                onClick={handleRightIconClick}
                className="press-scale text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors duration-[var(--motion-fast)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] rounded disabled:cursor-not-allowed disabled:opacity-60"
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
                className="press-scale text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 p-1 rounded transition-colors duration-[var(--motion-fast)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
              <AlertCircle className="motion-scale-in h-4 w-4 text-danger-500"/>
            )}

            {success && !error && (
              <CheckCircle className="motion-scale-in h-4 w-4 text-success-500"/>
            )}
          </div>
        </div>

        {hasMessage && (
          <p
            id={messageId}
            className={cn(
              'motion-fade text-sm mt-1.5',
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

export {Input};
