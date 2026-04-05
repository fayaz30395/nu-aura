import {useQueryClient} from '@tanstack/react-query';
import {useCallback, useEffect} from 'react';

/**
 * Hook for prefetching data on hover or visibility
 * Improves perceived performance by loading data before user needs it
 */
export function usePreloadData() {
  const queryClient = useQueryClient();

  /**
   * Prefetch a query when user hovers over an element
   * Use on links/buttons that navigate to data-heavy pages
   */
  const prefetchOnHover = useCallback(
    <T>(
      queryKey: readonly unknown[],
      queryFn: () => Promise<T>,
      staleTime = 60000 // 1 minute
    ) => {
      return {
        onMouseEnter: () => {
          queryClient.prefetchQuery({
            queryKey,
            queryFn,
            staleTime,
          });
        },
      };
    },
    [queryClient]
  );

  /**
   * Prefetch multiple queries in parallel
   */
  const prefetchMultiple = useCallback(
    async (
      queries: Array<{
        queryKey: readonly unknown[];
        queryFn: () => Promise<unknown>;
        staleTime?: number;
      }>
    ) => {
      await Promise.all(
        queries.map(({queryKey, queryFn, staleTime = 60000}) =>
          queryClient.prefetchQuery({
            queryKey,
            queryFn,
            staleTime,
          })
        )
      );
    },
    [queryClient]
  );

  /**
   * Invalidate and refetch queries
   */
  const invalidateAndRefetch = useCallback(
    async (queryKey: readonly unknown[]) => {
      await queryClient.invalidateQueries({queryKey});
      await queryClient.refetchQueries({queryKey});
    },
    [queryClient]
  );

  return {
    prefetchOnHover,
    prefetchMultiple,
    invalidateAndRefetch,
    queryClient,
  };
}

/**
 * Hook to prefetch data when component becomes visible
 * Uses Intersection Observer for lazy prefetching
 */
export function useVisibilityPrefetch<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  options?: {
    threshold?: number;
    enabled?: boolean;
    staleTime?: number;
  }
) {
  const queryClient = useQueryClient();
  const {threshold = 0.5, enabled = true, staleTime = 60000} = options || {};

  const prefetchRef = useCallback(
    (element: HTMLElement | null) => {
      if (!element || !enabled) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              queryClient.prefetchQuery({
                queryKey,
                queryFn,
                staleTime,
              });
              observer.disconnect();
            }
          });
        },
        {threshold}
      );

      observer.observe(element);

      return () => observer.disconnect();
    },
    [queryClient, queryKey, queryFn, threshold, enabled, staleTime]
  );

  return prefetchRef;
}

/**
 * Hook to preload critical data on mount
 * Use in layout components for dashboard data
 */
export function useCriticalDataPreload(
  queries: Array<{
    queryKey: readonly unknown[];
    queryFn: () => Promise<unknown>;
    staleTime?: number;
  }>,
  enabled = true
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    // Use requestIdleCallback for non-blocking prefetch
    const callback = () => {
      queries.forEach(({queryKey, queryFn, staleTime = 300000}) => {
        queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime,
        });
      });
    };

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(callback, {timeout: 2000});
      return () => cancelIdleCallback(id);
    } else {
      // Fallback for Safari
      const id = setTimeout(callback, 100);
      return () => clearTimeout(id);
    }
  }, [queryClient, queries, enabled]);
}
