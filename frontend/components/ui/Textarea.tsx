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
          'flex min-h-[80px] w-full rounded-lg border bg-[var(--bg-input)] text-[var(--text-primary)]',
          'px-4 py-2 text-sm',
          'border-[var(--border-main)]',
          'placeholder:text-[var(--text-muted)]',
          'outline-none transition-all duration-150',
          'focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--ring-primary)]',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'resize-y',
          error && 'border-[var(--status-danger-text)] focus:border-[var(--status-danger-text)] focus:ring-[var(--ring-danger)]',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export {Textarea};
