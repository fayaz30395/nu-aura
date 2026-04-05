'use client';

import {useState} from 'react';
import {Calendar, ChevronDown, ChevronRight} from 'lucide-react';
import {logger} from '@/lib/utils/logger';
import type {FeedItem} from '@/lib/types/core/feed';

// ─── Types ────────────────────────────────────────────────────────────
export type DateBucket = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'earlier';

export interface DateGroup {
  key: DateBucket;
  label: string;
  items: FeedItem[];
}

// ─── Props ────────────────────────────────────────────────────────────
interface FeedDateSectionProps {
  group: DateGroup;
  defaultExpanded: boolean;
  /** If true, section fetches data on first expand instead of rendering immediately */
  isLazy?: boolean;
  /** Called on first expand for lazy sections */
  onLoadMore?: () => Promise<void>;
  children: (items: FeedItem[]) => React.ReactNode;
}

/**
 * Collapsible date-group section for the company feed.
 * Supports lazy-loading: content is only fetched when the user first expands the section.
 */
export function FeedDateSection({
                                  group,
                                  defaultExpanded,
                                  isLazy = false,
                                  onLoadMore,
                                  children,
                                }: FeedDateSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(!isLazy);

  const handleToggle = async () => {
    const willExpand = !expanded;
    setExpanded(willExpand);

    // Lazy load: fetch data on first expand
    if (willExpand && isLazy && !hasFetched && onLoadMore) {
      setIsLoading(true);
      try {
        await onLoadMore();
        setHasFetched(true);
      } catch (error) {
        logger.error('Failed to load section:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-2 py-2 px-1 group transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
      >
        <span className="text-[var(--text-muted)] transition-transform duration-200">
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5"/>
            : <ChevronRight className="h-3.5 w-3.5"/>
          }
        </span>
        <Calendar className="h-3 w-3 text-[var(--text-muted)]"/>
        <span
          className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
          {group.label}
        </span>
        <span
          className="text-2xs font-medium text-[var(--text-muted)] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded-full">
          {group.items.length}
        </span>
        <div className="flex-1 divider-b ml-1"/>
      </button>
      {expanded && (
        <div className="space-y-2 pb-2">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-main)] border-t-accent-500"/>
              <span className="text-caption">Loading {group.label.toLowerCase()} items...</span>
            </div>
          ) : (
            children(group.items)
          )}
        </div>
      )}
    </div>
  );
}
