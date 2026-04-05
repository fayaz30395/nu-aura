'use client';

import {useEffect} from 'react';

interface UseUnsavedChangesWarningOptions {
  isDirty: boolean;
  message?: string;
}

/**
 * Hook that warns users when they try to navigate away from a page with unsaved changes.
 * Works with React Hook Form's formState.isDirty.
 *
 * Handles:
 * - Browser tab close / refresh events
 * - Basic browser-level warning via beforeunload
 *
 * @param options.isDirty - Whether the form has unsaved changes (from formState.isDirty)
 * @param options.message - Custom warning message (default: standard unsaved changes message)
 *
 * @example
 * ```tsx
 * const { formState: { isDirty } } = useForm();
 * useUnsavedChangesWarning({
 *   isDirty,
 *   message: 'You have unsaved changes in this form.',
 * });
 * ```
 */
export function useUnsavedChangesWarning({
                                           isDirty,
                                           message = 'You have unsaved changes. Are you sure you want to leave?',
                                         }: UseUnsavedChangesWarningOptions): void {
  // Browser tab close / refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);
}

export default useUnsavedChangesWarning;
