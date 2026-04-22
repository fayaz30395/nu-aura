'use client';

import React, {useEffect, useRef, useState} from 'react';
import {ChevronDown, Monitor, Moon, Sun} from 'lucide-react';
import {cn} from '@/lib/utils';
import {type ThemeMode, useDarkMode} from '@/components/layout/DarkModeProvider';

// ── Config ───────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
  {value: 'light', label: 'Light', icon: Sun},
  {value: 'dark', label: 'Dark', icon: Moon},
  {value: 'system', label: 'System', icon: Monitor},
];

// ── Component ────────────────────────────────────────────────────────

interface ThemeToggleProps {
  /** Render as icon-only button (no dropdown). Clicking cycles through modes. */
  compact?: boolean;
  className?: string;
}

export function ThemeToggle({compact = false, className}: ThemeToggleProps) {
  const {theme, resolvedTheme, setTheme} = useDarkMode();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Determine which icon to show on the button
  const ActiveIcon = resolvedTheme === 'dark' ? Moon : Sun;

  if (!mounted) {
    // SSR placeholder — prevents hydration mismatch
    return (
      <div
        className={cn(
          'h-10 w-10 rounded-xl',
          className,
        )}
      />
    );
  }

  // ── Compact mode: icon-only, cycles light → dark → system ──────

  if (compact) {
    const cycle = () => {
      const order: ThemeMode[] = ['light', 'dark', 'system'];
      const idx = order.indexOf(theme);
      setTheme(order[(idx + 1) % order.length]);
    };

    return (
      <button
        onClick={cycle}
        className={cn(
          'p-2 rounded-xl transition-all duration-200',
          'text-[var(--header-text-muted)] hover:text-[var(--header-text)]',
          'hover:bg-[var(--header-hover-bg)]',
          className,
        )}
        aria-label={`Theme: ${theme}. Click to cycle.`}
        title={`Current: ${theme}`}
      >
        <ActiveIcon className="h-5 w-5"/>
      </button>
    );
  }

  // ── Full dropdown mode ─────────────────────────────────────────

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-2 rounded-xl',
          'text-[var(--header-text-muted)] hover:text-[var(--header-text)]',
          'hover:bg-[var(--header-hover-bg)] transition-all duration-200',
        )}
        aria-label="Toggle theme"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <ActiveIcon className="h-5 w-5"/>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Select theme"
          className={cn(
            'absolute right-0 top-full mt-2 z-50 min-w-[140px]',
            'rounded-xl border p-1',
            'animate-scale-in origin-top-right',
          )}
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-main)',
            boxShadow: 'var(--shadow-dropdown)',
          }}
        >
          {THEME_OPTIONS.map(({value, label, icon: Icon}) => {
            const isActive = theme === value;
            return (
              <button
                key={value}
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className={cn(
                  'flex items-center gap-2.5 w-full px-4 py-2 rounded-lg text-sm',
                  'transition-colors duration-150',
                  isActive
                    ? "bg-[var(--accent-500)]/10 text-accent font-medium"
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]',
                )}
              >
                <Icon className="h-4 w-4"/>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
