'use client';

import React, {ReactNode, useCallback, useEffect, useId, useRef} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {modalVariants, overlayVariants} from '@/lib/animations/variants';
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

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-4rem)]',
};

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
    } else if (document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, [closeOnEscape, onClose]);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      requestAnimationFrame(() => {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        firstFocusable?.focus();
      });
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
      previousFocusRef.current?.focus();
    };
  }, [isOpen, handleKeyDown]);

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
            <motion.div
              className="absolute inset-0 bg-[var(--bg-overlay)]"
              onClick={closeOnBackdrop ? onClose : undefined}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={overlayVariants}
            />

            <motion.div
              ref={modalRef}
              className={cn(
                'relative w-full rounded-lg border flex flex-col overflow-hidden',
                'max-h-[90vh]',
                'bg-[var(--bg-elevated)] border-[var(--border-main)] shadow-[var(--shadow-dropdown)]',
                SIZE_CLASS[size],
                className
              )}
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
        'flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border-main)]',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        {typeof children === 'string' ? (
          <h2
            id={titleId}
            className="text-lg font-semibold text-[var(--text-primary)] truncate"
          >
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
          className={cn(
            'shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md',
            'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]',
            'transition-colors cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]'
          )}
          aria-label="Close modal"
        >
          <X className="h-4 w-4"/>
        </button>
      )}
    </div>
  );
};

const ModalBody: React.FC<ModalBodyProps> = ({children, className}) => (
  <div className={cn('flex-1 overflow-y-auto px-6 py-4', className)}>
    {children}
  </div>
);

const ModalFooter: React.FC<ModalFooterProps> = ({children, className}) => (
  <div
    className={cn(
      'flex items-center justify-end gap-2 px-6 py-4',
      'border-t border-[var(--border-main)] bg-[var(--bg-surface)]',
      className
    )}
  >
    {children}
  </div>
);

export {Modal, ModalHeader, ModalBody, ModalFooter};
export type {ModalProps, ModalHeaderProps, ModalBodyProps, ModalFooterProps};
