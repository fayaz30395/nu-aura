'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useState } from 'react';
import { DarkModeProvider, MantineThemeProvider } from '@/components/layout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';
import { WebSocketProvider } from '@/lib/contexts/WebSocketContext';

// Import Mantine core styles
import '@mantine/core/styles.css';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  const content = (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <DarkModeProvider>
          <MantineThemeProvider>
            <WebSocketProvider>
              {children}
            </WebSocketProvider>
          </MantineThemeProvider>
        </DarkModeProvider>
      </ToastProvider>
    </QueryClientProvider>
  );

  return (
    <ErrorBoundary>
      {GOOGLE_CLIENT_ID ? (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          {content}
        </GoogleOAuthProvider>
      ) : (
        content
      )}
    </ErrorBoundary>
  );
}
