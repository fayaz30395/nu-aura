'use client';

import React, {useEffect, useRef} from 'react';
import {usePathname} from 'next/navigation';
import {X} from 'lucide-react';
import {cn} from '@/lib/utils';
import {NavPanel, type NavPanelProps} from './NavPanel';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface MobileNavDrawerProps extends Omit<NavPanelProps, 'collapsed' | 'className'> {
  open: boolean;
  onClose: () => void;
}

/** Below md: the same NavPanel as desktop, in a modal slide-in drawer. */
export function MobileNavDrawer({open, onClose, onItemClick, ...panelProps}: MobileNavDrawerProps) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const lastPathRef = useRef(pathname);
  useEffect(() => {
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      drawerRef.current?.querySelector<HTMLElement>('nav a[href]')?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-30 bg-[var(--bg-overlay)] md:hidden animate-fade-in motion-reduce:animate-none"
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] md:hidden',
          'shadow-[var(--shadow-elevated)] animate-slide-in-left motion-reduce:animate-none'
        )}
      >
        <NavPanel
          {...panelProps}
          collapsed={false}
          onItemClick={(item) => {
            onItemClick?.(item);
            onClose();
          }}
          className="w-full border-r-0"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute right-2 top-3 grid h-8 w-8 place-items-center rounded-lg text-[var(--on-rail-dim)] transition-colors duration-[var(--t-fast)] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-300)]"
        >
          <X className="h-4 w-4" aria-hidden="true"/>
        </button>
      </aside>
    </>
  );
}
