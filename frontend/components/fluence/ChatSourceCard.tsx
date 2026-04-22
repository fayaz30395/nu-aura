'use client';

import React from 'react';
import Link from 'next/link';
import {BookOpen, ExternalLink, FileStack, Newspaper} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {ChatSource} from '@/lib/types/platform/fluence-chat';

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  wiki: {icon: BookOpen, label: 'Wiki', color: 'text-info-500 bg-info-50 dark:bg-info-950/30'},
  blog: {icon: Newspaper, label: 'Article', color: 'text-accent-500 bg-accent-50 dark:bg-accent-950/30'},
  template: {icon: FileStack, label: 'Template', color: 'text-accent-500 bg-accent-50 dark:bg-accent-950/30'},
};

interface ChatSourceCardProps {
  source: ChatSource;
}

export const ChatSourceCard: React.FC<ChatSourceCardProps> = ({source}) => {
  const config = typeConfig[source.type] || typeConfig.wiki;
  const Icon = config.icon;

  return (
    <Link
      href={source.url}
      className={cn(
        'group flex items-start gap-2 rounded-lg border border-[var(--border-subtle)] p-2',
        'bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] transition-colors',
        'text-left no-underline'
      )}
    >
      <div className={cn('flex-shrink-0 mt-0.5 p-1 rounded', config.color)}>
        <Icon className="h-3 w-3"/>
      </div>
      <div className="flex-1 min-w-0">
        <p
          className='text-xs font-medium text-[var(--text-primary)] truncate group-hover:text-accent transition-colors'>
          {source.title}
        </p>
        {source.excerpt && (
          <p className="text-3xs text-[var(--text-muted)] line-clamp-1 mt-0.5">
            {source.excerpt}
          </p>
        )}
      </div>
      <ExternalLink
        className="h-3 w-3 flex-shrink-0 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"/>
    </Link>
  );
};
