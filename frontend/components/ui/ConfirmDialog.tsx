'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {modalVariants, overlayVariants} from '@/lib/animations/variants';
import {useReducedMotionSafe} from '@/lib/animation';

/**
 * Optional textarea slot for "destructive action with reason" pattern
 * (e.g. Reject Leave, Cancel Request). When `reason` is set, a textarea is
 * rendered above the action buttons and its value is passed to `onConfirm`.
 */
export interface ConfirmDialogReason {
  /** Field label rendered above the textarea (e.g. "Reason for rejection"). */
  label: string;
  /** Optional placeholder text inside the textarea. */
  placeholder?: string;
  /** If true, the Confirm button is disabled until the textarea is non-empty (and meets `minLength`). */
  required?: boolean;
  /** Minimum trimmed length required to enable Confirm (defaults to 1 when `required`). */
  minLength?: number;
  /** Number of visible rows (defaults to 3). */
  rows?: number;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  /**
   * When set, renders a textarea above the action buttons. The trimmed value is
   * passed as the `reason` argument to `onConfirm`. Existing call sites that
   * omit this prop continue to work unchanged.
   */
  reason?: ConfirmDialogReason;
}

// Focus-trap pattern adopted from Modal.tsx (S2-E audit N-4)
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ConfirmDialog({
                                isOpen,
                                onClose,
                                onConfirm,
                                title,
                                message,
                                confirmText = 'Confirm',
                                cancelText = 'Cancel',
                                type = 'danger',
                                loading = false,
                                reason,
                              }: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [reasonValue, setReasonValue] = useState('');
  const {pick} = useReducedMotionSafe();

  // Reset the reason textarea each time the dialog is opened so stale values
  // don't leak between separate confirm flows.
  useEffect(() => {
    if (isOpen) setReasonValue('');
  }, [isOpen]);

  const trimmedReason = reasonValue.trim();
  const reasonMinLength = reason?.required ? Math.max(reason.minLength ?? 1, 1) : (reason?.minLength ?? 0);
  const reasonInvalid = !!reason && (reason.required ?? false) && trimmedReason.length < reasonMinLength;

  // Handle escape key + Tab focus trap (cycle within focusable children)
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [loading, onClose]
  );

  // Focus trap + escape handling + previously-focused element restoration
  useEffect(() => {
    if (isOpen) {
      // Save current focus to restore on close
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      // Focus the cancel button when dialog opens (safer default)
      cancelButtonRef.current?.focus();
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      // Restore focus to the element that triggered the dialog
      previousFocusRef.current?.focus();
    };
  }, [isOpen, handleKeyDown]);

  const typeStyles = {
    danger: {
      icon: (
        <svg className="w-6 h-6 text-danger-600 dark:text-danger-400" fill="none" stroke="currentColor"
             viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      ),
      buttonClass: 'bg-danger-600 hover:bg-danger-700 focus:ring-danger-500',
      bgClass: 'bg-danger-100 dark:bg-danger-900/30',
    },
    warning: {
      icon: (
        <svg className="w-6 h-6 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor"
             viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      ),
      buttonClass: 'bg-warning-600 hover:bg-warning-700 focus:ring-warning-500',
      bgClass: 'bg-warning-100 dark:bg-warning-900/30',
    },
    info: {
      icon: (
        <svg className="w-6 h-6 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor"
             viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
      buttonClass: 'bg-accent-600 hover:bg-accent-700 focus:ring-accent-500',
      bgClass: 'bg-accent-100 dark:bg-accent-900/30',
    },
  };

  const style = typeStyles[type];

  const handleConfirmClick = async () => {
    if (reason) {
      if (reasonInvalid) return;
      await onConfirm(trimmedReason);
    } else {
      await onConfirm();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center p-4 z-50"
          onClick={handleBackdropClick}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pick(overlayVariants)}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            className="bg-[var(--bg-card)] rounded-lg shadow-dropdown max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pick(modalVariants)}
          >
        <div className="flex gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${style.bgClass} flex items-center justify-center`}>
            {style.icon}
          </div>
          <div className="flex-1">
            <h3
              id="confirm-dialog-title"
              className="text-lg font-semibold text-[var(--text-primary)] mb-2"
            >
              {title}
            </h3>
            <p
              id="confirm-dialog-description"
              className="text-body-secondary mb-6"
            >
              {message}
            </p>
            {reason && (
              <div className="mb-6">
                <label
                  htmlFor="confirm-dialog-reason"
                  className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
                >
                  {reason.label}
                  {reason.required && <span className="text-danger-500 ml-1" aria-label="required">*</span>}
                </label>
                <textarea
                  id="confirm-dialog-reason"
                  value={reasonValue}
                  onChange={(e) => setReasonValue(e.target.value)}
                  rows={reason.rows ?? 3}
                  placeholder={reason.placeholder}
                  disabled={loading}
                  required={reason.required}
                  aria-invalid={reasonInvalid}
                  className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-primary)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button ref={cancelButtonRef}
                      type="button"
                      onClick={onClose}
                      disabled={loading}
                      aria-label={`${cancelText} button`}
                      className="press-scale flex-1 px-4 py-2.5 border border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-card-hover)] disabled:opacity-50 disabled:cursor-not-allowed font-medium text-[var(--text-secondary)] transition-[color,background-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-standard)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--ring-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirmClick}
                disabled={loading || reasonInvalid}
                aria-label={`${confirmText} button`}
                aria-busy={loading}
                className={`press-scale flex-1 px-4 py-2.5 ${style.buttonClass} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-[background-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-standard)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--ring-primary)] flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Processing...
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
