'use client';

import {BarChart3, Loader2, Plus, X} from 'lucide-react';

export interface ComposerPollProps {
  question: string;
  options: string[];
  canSubmit: boolean;
  isSubmitting: boolean;
  onQuestionChange: (value: string) => void;
  onOptionChange: (index: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onSubmit: () => void;
}

export function ComposerPoll({
                               question,
                               options,
                               canSubmit,
                               isSubmitting,
                               onQuestionChange,
                               onOptionChange,
                               onAddOption,
                               onRemoveOption,
                               onSubmit,
                             }: ComposerPollProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Question */}
      <textarea
        value={question}
        onChange={(e) => onQuestionChange(e.target.value)}
        placeholder="Ask a question..."
        className="input-aura w-full resize-none h-16"
        maxLength={500}
      />
      {/* Options */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--text-secondary)]">Options</p>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-[var(--border-main)] text-[var(--text-muted)] text-xs shrink-0">
              {index + 1}
            </div>
            <input
              type="text"
              value={option}
              onChange={(e) => onOptionChange(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="input-aura flex-1"
              maxLength={255}
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => onRemoveOption(index)}
                className='rounded p-1 text-[var(--text-muted)] hover:text-status-danger-text hover:bg-status-danger-bg transition-colors'
              >
                <X size={14}/>
              </button>
            )}
          </div>
        ))}
        {options.length < 10 && (
          <button
            type="button"
            onClick={onAddOption}
            className='flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent transition-colors pl-7 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded'
          >
            <Plus size={12}/>
            Add option
          </button>
        )}
      </div>
      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
          className='inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-inverse hover:bg-accent active:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <BarChart3 size={14}/>}
          {isSubmitting ? 'Creating...' : 'Create Poll'}
        </button>
      </div>
    </div>
  );
}
