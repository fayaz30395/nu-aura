'use client';

import {useCallback, useEffect, useRef} from 'react';

/**
 * ID of the aria-live region element injected into the DOM.
 * A single shared element avoids duplicates when multiple components use this hook.
 */
const ARIA_LIVE_REGION_ID = 'nu-aura-aria-live';

/**
 * Ensures a visually-hidden aria-live region exists in the DOM.
 * Returns the element so callers can set its textContent.
 */
function getOrCreateLiveRegion(priority: 'polite' | 'assertive'): HTMLElement {
  // We use two separate regions — one for each priority level — so that
  // an assertive announcement does not clobber the polite region's attribute.
  const id = `${ARIA_LIVE_REGION_ID}-${priority}`;
  let region = document.getElementById(id);

  if (!region) {
    region = document.createElement('div');
    region.id = id;
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');

    // Visually hidden but still read by screen readers
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    });

    document.body.appendChild(region);
  }

  return region;
}

/**
 * Hook for screen reader announcements.
 *
 * Uses an aria-live region to announce dynamic content changes such as
 * "3 items selected", "Record saved successfully", etc.
 *
 * @returns A function to trigger an announcement.
 *
 * @example
 * ```tsx
 * const announce = useAriaAnnounce();
 * // ...
 * announce('Employee record saved successfully');
 * announce('Form has 3 validation errors', 'assertive');
 * ```
 */
export function useAriaAnnounce(): (message: string, priority?: 'polite' | 'assertive') => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up any pending timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const region = getOrCreateLiveRegion(priority);

    // Clear and re-set the content so screen readers detect the change,
    // even if the same message is announced twice in a row.
    region.textContent = '';

    // A small delay ensures the DOM mutation is picked up as a new announcement
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      region.textContent = message;
    }, 50);
  }, []);

  return announce;
}

export default useAriaAnnounce;
