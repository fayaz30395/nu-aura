'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useState, useEffect } from 'react';
import { DarkModeProvider, MantineThemeProvider } from '@/components/layout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';
import { ToastProvider as NotificationsToastProvider } from '@/components/notifications/ToastProvider';
import { WebSocketProvider } from '@/lib/contexts/WebSocketContext';
import { env } from '@/lib/config';
import { initGlobalErrorHandlers, createQueryErrorHandler } from '@/lib/utils/error-handler';

// Import Mantine core styles
import '@mantine/core/styles.css';

const GOOGLE_CLIENT_ID = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize global error handlers on mount
  useEffect(() => {
    initGlobalErrorHandlers();
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
          mutations: {
            onError: createQueryErrorHandler(),
          },
        },
      })
  );

  const content = (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <NotificationsToastProvider>
          <DarkModeProvider>
            <MantineThemeProvider>
              <WebSocketProvider>
                {children}
              </WebSocketProvider>
            </MantineThemeProvider>
          </DarkModeProvider>
        </NotificationsToastProvider>
      </ToastProvider>
    </QueryClientProvider>
  );

  // Always wrap with GoogleOAuthProvider to avoid "must be used within GoogleOAuthProvider" errors
  // during static generation. Empty clientId is handled gracefully by the library.
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        {content}
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}
