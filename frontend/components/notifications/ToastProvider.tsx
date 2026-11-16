'use client';

import type {ReactNode} from 'react';
import {showToast, type ToastType} from '@/components/ui/Toast';

export type {ToastType};

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

/** Title-first adapter: a lone argument is shown as the toast body under the default title. */
function show(type: ToastType, title: string, message?: string, duration?: number) {
  if (message) showToast({type, title, message, duration});
  else showToast({type, message: title, duration});
}

const toastApi: ToastContextType = {
  addToast: ({type, title, message, duration}) => show(type, title, message, duration),
  success: (title, message) => show('success', title, message),
  error: (title, message) => show('error', title, message),
  info: (title, message) => show('info', title, message),
  warning: (title, message) => show('warning', title, message),
};

/** Stable toast API over the global Mantine notifications. Safe to call outside any provider. */
export const useToast = (): ToastContextType => toastApi;

/** @deprecated Toasts render through Mantine `<Notifications>`; this is a pass-through kept for old imports. */
export function ToastProvider({children}: { children: ReactNode }) {
  return <>{children}</>;
}
