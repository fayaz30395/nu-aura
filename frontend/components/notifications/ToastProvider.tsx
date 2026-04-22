'use client';

import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {AlertCircle, AlertTriangle, CheckCircle, Info, X} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const toastColors = {
  success: "bg-status-success-bg border-status-success-border text-status-success-text",
  error: "bg-status-danger-bg border-status-danger-border text-status-danger-text",
  info: "bg-accent-subtle border-[var(--accent-primary)] text-accent",
  warning: "bg-status-warning-bg border-status-warning-border text-status-warning-text",
};

const iconColors = {
  success: "text-status-success-text",
  error: "text-status-danger-text",
  info: "text-accent",
  warning: "text-status-warning-text",
};

const ToastItem: React.FC<{ toast: Toast; onRemove: () => void }> = ({toast, onRemove}) => {
  const Icon = toastIcons[toast.type];

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(onRemove, toast.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onRemove]);

  return (
    <div
      className={`
        flex items-start gap-4 p-4 rounded-lg border-l-4 shadow-[var(--shadow-dropdown)]
        animate-in slide-in-from-right fade-in duration-300
        ${toastColors[toast.type]}
      `}
      role="alert"
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColors[toast.type]}`}/>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-sm opacity-90">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm font-medium underline hover:no-underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={onRemove}
        className='flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded'
      >
        <X className="h-4 w-4"/>
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, {...toast, id}]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => {
    addToast({type: 'success', title, message});
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({type: 'error', title, message, duration: 8000});
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({type: 'info', title, message});
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({type: 'warning', title, message, duration: 6000});
  }, [addToast]);

  return (
    <ToastContext.Provider value={{toasts, addToast, removeToast, success, error, info, warning}}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={() => removeToast(toast.id)}/>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
