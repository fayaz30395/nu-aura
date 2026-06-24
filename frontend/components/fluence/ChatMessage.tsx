'use client';

import React, {useMemo} from 'react';
import Link from 'next/link';
import {Bot, Loader2, User} from 'lucide-react';
import {cn} from '@/lib/utils';
import {safeUrl} from '@/lib/utils/safeUrl';
import {ChatSourceCard} from './ChatSourceCard';
import type {ChatMessage as ChatMessageType} from '@/lib/types/platform/fluence-chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

/**
 * Parse markdown-style links [text](url) into React elements.
 * Everything else is rendered as plain text with line breaks preserved.
 */
function renderMessageContent(content: string): React.ReactNode[] {
  // Split on markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(content)) !== null) {
    // Text before the link
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const linkText = match[1];
    const linkUrl = match[2];

    parts.push(
      <Link
        key={`link-${match.index}`}
        href={safeUrl(linkUrl)}
        className="text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded"
      >
        {linkText}
      </Link>
    );

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after the last link
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({message}) => {
  const isUser = message.role === 'user';

  const renderedContent = useMemo(() => {
    if (!message.content) return null;
    return renderMessageContent(message.content);
  }, [message.content]);

  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full mt-0.5',
          isUser
            ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'bg-[var(--surface-sunken)] text-[var(--text-3)]'
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5"/> : <Bot className="h-3.5 w-3.5"/>}
      </div>

      {/* Bubble */}
      <div className={cn('max-w-[85%] space-y-2')}>
        <div
          className={cn(
            'rounded-[var(--r-md)] px-4 py-2 text-sm leading-relaxed',
            isUser
              ? 'bg-[var(--accent)] text-white rounded-br-[var(--r-sm)]'
              : 'bg-[var(--surface)] border border-[var(--border-soft)] text-[var(--text-1)] rounded-bl-[var(--r-sm)]'
          )}
        >
          {/* Render content with markdown links and line breaks */}
          {message.content ? (
            <div className="whitespace-pre-wrap break-words">
              {renderedContent}
            </div>
          ) : message.isStreaming ? (
            <div className="flex items-center gap-1.5 py-0.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]"/>
              <span className="text-xs">Thinking...</span>
            </div>
          ) : null}

          {/* Streaming cursor */}
          {message.isStreaming && message.content && (
            <span className="inline-block w-1.5 h-4 bg-accent-500 animate-pulse ml-0.5 align-middle rounded-md"/>
          )}
        </div>

        {/* Source citations */}
        {message.sources && message.sources.length > 0 && (
          <div className="space-y-1">
            <p className="text-3xs font-medium text-[var(--text-muted)] uppercase tracking-wider px-1">
              Sources
            </p>
            {message.sources.map((source) => (
              <ChatSourceCard key={source.id} source={source}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
