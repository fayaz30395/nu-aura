import type {FeedItem, FeedItemType} from '@/lib/types/core/feed';

export type LocalReactor = {
  employeeId: string;
  fullName: string;
  avatarUrl?: string;
  reactionType: string;
  reactedAt: string;
};

export type PollOption = NonNullable<FeedItem['pollOptions']>[number];

export interface FeedStyleToken {
  bg: string;
  border: string;
  icon: string;
  badge: string;
}

export const FEED_COLORS: Record<FeedItemType, FeedStyleToken> = {
  ANNOUNCEMENT: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  BIRTHDAY: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  WORK_ANNIVERSARY: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  NEW_JOINER: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  PROMOTION: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  RECOGNITION: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  LINKEDIN_POST: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  SPOTLIGHT: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-[var(--border-main)]',
    icon: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
  },
  WALL_POST: {
    bg: 'bg-[var(--bg-surface)]',
    border: 'border-l-accent-400',
    icon: "text-accent",
    badge: "bg-accent-subtle text-accent",
  },
};

export const FEED_LABELS: Record<FeedItemType, string> = {
  ANNOUNCEMENT: 'Announcement',
  BIRTHDAY: 'Birthday',
  WORK_ANNIVERSARY: 'Work Anniversary',
  NEW_JOINER: 'New Joiner',
  PROMOTION: 'Promotion',
  RECOGNITION: 'Recognition',
  LINKEDIN_POST: 'LinkedIn',
  SPOTLIGHT: 'Spotlight',
  WALL_POST: 'Post',
};

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}
