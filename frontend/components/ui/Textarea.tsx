'use client';

import React from 'react';
import {cn} from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({className, error, ...props}, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          // Aura: 10px control radius + inset top shadow + token-driven accent focus.
          'flex min-h-[80px] w-full rounded-aura-control border bg-[var(--bg-input)] px-4 py-2 text-sm text-[var(--text-primary)]',
          'border-[var(--border-main)] shadow-[var(--inset-input)]',
          'placeholder:text-[var(--text-3)]',
          // Token-driven focus transition (compositor-safe: border-color + box-shadow only)
          'transition-[border-color,box-shadow] duration-[var(--motion-base)] ease-[var(--ease-standard)]',
          'outline-none focus:border-[var(--accent)] focus:shadow-[var(--inset-input),var(--sh-focus)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-y',
          error && 'border-danger-500 focus:border-danger-500 focus:shadow-[var(--inset-input),0_0_0_3px_var(--ring-danger)]',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export {Textarea};
