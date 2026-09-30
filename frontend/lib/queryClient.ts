import {MutationCache, QueryClient} from '@tanstack/react-query';
import {createQueryErrorHandler} from '@/lib/utils/error-handler';

/**
 * Singleton QueryClient instance shared across the app.
 *
 * SEC: Exported so that the logout flow can call queryClient.clear()
 * to wipe cached server state (prevents data leakage between sessions).
 *
 * Used by:
 * - app/providers.tsx (QueryClientProvider)
 * - lib/hooks/useAuth.ts (cache clearing on logout)
 */
let queryClientInstance: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient({
      mutationCache: new MutationCache({
        onError: (error) => {
          createQueryErrorHandler()(error as Error);
        },
      }),
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,  // 5 minutes — overridden per-hook where needed
          gcTime: 10 * 60 * 1000,    // 10 minutes garbage collection
          // BUG-L2: a blanket `retry: 1` also retried 4xx. A request for a record that does
          // not exist (a stale course link, a bad id) is not transient — retrying it only
          // doubles the wait before the page can render its not-found branch, which is gated
          // on isLoading. Worst case that was 30s (GET timeout) x 2. Retry only what can
          // actually succeed on a second attempt: network failures and 5xx.
          retry: (failureCount: number, error: unknown) => {
            const status = (error as {response?: {status?: number}})?.response?.status;
            // 401 is NOT retried here: lib/api/client.ts owns it. Its response interceptor
            // refreshes via a shared mutex and replays the original request itself, so a
            // recoverable 401 never surfaces to React Query — retrying here would only double
            // every genuinely-expired request and delay the login redirect by a round trip.
            // 403 is NOT retried either: authenticated-but-forbidden cannot be fixed by a
            // second identical request. RBAC gates read permissions from the Zustand auth
            // store (usePermissions -> useAuth), never from a query, so no retry policy here
            // can affect the permission set.
            const TERMINAL_4XX = [400, 401, 403, 404, 405, 409, 410, 422];
            if (typeof status === 'number' && TERMINAL_4XX.includes(status)) return false;
            return failureCount < 1;
          },
          refetchOnWindowFocus: false,
        },
        mutations: {
          // Writes are not safely repeatable by default. A timed-out POST may
          // still complete server-side, so retrying can create duplicates.
          retry: false,
        },
      },
    });
  }
  return queryClientInstance;
}
