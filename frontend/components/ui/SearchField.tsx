'use client';

import React from 'react';
import {Search, X} from 'lucide-react';
import {cn} from '@/lib/utils';

export interface SearchFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size' | 'type'> {
  value: string;
  onChange: (value: string) => void;
  /** Fired after the clear button or Escape empties the field. */
  onClear?: () => void;
  /** 36px (sm) or 40px (md, default). */
  fieldSize?: 'sm' | 'md';
}

/** Search input: leading icon, clear button when non-empty, Escape clears. */
const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({value, onChange, onClear, fieldSize = 'md', className, placeholder = 'Search', onKeyDown, disabled, ...props}, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };
    const clear = () => {
      onChange('');
      onClear?.();
      inputRef.current?.focus();
    };

    return (
      <div className={cn('relative w-full', className)}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]"
          aria-hidden="true"
        />
        <input
          ref={setRefs}
          type="search"
          role="searchbox"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            if (e.key === 'Escape' && value) {
              e.preventDefault();
              clear();
            }
          }}
          className={cn(
            'w-full rounded-[var(--radius-md)] border border-[var(--border-main)] bg-[var(--bg-input)] pl-9 pr-9 text-sm text-[var(--text-primary)] outline-none',
            'placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)]',
            'transition-[border-color,box-shadow] duration-[var(--t-fast,150ms)] focus:border-[var(--accent)] focus:shadow-[var(--sh-focus)]',
            'disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-search-cancel-button]:hidden',
            fieldSize === 'sm' ? 'h-9' : 'h-10'
          )}
          {...props}
        />
        {value && !disabled && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={clear}
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]"
          >
            <X className="h-4 w-4" aria-hidden="true"/>
          </button>
        )}
      </div>
    );
  }
);

SearchField.displayName = 'SearchField';

export {SearchField};
