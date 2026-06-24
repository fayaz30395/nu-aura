'use client';

import {QueryClientProvider} from '@tanstack/react-query';
import {GoogleOAuthProvider} from '@react-oauth/google';
import {MotionConfig} from 'framer-motion';
import {useEffect, useState} from 'react';
import dynamic from 'next/dynamic';
import {Notifications} from '@mantine/notifications';
import {DarkModeProvider, MantineThemeProvider} from '@/components/layout';
import {ErrorBoundary} from '@/components/ui/ErrorBoundary';
import {ToastProvider} from '@/components/ui/Toast';
import {ToastProvider as NotificationsToastProvider} from '@/components/notifications/ToastProvider';
import {AuthGuard} from '@/components/auth/AuthGuard';
import {useTokenRefresh} from '@/lib/hooks/useTokenRefresh';
import {useSessionTimeout} from '@/lib/hooks/useSessionTimeout';
import {useAuth} from '@/lib/hooks/useAuth';
import {env} from '@/lib/config';
import {initGlobalErrorHandlers} from '@/lib/utils/error-handler';
import {getQueryClient} from '@/lib/queryClient';

// ponytail: dynamic import keeps STOMP+SockJS (~120kb) out of the login-page bundle
// loading: null — WebSocketProvider has no visible UI output, no fallback needed
const WebSocketProvider = dynamic(
  () => import('@/lib/contexts/WebSocketContext').then(m => m.WebSocketProvider),
  {ssr: false, loading: () => null},
);

// Import Mantine core styles
import '@mantine/core/styles.css';
// Import Mantine notifications styles — required for notifications.show() to render
import '@mantine/notifications/styles.css';

const GOOGLE_CLIENT_ID = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_OAUTH_DISABLED_CLIENT_ID = 'nu-aura-google-oauth-disabled';

/**
 * Inner component that uses hooks requiring the Zustand store.
 * Separated because useAuth (Zustand) must be called inside a component.
 * Manages:
 * - Token refresh (proactive token refresh every 50 min)
 * - Session timeout (inactivity logout after 30 min)
 */
function TokenRefreshManager({children}: { children: React.ReactNode }) {
  const isAuthenticated = useAuth((state) => state.isAuthenticated);
  useTokenRefresh(isAuthenticated);
  useSessionTimeout(isAuthenticated);
  return <>{children}</>;
}

export function Providers({children}: { children: React.ReactNode }) {
  // Initialize global error handlers on mount
  useEffect(() => {
    initGlobalErrorHandlers();
  }, []);

  const [queryClient] = useState(() => getQueryClient());

  const content = (
    <MotionConfig reducedMotion="user">
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <NotificationsToastProvider>
          <DarkModeProvider>
            <MantineThemeProvider>
              <Notifications position="top-right" autoClose={5000}/>
              <WebSocketProvider>
                <TokenRefreshManager>
                  <AuthGuard>
                    {children}
                  </AuthGuard>
                </TokenRefreshManager>
              </WebSocketProvider>
            </MantineThemeProvider>
          </DarkModeProvider>
        </NotificationsToastProvider>
      </ToastProvider>
    </QueryClientProvider>
    </MotionConfig>
  );

  // Always wrap with GoogleOAuthProvider to avoid "must be used within GoogleOAuthProvider"
  // errors on connector pages that call useGoogleLogin. The Google SDK does not handle
  // an empty client ID gracefully, so local production smokes use a non-empty sentinel
  // while the UI hides Google actions when OAuth is not configured.
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || GOOGLE_OAUTH_DISABLED_CLIENT_ID}>
        {content}
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}
