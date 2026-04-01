import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Debounce a value - returns the debounced value after the specified delay
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Returns a debounced version of the callback
 * @param callback - The callback to debounce
 * @param delay - Delay in milliseconds
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Hook that provides an AbortController for fetch requests
 * Automatically aborts on component unmount or when a new request is made
 */
export function useAbortController(): {
  getSignal: () => AbortSignal;
  abort: () => void;
} {
  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const getSignal = useCallback(() => {
    // Abort any previous request
    abort();
    // Create new controller
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  }, [abort]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return useMemo(() => ({ getSignal, abort }), [getSignal, abort]);
}

/**
 * Combined hook for debounced fetch with automatic abort handling
 * Prevents race conditions in search/filter scenarios
 */
export function useDebouncedFetch<T>(
  fetchFn: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  delay: number = 300
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { getSignal } = useAbortController();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const execute = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const signal = getSignal();
        const result = await fetchFn(signal);

        if (mountedRef.current) {
          setData(result);
        }
      } catch (err) {
        if (err instanceof Error) {
          // Ignore abort errors
          if (err.name === 'AbortError') {
            return;
          }
          if (mountedRef.current) {
            setError(err);
          }
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }, delay);
  }, [fetchFn, delay, getSignal]);

  useEffect(() => {
    mountedRef.current = true;
    execute();

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: execute };
}

/**
 * Throttle a callback - limits execution to once per interval
 * Unlike debounce, throttle executes during the wait period
 * Useful for scroll, resize, and other high-frequency events
 *
 * @param callback - The function to throttle
 * @param limit - Minimum time between calls in milliseconds
 */
export function useThrottledCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  limit: number = 100
): T {
  const lastRunRef = useRef(0);
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // The inner arrow function uses refs (callbackRef, timeoutRef, lastRunRef) which
  // the exhaustive-deps rule cannot analyse. All external state is captured via refs,
  // so [limit] is the only meaningful dependency here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const remaining = limit - (now - lastRunRef.current);

      if (remaining <= 0) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        lastRunRef.current = now;
        callbackRef.current(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastRunRef.current = Date.now();
          timeoutRef.current = null;
          callbackRef.current(...args);
        }, remaining);
      }
    }) as T,
    [limit]
  );
}

export default useDebounce;
