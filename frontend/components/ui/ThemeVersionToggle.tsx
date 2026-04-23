'use client';

import * as React from 'react';
import {useThemeVersionControls} from '@/lib/theme/ThemeVersionProvider';
import {cn} from '@/lib/utils';

interface Props {
  className?: string;
  compact?: boolean;
}

export function ThemeVersionToggle({className, compact = false}: Props) {
  const {version, setVersion} = useThemeVersionControls();

  return (
    <div
      role="radiogroup"
      aria-label="Design system version"
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface)]',
        className
      )}
    >
      {(['v1', 'v2'] as const).map((v) => {
        const active = version === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setVersion(v)}
            className={cn(
              'px-3 h-7 text-xs font-medium rounded-md transition-colors cursor-pointer',
              active
                ? 'bg-[var(--accent-primary)] text-[var(--text-inverse)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
            )}
          >
            {compact ? v.toUpperCase() : v === 'v1' ? 'Classic' : 'v2 · Refined'}
          </button>
        );
      })}
    </div>
  );
}
