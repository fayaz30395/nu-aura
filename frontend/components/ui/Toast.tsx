'use client';

import type {ReactNode} from 'react';
import {notifications} from '@mantine/notifications';
import {AlertTriangle, CheckCircle2, Info, XCircle} from 'lucide-react';

/**
 * The app's single toast system: Mantine notifications (mounted once in app/providers.tsx).
 * `useToast` from here and from `@/components/notifications` are thin adapters over it.
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

const TOAST_COLORS: Record<ToastType, string> = {
  success: 'green',
  error: 'red',
  warning: 'yellow',
  info: 'blue',
};

const TOAST_ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 size={18} aria-hidden="true"/>,
  error: <XCircle size={18} aria-hidden="true"/>,
  warning: <AlertTriangle size={18} aria-hidden="true"/>,
  info: <Info size={18} aria-hidden="true"/>,
};

// Status tokens from globals.css (ok / err / warn / info)
const TOAST_TOKEN: Record<ToastType, string> = {
  success: 'ok',
  error: 'err',
  warning: 'warn',
  info: 'info',
};

const TOAST_TITLES: Record<ToastType, string> = {
  success: 'Success',
  info: 'Notice',
  warning: 'Warning',
  error: 'Error',
};

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 5000,
  info: 5000,
  warning: 6000,
  error: 7000,
};

export interface ShowToastOptions {
  type: ToastType;
  title?: string;
  message?: string;
  /** Milliseconds; 0 keeps the toast open until dismissed. */
  duration?: number;
}

export function showToast({type, title, message, duration}: ShowToastOptions): void {
  const autoClose = duration ?? DEFAULT_DURATION[type];
  notifications.show({
    color: TOAST_COLORS[type],
    title: title ?? TOAST_TITLES[type],
    message: message ?? '',
    autoClose: autoClose === 0 ? false : autoClose,
    icon: TOAST_ICONS[type],
    withCloseButton: true,
    // Errors interrupt (assertive); everything else is announced politely.
    role: type === 'error' ? 'alert' : 'status',
    styles: {
      icon: {
        backgroundColor: `var(--${TOAST_TOKEN[type]}-bg)`,
        color: `var(--${TOAST_TOKEN[type]}-fg)`,
      },
      title: {color: 'var(--text-primary)', fontWeight: 600},
      description: {color: 'var(--text-secondary)'},
    },
  });
}

interface ToastApi {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const toastApi: ToastApi = {
  showToast: (type, message, duration) => showToast({type, message, duration}),
  success: (message, duration) => showToast({type: 'success', message, duration}),
  error: (message, duration) => showToast({type: 'error', message, duration}),
  warning: (message, duration) => showToast({type: 'warning', message, duration}),
  info: (message, duration) => showToast({type: 'info', message, duration}),
};

/** Stable toast API (message-first). Safe to call outside any provider. */
export function useToast(): ToastApi {
  return toastApi;
}

/** @deprecated Toasts render through Mantine `<Notifications>`; this is a pass-through kept for old imports. */
export function ToastProvider({children}: { children: ReactNode }) {
  return <>{children}</>;
}
