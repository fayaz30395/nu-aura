'use client';

import React, { useEffect, ReactNode } from 'react';
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

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  size = 'md',
  className,
  closeOnBackdrop = true,
  closeOnEscape = true,
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-4rem)]',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full bg-white dark:bg-surface-800 rounded-xl shadow-xl',
          'max-h-[90vh] overflow-hidden flex flex-col',
          'animate-scale-in',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

const ModalHeader: React.FC<ModalHeaderProps> = ({
  children,
  className,
  onClose,
  showCloseButton = true,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-700',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        {typeof children === 'string' ? (
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50 truncate">
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
        'flex items-center justify-end gap-3 px-6 py-4',
        'border-t border-surface-200 dark:border-surface-700',
        'bg-surface-50 dark:bg-surface-800/50',
        className
      )}
    >
      {children}
    </div>
  );
};

export { Modal, ModalHeader, ModalBody, ModalFooter };
export type { ModalProps, ModalHeaderProps, ModalBodyProps, ModalFooterProps };
