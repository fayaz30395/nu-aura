/**
 * Tests for useDebounce hooks
 * Run with: npx vitest run lib/hooks/useDebounce.test.ts
 */

import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useDebounce, useDebouncedCallback} from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const {result} = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', async () => {
    const {result, rerender} = renderHook(
      ({value, delay}) => useDebounce(value, delay),
      {initialProps: {value: 'initial', delay: 500}}
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({value: 'updated', delay: 500});

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
    const {result, rerender} = renderHook(
      ({value, delay}) => useDebounce(value, delay),
      {initialProps: {value: 'a', delay: 500}}
    );

    // Rapid changes
    rerender({value: 'b', delay: 500});
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({value: 'c', delay: 500});
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({value: 'd', delay: 500});

    // Still showing initial value
    expect(result.current).toBe('a');

    // Wait for full delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

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
    const {result} = renderHook(() => useDebouncedCallback(callback, 500));

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
    const {result} = renderHook(() => useDebouncedCallback(callback, 500));

    // Rapid calls
    act(() => {
      result.current('call1');
      result.current('call2');
      result.current('call3');
    });

    // Advance partial time
    act(() => {
      vi.advanceTimersByTime(200);
    });

    act(() => {
      result.current('call4');
    });

    // Advance full time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Only the last call should be executed
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('call4');
  });
});

