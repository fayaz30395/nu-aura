'use client';

import React from 'react';
import {cn} from '@/lib/utils';

/** A single tab in the {@link Tabs} strip. */
export interface TabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** Optional count pill rendered after the label (e.g. number of rows). */
  count?: number;
}

/** Props for {@link Tabs}. */
export interface TabsProps<T extends string = string> {
  tabs: ReadonlyArray<TabItem<T>>;
  /** Controlled active tab id. */
  value: T;
  /** Fired with the newly selected tab id. */
  onChange: (next: T) => void;
  /** Accessible label for the tablist. */
  'aria-label'?: string;
  className?: string;
}

/**
 * Aura underline tab strip (distinct from Mantine's compound `Tabs`).
 *
 * Bottom-border rail with an accent underline on the active tab and an optional
 * count pill. The pill tints to accent-soft when its tab is active. ARIA roles
 * (`tablist` / `tab`) and keyboard activation come for free from real buttons.
 *
 * This is a flat, controlled strip — for panelled compound tabs keep using the
 * Mantine `Tabs` component.
 */
export function Tabs<T extends string = string>({tabs, value, onChange, className, ...rest}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={rest['aria-label']}
      className={cn('flex gap-0.5 border-b border-[var(--border-main)]', className)}
    >
      {tabs.map((t) => {
        const isActive = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              '-mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold',
              'transition-[color,border-color] duration-[var(--t-fast)] ease-[var(--ease)] outline-none',
              'focus-visible:shadow-[var(--sh-focus)]',
              isActive
                ? 'border-[var(--accent)] text-[var(--accent-text)]'
                : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
            )}
          >
            {t.icon ? <span className="inline-flex h-[15px] w-[15px] items-center justify-center">{t.icon}</span> : null}
            {t.label}
            {t.count != null ? (
              <span
                className={cn(
                  'tnum rounded-full px-1.5 py-px text-xs font-bold',
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-text)]'
                    : 'bg-[var(--surface-2)] text-[var(--text-3)]'
                )}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

Tabs.displayName = 'Tabs';
