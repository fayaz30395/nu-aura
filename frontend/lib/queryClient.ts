import { QueryClient, MutationCache } from '@tanstack/react-query';
import { createQueryErrorHandler } from '@/lib/utils/error-handler';

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
          retry: 1,
          refetchOnWindowFocus: false,
        },
        mutations: {
          retry: 1,
        },
      },
    });
  }
  return queryClientInstance;
}
