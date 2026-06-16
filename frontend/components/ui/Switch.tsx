'use client';

import React from 'react';
import {cn} from '@/lib/utils';

/** Props for {@link Switch}. */
export interface SwitchProps {
  /** Controlled on/off state. */
  checked: boolean;
  /** Fired with the next checked state when toggled. */
  onChange?: (next: boolean) => void;
  /** Accessible label (required when no visible label is associated). */
  label?: string;
  /** Disables interaction and dims the control. */
  disabled?: boolean;
  /** Optional id for label association. */
  id?: string;
  className?: string;
}

/**
 * Aura toggle switch.
 *
 * 40x23 track, accent fill when on, 18px thumb with a token-driven spring slide.
 * Transform-only thumb motion (compositor-safe); honors reduced-motion via the
 * `--ease`/`--t-base` token transition which the globals.css media block softens.
 */
export function Switch({checked, onChange, label, disabled = false, id, className}: SwitchProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={cn(
        'relative inline-flex h-[23px] w-10 shrink-0 items-center rounded-full',
        'transition-colors duration-[var(--t-base)] ease-[var(--ease)] outline-none',
        'focus-visible:shadow-[var(--sh-focus)]',
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute left-[2.5px] top-[2.5px] h-[18px] w-[18px] rounded-full bg-[var(--text-inverse)] shadow-[0_1px_3px_rgba(0,0,0,0.3)]',
          'transition-transform duration-[var(--t-base)] ease-[var(--ease)] motion-reduce:transition-none',
          checked ? 'translate-x-[17px]' : 'translate-x-0'
        )}
      />
    </button>
  );
}

Switch.displayName = 'Switch';
