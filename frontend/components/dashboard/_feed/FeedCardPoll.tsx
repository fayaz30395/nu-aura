'use client';

import {Check} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {PollOption} from './types';

export interface FeedCardPollProps {
  options: PollOption[];
  hasVoted: boolean;
  votedOptionId: string | null;
  isVoting: boolean;
  onVote: (optionId: string) => void;
}

export function FeedCardPoll({options, hasVoted, votedOptionId, isVoting, onVote}: FeedCardPollProps) {
  if (options.length === 0) return null;

  const totalVotes = options.reduce((sum, o) => sum + o.voteCount, 0);

  return (
    <div className="px-4 pb-2 space-y-1.5">
      {options.map((option) => {
        const isSelected = votedOptionId === option.id;
        const pct = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;

        return (
          <button
            key={option.id}
            onClick={() => !hasVoted && onVote(option.id)}
            disabled={isVoting || hasVoted}
            className={cn(
              'relative w-full text-left rounded-lg border px-4 py-2.5 text-sm transition-all overflow-hidden',
              hasVoted
                ? 'cursor-default border-[var(--border-main)]'
                : 'cursor-pointer border-[var(--border-main)] hover:border-[var(--accent-primary)] hover:bg-accent-50/50'
            )}
          >
            {hasVoted && (
              <div
                className={cn(
                  'absolute inset-y-0 left-0 transition-all duration-500 rounded-lg',
                  isSelected
                    ? 'bg-accent-subtle'
                    : 'bg-[var(--bg-secondary)]'
                )}
                style={{width: `${pct}%`}}
              />
            )}
            <div className="relative row-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {isSelected && (
                  <Check size={14} className='text-accent shrink-0'/>
                )}
                <span className={cn(
                  'truncate',
                  isSelected ? 'font-semibold text-accent' : 'text-[var(--text-primary)]'
                )}>
                  {option.text}
                </span>
              </div>
              {hasVoted && (
                <span className="text-xs font-medium text-[var(--text-muted)] shrink-0">{pct}%</span>
              )}
            </div>
          </button>
        );
      })}
      <p className="text-caption pt-1 pl-1">
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        {hasVoted && ' · You voted'}
      </p>
    </div>
  );
}
