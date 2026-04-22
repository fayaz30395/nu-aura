'use client';

import Image from 'next/image';
import {cn} from '@/lib/utils';
import {PRAISE_CATEGORIES} from '@/components/dashboard/PostComposer';
import type {FeedItem} from '@/lib/types/core/feed';

export interface FeedCardPraiseProps {
  item: FeedItem;
}

export function FeedCardPraise({item}: FeedCardPraiseProps) {
  if (!item.praiseRecipientName) return null;

  const cat = item.praiseCategory
    ? PRAISE_CATEGORIES.find((c) => c.id === item.praiseCategory)
    : undefined;

  return (
    <div className="px-4 pb-2">
      <div
        className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-warning-50 to-warning-50 border border-[var(--warning-200)]/50">
        <div
          className='w-12 h-12 rounded-full bg-status-warning-bg flex items-center justify-center text-lg font-bold text-status-warning-text overflow-hidden shrink-0'>
          {item.praiseRecipientAvatar ? (
            <Image src={item.praiseRecipientAvatar} alt={item.praiseRecipientName ?? ''} width={48} height={48}
                   className="w-full h-full object-cover"/>
          ) : (
            item.praiseRecipientName.charAt(0)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{item.praiseRecipientName}</p>
          {(item.praiseRecipientDesignation || item.praiseRecipientDepartment) && (
            <p className="text-caption truncate">
              {[item.praiseRecipientDesignation, item.praiseRecipientDepartment].filter(Boolean).join(' · ')}
            </p>
          )}
          {item.praiseCategory && (
            cat ? (
              <span
                className={cn('inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', cat.color)}>
                <span>{cat.emoji}</span> {cat.label}
              </span>
            ) : (
              <span
                className='inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-status-warning-border bg-status-warning-bg text-status-warning-text'>
                🏆 {item.praiseCategory}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
