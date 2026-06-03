'use client';

import {createContext, ReactNode, useCallback, useContext, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {toastVariants} from '@/lib/animations/variants';
import {useReducedMotionSafe} from '@/lib/animation';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({children}: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, duration = 5000) => {
      const id = Math.random().toString(36).substr(2, 9);
      const toast: Toast = {id, type, message, duration};

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((message: string, duration?: number) => {
    showToast('success', message, duration);
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast('error', message, duration);
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast('warning', message, duration);
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast('info', message, duration);
  }, [showToast]);

  const value = {showToast, success, error, warning, info};

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true"
           className="fixed bottom-[22px] right-[22px] z-50 flex flex-col gap-[10px] pointer-events-none [&>*]:pointer-events-auto">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)}/>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// Per-type icon chip backgrounds, sourced from status tokens (light + dark parity built in).
const chipStyles: Record<ToastType, { background: string; color: string }> = {
  success: {background: 'var(--ok-bg)', color: 'var(--ok-fg)'},
  info: {background: 'var(--accent-soft)', color: 'var(--accent-text)'},
  warning: {background: 'var(--warn-bg)', color: 'var(--warn-fg)'},
  error: {background: 'var(--err-bg)', color: 'var(--err-fg)'},
};

const titles: Record<ToastType, string> = {
  success: 'Success',
  info: 'Notice',
  warning: 'Warning',
  error: 'Error',
};

function ToastItem({toast, onClose}: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
      </svg>
    ),
    error: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
      </svg>
    ),
    warning: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    ),
    info: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
  };

  const {pick} = useReducedMotionSafe();

  return (
    <motion.div
      layout
      role="alert"
      className="flex items-start gap-3 min-w-[300px] max-w-[380px] rounded-[13px] border border-[var(--border)] bg-[var(--surface)] p-[13px_14px] shadow-[var(--sh-pop)]"
      variants={pick(toastVariants)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div
        className="flex-shrink-0 grid place-items-center w-[30px] h-[30px] rounded-[9px]"
        style={chipStyles[toast.type]}
      >
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0 pt-px">
        <div className="text-[13px] font-semibold text-[var(--text-1)]">{titles[toast.type]}</div>
        <p className="mt-0.5 text-xs leading-[1.45] text-[var(--text-3)] break-words">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="press-scale flex-shrink-0 grid place-items-center w-6 h-6 rounded-[7px] text-[var(--text-3)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-1)] transition-[background-color,color,transform] duration-[var(--motion-fast)] ease-[var(--ease-standard)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </motion.div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
