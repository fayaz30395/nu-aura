'use client';

import Image from 'next/image';
import {Pin} from 'lucide-react';
import type {FeedItem} from '@/lib/types/core/feed';
import {formatFeedDate} from './formatFeedDate';
import {ActionMenu} from './ActionMenu';

export interface FeedCardHeaderProps {
  item: FeedItem;
  avatarUrl: string;
  canManagePost: boolean;
  showActionMenu: boolean;
  setShowActionMenu: (v: boolean) => void;
  onEdit?: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function FeedCardHeader({
                                 item,
                                 avatarUrl,
                                 canManagePost,
                                 showActionMenu,
                                 setShowActionMenu,
                                 onEdit,
                                 onDelete,
                                 isDeleting,
                               }: FeedCardHeaderProps) {
  return (
    <div className="flex items-start gap-2 px-4 pt-4 pb-2">
      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden">
        <Image src={avatarUrl} alt={item.wallPostAuthor || ''} width={40} height={40}
               className="rounded-full object-cover w-10 h-10"/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-semibold text-[var(--text-primary)]">{item.wallPostAuthor}</span>
          <span className="text-[var(--text-muted)] font-normal">
            {item.wallPostType === 'POLL' && ' created a poll'}
            {item.wallPostType === 'PRAISE' && <> recognized <span
              className="font-semibold text-[var(--text-primary)]">{item.praiseRecipientName}</span></>}
            {(!item.wallPostType || item.wallPostType === 'POST') && ' created a post'}
          </span>
        </p>
        <p className="text-caption mt-0.5">
          {formatFeedDate(item.timestamp)}
          {item.wallPostAuthorDepartment && (
            <span> · {item.wallPostAuthorDepartment}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {item.isPinned && (
          <span className="inline-flex items-center gap-0.5 text-2xs text-[var(--text-muted)]">
            <Pin className="h-2.5 w-2.5"/> Pinned
          </span>
        )}
        {canManagePost && (
          <ActionMenu
            showMenu={showActionMenu}
            setShowMenu={setShowActionMenu}
            onEdit={onEdit}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        )}
      </div>
    </div>
  );
}
