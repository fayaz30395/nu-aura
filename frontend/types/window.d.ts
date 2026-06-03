declare global {
  interface Window {
    nuToast?: (title: string, options: { msg: string; type: 'info' | 'success' | 'warning' | 'error' | 'ok' | 'warn' }) => void;
  }
}

export {};
