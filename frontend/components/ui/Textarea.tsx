'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border bg-white px-3 py-2 text-sm',
          'border-surface-300 dark:border-surface-600',
          'dark:bg-surface-800 dark:text-white',
          'placeholder:text-surface-400',
          'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-y',
          error && 'border-danger-500 focus:ring-danger-500',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
