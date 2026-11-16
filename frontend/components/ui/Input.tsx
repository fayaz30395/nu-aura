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
    const hasError = Boolean(error);
    const hasSuccess = Boolean(success);

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
      sm: 'h-9 min-h-9 text-sm px-3',
      md: 'h-10 min-h-10 text-sm px-3',
      lg: 'h-11 min-h-11 text-base px-3.5',
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-[13px] font-medium mb-1 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)]',
              error
                ? 'text-[var(--err-fg)]'
                : success
                  ? 'text-[var(--ok-fg)]'
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
                error && 'text-[var(--err-fg)]',
                success && 'text-[var(--ok-fg)]'
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
              'w-full rounded-[var(--radius-md)] border text-[var(--text-primary)] transition-[border-color,box-shadow,color] duration-[var(--motion-base)] ease-[var(--ease-standard)]',
              'placeholder:text-[var(--text-tertiary)]',
              // Size
              sizeStyles[inputSize],
              // Icon padding
              icon && 'pl-10',
              (rightIcon || type === 'password' || error || success) && 'pr-10',
              // Hover state
              !hasError && !hasSuccess && !disabled && 'hover:border-[var(--border-strong)]',
                // Focus state — Aura accent border + soft focus ring (--sh-focus)
              !hasError && !hasSuccess && 'focus:border-[var(--accent)] focus:shadow-[var(--sh-focus)]',
                // Error state
              hasError && 'border-[var(--err-fg)] focus:border-[var(--err-fg)] focus:shadow-[0_0_0_3px_var(--ring-danger)]',
                // Success state
              hasSuccess && 'border-[var(--ok-fg)] focus:border-[var(--ok-fg)] focus:shadow-[0_0_0_3px_var(--ring-success)]',
              // Disabled
              disabled && 'bg-[var(--surface-sunken)] cursor-not-allowed opacity-60',
              props.readOnly && !disabled && 'bg-[var(--surface-sunken)] focus:border-[var(--border-main)] focus:shadow-none',
              // Remove default outline
              'outline-none',
              className
            )}
            ref={ref}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            aria-invalid={hasError}
            aria-required={props.required ? 'true' : undefined}
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
              <AlertCircle className="motion-scale-in h-4 w-4 text-[var(--err-fg)]"/>
            )}

            {success && !error && (
              <CheckCircle className="motion-scale-in h-4 w-4 text-[var(--ok-fg)]"/>
            )}
          </div>
        </div>

        {hasMessage && (
          <p
            id={messageId}
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

Input.displayName = 'Input';

export {Input};
