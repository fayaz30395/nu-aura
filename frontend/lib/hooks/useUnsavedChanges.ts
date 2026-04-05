'use client';

import {useCallback, useEffect, useRef} from 'react';
import {usePathname} from 'next/navigation';

/**
 * Hook that warns users when navigating away from a page with unsaved form changes.
 * Works with Next.js App Router's beforeunload + route change interception.
 *
 * @param isDirty - Whether the form has unsaved changes
 *
 * @example
 * ```tsx
 * const { formState: { isDirty } } = useForm();
 * useUnsavedChanges(isDirty);
 * ```
 */
export function useUnsavedChanges(isDirty: boolean): void {
  const isDirtyRef = useRef(isDirty);
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);

  // Keep the ref in sync so the beforeunload handler always sees the latest value
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // ── Browser close / refresh: native "Leave page?" dialog ──────────
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      // Modern browsers ignore custom messages but returnValue is still required
      // to trigger the native dialog.
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // ── Client-side navigation interception via click handler ─────────
  // Next.js App Router does not expose router events like Pages Router.
  // We intercept link clicks on <a> elements to show a confirm dialog.
  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!isDirtyRef.current) return;

      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Skip external links, hash-only links, and download links
      if (
        href.startsWith('http') ||
        href.startsWith('#') ||
        target.hasAttribute('download') ||
        target.getAttribute('target') === '_blank'
      ) {
        return;
      }

      // Same page — no warning needed
      if (href === pathname) return;

      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave this page?'
      );

      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [pathname]
  );

  useEffect(() => {
    if (!isDirty) return;

    // Use capture phase so we can intercept before Next.js router handles it
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [isDirty, handleClick]);

  // ── Detect programmatic navigation via pathname changes ───────────
  // If the pathname changes while dirty, store it. This is a fallback —
  // primary interception happens in the click handler above.
  useEffect(() => {
    if (previousPathnameRef.current !== pathname && isDirtyRef.current) {
      // Navigation already happened (programmatic push). We cannot block it
      // retroactively in App Router, but the click handler above covers <Link>.
    }
    previousPathnameRef.current = pathname;
  }, [pathname]);
}

export default useUnsavedChanges;
