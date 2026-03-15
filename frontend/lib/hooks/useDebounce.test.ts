/**
 * Tests for useDebounce hooks
 * Run with: npx vitest run lib/hooks/useDebounce.test.ts
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useDebounce,
  useDebouncedCallback,
  useAbortController,
  useThrottledCallback,
} from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated', delay: 500 });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now value should be updated
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 500 } }
    );

    // Rapid changes
    rerender({ value: 'b', delay: 500 });
    act(() => { vi.advanceTimersByTime(200); });

    rerender({ value: 'c', delay: 500 });
    act(() => { vi.advanceTimersByTime(200); });

    rerender({ value: 'd', delay: 500 });

    // Still showing initial value
    expect(result.current).toBe('a');

    // Wait for full delay
    act(() => { vi.advanceTimersByTime(500); });

    // Should show final value
    expect(result.current).toBe('d');
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce callback execution', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    // Call the debounced callback
    act(() => {
      result.current('arg1');
    });

    // Callback should not be called immediately
    expect(callback).not.toHaveBeenCalled();

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now callback should be called
    expect(callback).toHaveBeenCalledWith('arg1');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should only call callback once for rapid calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    // Rapid calls
    act(() => {
      result.current('call1');
      result.current('call2');
      result.current('call3');
    });

    // Advance partial time
    act(() => { vi.advanceTimersByTime(200); });

    act(() => {
      result.current('call4');
    });

    // Advance full time
    act(() => { vi.advanceTimersByTime(500); });

    // Only the last call should be executed
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('call4');
  });
});

describe('useAbortController', () => {
  it('should provide getSignal and abort functions', () => {
    const { result } = renderHook(() => useAbortController());

    expect(result.current.getSignal).toBeDefined();
    expect(result.current.abort).toBeDefined();
    expect(typeof result.current.getSignal).toBe('function');
    expect(typeof result.current.abort).toBe('function');
  });

  it('should create a new AbortSignal', () => {
    const { result } = renderHook(() => useAbortController());

    let signal: AbortSignal;
    act(() => {
      signal = result.current.getSignal();
    });

    expect(signal!).toBeInstanceOf(AbortSignal);
    expect(signal!.aborted).toBe(false);
  });

  it('should abort signal when abort is called', () => {
    const { result } = renderHook(() => useAbortController());

    let signal: AbortSignal;
    act(() => {
      signal = result.current.getSignal();
    });

    expect(signal!.aborted).toBe(false);

    act(() => {
      result.current.abort();
    });

    expect(signal!.aborted).toBe(true);
  });

  it('should abort previous signal when getting new one', () => {
    const { result } = renderHook(() => useAbortController());

    let signal1: AbortSignal;
    let signal2: AbortSignal;

    act(() => {
      signal1 = result.current.getSignal();
    });

    act(() => {
      signal2 = result.current.getSignal();
    });

    // First signal should be aborted
    expect(signal1!.aborted).toBe(true);
    // Second signal should not be aborted
    expect(signal2!.aborted).toBe(false);
  });
});

describe('useThrottledCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute callback immediately on first call', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(callback, 500));

    act(() => {
      result.current('first');
    });

    expect(callback).toHaveBeenCalledWith('first');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should throttle subsequent calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(callback, 500));

    // First call - executes immediately
    act(() => {
      result.current('first');
    });

    // Rapid subsequent calls - should be throttled
    act(() => {
      result.current('second');
      result.current('third');
      result.current('fourth');
    });

    // Only first should have been called
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('first');

    // Advance time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // After throttle period, one more call should execute (the trailing call)
    expect(callback).toHaveBeenCalledTimes(2);
    // The trailing call will be the last argument passed before the timer fired
    expect(callback).toHaveBeenNthCalledWith(2, 'second');
  });

  it('should allow new calls after throttle period', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(callback, 500));

    // First call
    act(() => {
      result.current('first');
    });

    // Wait for throttle period
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Second call should execute immediately
    act(() => {
      result.current('second');
    });

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenNthCalledWith(1, 'first');
    expect(callback).toHaveBeenNthCalledWith(2, 'second');
  });
});
