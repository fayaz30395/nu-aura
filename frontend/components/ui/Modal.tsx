'use client';

import React, {ReactNode, useCallback, useEffect, useId, useRef} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {modalVariants, overlayVariants} from '@/lib/animations/variants';
import {useReducedMotionSafe} from '@/lib/animation';
import {X} from 'lucide-react';
import {cn} from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

interface ModalHeaderProps {
  children: ReactNode;
  className?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const ModalTitleIdContext = React.createContext<string | undefined>(undefined);

const Modal: React.FC<ModalProps> = ({
                                       isOpen,
                                       onClose,
                                       children,
                                       size = 'md',
                                       className,
                                       closeOnBackdrop = true,
                                       closeOnEscape = true,
                                     }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const titleId = `modal-title-${generatedId}`;
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const {pick} = useReducedMotionSafe();

  // QA-003: Focus trap — trap Tab/Shift+Tab within modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && closeOnEscape) {
      onClose();
      return;
    }

    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [closeOnEscape, onClose]);

  useEffect(() => {
    if (isOpen) {
      // Save current focus to restore later
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // Auto-focus first focusable element in modal, skipping the header
      // close button so users land on the primary content control (e.g. "Save")
      // instead of "X" (wave-3 N-16).
      requestAnimationFrame(() => {
        const container = modalRef.current;
        if (!container) return;
        const focusableNodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        const initialFocus = Array.from(focusableNodes).find(
          (el) => !(el instanceof HTMLElement) || !(el.getAttribute('aria-label')?.toLowerCase().includes('close'))
        ) ?? focusableNodes[0];
        initialFocus?.focus();
      });
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
      // Restore focus to the element that triggered the modal
      previousFocusRef.current?.focus();
    };
  }, [isOpen, handleKeyDown]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-4rem)]',
  };

  return (
    <ModalTitleIdContext.Provider value={titleId}>
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            aria-modal="true"
            role="dialog"
            aria-labelledby={titleId}
            tabIndex={-1}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-[var(--bg-overlay)]"
              onClick={closeOnBackdrop ? onClose : undefined}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pick(overlayVariants)}
            />

            {/* Modal */}
            <motion.div
              ref={modalRef}
              className={cn(
                'relative w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] shadow-[var(--shadow-dropdown)]',
                'max-h-[90vh] overflow-hidden flex flex-col',
                sizeClasses[size],
                className
              )}
              onClick={(e) => e.stopPropagation()}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pick(modalVariants)}
            >
              {children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalTitleIdContext.Provider>
  );
};

const ModalHeader: React.FC<ModalHeaderProps> = ({
                                                   children,
                                                   className,
                                                   onClose,
                                                   showCloseButton = true,
                                                 }) => {
  const titleId = React.useContext(ModalTitleIdContext);

  return (
    <div
      className={cn(
        'row-between border-b border-[var(--border-main)] px-6 py-4',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        {typeof children === 'string' ? (
          <h2 id={titleId} className="text-xl font-semibold text-surface-900 dark:text-surface-50 truncate">
            {children}
          </h2>
        ) : (
          children
        )}
      </div>
      {showCloseButton && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="press-scale ml-4 p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 dark:hover:text-surface-200 transition-[color,background-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-standard)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" aria-hidden="true"/>
        </button>
      )}
    </div>
  );
};

const ModalBody: React.FC<ModalBodyProps> = ({children, className}) => {
  return (
    <div className={cn('flex-1 overflow-y-auto px-6 py-4', className)}>
      {children}
    </div>
  );
};

const ModalFooter: React.FC<ModalFooterProps> = ({children, className}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 border-t border-[var(--border-main)] bg-[var(--bg-surface)] px-6 py-4',
        className
      )}
    >
      {children}
    </div>
  );
};

export {Modal, ModalHeader, ModalBody, ModalFooter};
export type {ModalProps, ModalHeaderProps, ModalBodyProps, ModalFooterProps};
