'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useState, useEffect } from 'react';
import { DarkModeProvider, MantineThemeProvider } from '@/components/layout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';
import { ToastProvider as NotificationsToastProvider } from '@/components/notifications/ToastProvider';
import { WebSocketProvider } from '@/lib/contexts/WebSocketContext';
import { useTokenRefresh } from '@/lib/hooks/useTokenRefresh';
import { useAuth } from '@/lib/hooks/useAuth';
import { env } from '@/lib/config';
import { initGlobalErrorHandlers, createQueryErrorHandler } from '@/lib/utils/error-handler';

// Import Mantine core styles
import '@mantine/core/styles.css';

const GOOGLE_CLIENT_ID = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

/**
 * Inner component that uses hooks requiring the Zustand store.
 * Separated because useAuth (Zustand) must be called inside a component.
 */
function TokenRefreshManager({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuth((state) => state.isAuthenticated);
  useTokenRefresh(isAuthenticated);
  return <>{children}</>;
}

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
                <TokenRefreshManager>
                  {children}
                </TokenRefreshManager>
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
