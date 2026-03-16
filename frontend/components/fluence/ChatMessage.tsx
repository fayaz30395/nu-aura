'use client';

import React from 'react';
import { Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatSourceCard } from './ChatSourceCard';
import type { ChatMessage as ChatMessageType } from '@/lib/types/fluence-chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full mt-0.5',
          isUser
            ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
            : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      {/* Bubble */}
      <div className={cn('max-w-[85%] space-y-2')}>
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm leading-relaxed',
            isUser
              ? 'bg-primary-600 text-white rounded-br-md'
              : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-bl-md'
          )}
        >
          {/* Render content with basic line breaks */}
          {message.content ? (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          ) : message.isStreaming ? (
            <div className="flex items-center gap-1.5 py-0.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-500" />
              <span className="text-xs text-[var(--text-muted)]">Thinking...</span>
            </div>
          ) : null}

          {/* Streaming cursor */}
          {message.isStreaming && message.content && (
            <span className="inline-block w-1.5 h-4 bg-primary-500 animate-pulse ml-0.5 align-middle rounded-sm" />
          )}
        </div>

        {/* Source citations */}
        {message.sources && message.sources.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider px-1">
              Sources
            </p>
            {message.sources.map((source) => (
              <ChatSourceCard key={source.id} source={source} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
