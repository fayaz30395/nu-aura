'use client';

import React from 'react';
import {cn} from '@/lib/utils';

/** A single option in a {@link Segmented} control. */
export interface SegmentedOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  /** Optional leading icon. */
  icon?: React.ReactNode;
}

/** Props for {@link Segmented}. */
export interface SegmentedProps<T extends string = string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  /** Controlled selected value. */
  value: T;
  /** Fired with the newly selected value. */
  onChange: (next: T) => void;
  /** Accessible label for the group. */
  'aria-label'?: string;
  className?: string;
}

/**
 * Aura segmented control (used by dashboard / attendance range pickers).
 *
 * Inset track (surface-2 + border + 10px radius); the active segment lifts onto
 * a raised surface with the `--sh-xs` highlight. Selection state is conveyed by
 * background + color (never color alone), and each segment is a real button so
 * keyboard + focus work out of the box.
 */
export function Segmented<T extends string = string>({
  options,
  value,
  onChange,
  className,
  ...rest
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={rest['aria-label']}
      className={cn(
        'inline-flex gap-0.5 rounded-aura-control border border-[var(--border-main)] bg-[var(--surface-2)] p-[3px]',
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-aura-sm px-3 py-1.5 text-xs font-semibold',
              'transition-[background-color,color,box-shadow] duration-[var(--t-fast)] ease-[var(--ease)] outline-none',
              'focus-visible:shadow-[var(--sh-focus)]',
              isActive
                ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-[var(--sh-xs)]'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
            )}
          >
            {opt.icon ? <span className="inline-flex h-[15px] w-[15px] items-center justify-center">{opt.icon}</span> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

Segmented.displayName = 'Segmented';
