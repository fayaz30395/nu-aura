'use client';

import {Image as ImageIcon, Loader2, Paperclip, Send, Smile} from 'lucide-react';
import {cn} from '@/lib/utils';

export interface ComposerTextareaProps {
  value: string;
  isFocused: boolean;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
}

export function ComposerTextarea({
                                   value,
                                   isFocused,
                                   isSubmitting,
                                   onChange,
                                   onFocus,
                                   onBlur,
                                   onSubmit,
                                 }: ComposerTextareaProps) {
  return (
    <div className="p-4 space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.ctrlKey) onSubmit();
        }}
        placeholder="Write something..."
        className={cn('input-aura w-full resize-none transition-all', isFocused ? 'h-20' : 'h-10')}
      />
      <div className="row-between">
        <div className="flex items-center gap-1">
          <button type="button"
                  className="rounded p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
                  title="Add image">
            <ImageIcon size={14}/>
          </button>
          <button type="button"
                  className="rounded p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
                  title="Add emoji">
            <Smile size={14}/>
          </button>
          <button type="button"
                  className="rounded p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
                  title="Attach file">
            <Paperclip size={14}/>
          </button>
        </div>
        <button
          onClick={onSubmit}
          disabled={!value.trim() || isSubmitting}
          className='inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-inverse hover:bg-accent active:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  );
}
