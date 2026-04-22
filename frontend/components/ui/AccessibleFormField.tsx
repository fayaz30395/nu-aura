'use client';

import React from 'react';
import {cn} from '@/lib/utils';

// ─── Props ──────────────────────────────────────────────────────────────
export interface AccessibleFormFieldProps {
  /** Visible label text for the form field */
  label: string;
  /** The `id` of the form input this label is associated with */
  htmlFor: string;
  /** Validation error message — rendered with role="alert" */
  error?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Optional help / hint text shown below the input */
  helpText?: string;
  /** The form input element(s) to wrap */
  children: React.ReactNode;
  /** Additional class names for the outer wrapper */
  className?: string;
}

/**
 * Accessible form field wrapper that enforces WCAG 2.1 AA compliance.
 *
 * Features:
 * - Associates `<label>` with input via `htmlFor` / `id`
 * - Displays validation error with `role="alert"` and `aria-live="polite"`
 * - Links error and help text to the input via `aria-describedby`
 * - Shows a required indicator with `aria-required` context
 *
 * The wrapped child input should include:
 *   - `id={htmlFor}`
 *   - `aria-describedby={descriptionIds}` (automatically provided via context below)
 *   - `aria-invalid={!!error}`
 *   - `aria-required={required}`
 *
 * @example
 * ```tsx
 * <AccessibleFormField label="Email" htmlFor="email" error={errors.email?.message} required>
 *   <Input id="email" aria-describedby="email-error email-help" aria-invalid={!!errors.email} aria-required />
 * </AccessibleFormField>
 * ```
 */
export const AccessibleFormField: React.FC<AccessibleFormFieldProps> = ({
                                                                          label,
                                                                          htmlFor,
                                                                          error,
                                                                          required = false,
                                                                          helpText,
                                                                          children,
                                                                          className,
                                                                        }) => {
  const errorId = `${htmlFor}-error`;
  const helpId = `${htmlFor}-help`;

  // Build the aria-describedby value for consumers
  const describedByParts: string[] = [];
  if (error) describedByParts.push(errorId);
  if (helpText) describedByParts.push(helpId);
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      <label
        htmlFor={htmlFor}
        className={cn(
          'block text-sm font-medium mb-1.5',
          error
            ? 'text-status-danger-text'
            : 'text-[var(--text-secondary)]'
        )}
      >
        {label}
        {required && (
          <span
            className='ml-0.5 text-status-danger-text'
            aria-hidden="true"
          >
            *
          </span>
        )}
      </label>
      {/* Clone children to inject aria attributes */}
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;

        // Only inject props into elements that accept them (DOM elements / forwardRef components)
        const injectedProps: Record<string, unknown> = {};

        if (describedBy) {
          injectedProps['aria-describedby'] = describedBy;
        }
        if (error) {
          injectedProps['aria-invalid'] = true;
        }
        if (required) {
          injectedProps['aria-required'] = true;
        }

        return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, injectedProps);
      })}
      {/* Help text */}
      {helpText && !error && (
        <p
          id={helpId}
          className="mt-1 text-caption"
        >
          {helpText}
        </p>
      )}
      {/* Error message */}
      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className='mt-1 text-xs text-status-danger-text'
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default AccessibleFormField;
