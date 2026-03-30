'use client';

import React, { useEffect, useRef, useCallback, useId, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalVariants, overlayVariants } from '@/lib/animations/variants';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

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

      // Auto-focus first focusable element in modal
      requestAnimationFrame(() => {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        firstFocusable?.focus();
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
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ backgroundColor: 'var(--bg-overlay)' }}
            onClick={closeOnBackdrop ? onClose : undefined}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={overlayVariants}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            className={cn(
              'relative w-full rounded-lg border',
              'max-h-[90vh] overflow-hidden flex flex-col',
              sizeClasses[size],
              className
            )}
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-main)',
              boxShadow: 'var(--shadow-dropdown)',
            }}
            onClick={(e) => e.stopPropagation()}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={modalVariants}
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
        'flex items-center justify-between px-6 py-4',
        className
      )}
      style={{ borderBottom: '1px solid var(--border-main)' }}
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
          onClick={onClose}
          className="ml-4 p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 dark:hover:text-surface-200 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

const ModalBody: React.FC<ModalBodyProps> = ({ children, className }) => {
  return (
    <div className={cn('flex-1 overflow-y-auto px-6 py-4', className)}>
      {children}
    </div>
  );
};

const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 px-6 py-4',
        className
      )}
      style={{
        borderTop: '1px solid var(--border-main)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      {children}
    </div>
  );
};

export { Modal, ModalHeader, ModalBody, ModalFooter };
export type { ModalProps, ModalHeaderProps, ModalBodyProps, ModalFooterProps };
