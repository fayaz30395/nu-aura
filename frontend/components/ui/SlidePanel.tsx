'use client';

import React, {useCallback, useEffect, useId, useRef} from 'react';
import {cn} from '@/lib/utils';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface SlidePanelProps {
  /** Always rendered when mounted; caller controls mount/unmount (conditional render). */
  onClose: () => void;
  /** Heading text. Used as the accessible name when `titleId` consumers are not wiring their own heading. */
  title?: string;
  /**
   * If the caller renders its own heading element, pass its id here and it will be
   * wired via aria-labelledby. When omitted, `title` (or `ariaLabel`) names the dialog.
   */
  titleId?: string;
  /** Explicit accessible name when there is no visible title. */
  ariaLabel?: string;
  /** Panel body. */
  children: React.ReactNode;
  /** Tailwind max-width class for the panel (defaults to a compact right drawer). */
  widthClassName?: string;
  /** Extra classes for the panel surface. */
  className?: string;
}

/**
 * Accessible right-side slide-over panel (drawer).
 *
 * Implements the dialog a11y contract that the bespoke `fixed inset-0 z-50
 * flex justify-end` panels across the app were missing:
 *  - role="dialog" + aria-modal="true"
 *  - aria-labelledby (when a titleId/title is supplied) or aria-label
 *  - Escape closes
 *  - focus moves into the panel on open and is restored to the trigger on close
 *  - focus is trapped within the panel while open (Tab / Shift+Tab cycle)
 *  - backdrop click closes
 *
 * Visuals match the existing compact drawers (max-w-sm surface, left border,
 * shadow, scrollable body) so adopting it does not change the look.
 */
export function SlidePanel({
  onClose,
  title,
  titleId,
  ariaLabel,
  children,
  widthClassName = 'max-w-sm',
  className,
}: SlidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const generatedTitleId = useId();
  const headingId = title ? titleId ?? generatedTitleId : titleId;

  // Escape-to-close.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Focus management: focus the first focusable on open, restore to trigger on unmount.
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement;
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? panelRef.current)?.focus();
    return () => {
      triggerRef.current?.focus?.();
    };
  }, []);

  // Focus trap — keep Tab / Shift+Tab inside the panel.
  const onTrapKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (!focusable || focusable.length === 0) {
      e.preventDefault();
      return;
    }
    const firstEl = focusable[0];
    const lastEl = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === firstEl || !panelRef.current?.contains(active)) {
        e.preventDefault();
        lastEl.focus();
      }
    } else if (active === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={headingId ? undefined : ariaLabel ?? title}
        aria-labelledby={headingId}
        tabIndex={-1}
        onKeyDown={onTrapKeyDown}
        className={cn(
          'relative w-full bg-[var(--bg-primary)] border-l border-[var(--border-main)] h-full overflow-y-auto shadow-2xl focus:outline-none',
          widthClassName,
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
