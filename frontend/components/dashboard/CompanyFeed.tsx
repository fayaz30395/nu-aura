'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  endOfWeek,
  isToday,
  isWithinInterval,
  isYesterday,
  parseISO,
  startOfDay,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import {Activity, AlertCircle, RefreshCw} from 'lucide-react';
import {EmptyState} from '@/components/ui/EmptyState';
import {feedService} from '@/lib/services/core/feed.service';
import type {FeedItem, FeedItemType} from '@/lib/types/core/feed';
import {logger} from '@/lib/utils/logger';
import {FEED_LABELS, FeedCard} from './FeedCard';
import type {DateBucket, DateGroup} from './FeedDateSection';
import {FeedDateSection} from './FeedDateSection';

// ─── Date Grouping ────────────────────────────────────────────────────
const DATE_BUCKET_LABELS: Record<DateBucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  last_week: 'Last Week',
  earlier: 'Earlier',
};

function getDateBucket(dateStr: string): DateBucket {
  try {
    const date = startOfDay(parseISO(dateStr));
    const now = new Date();

    if (isToday(date)) return 'today';
    if (isYesterday(date)) return 'yesterday';

    const thisWeekStart = startOfWeek(now, {weekStartsOn: 1});
    const thisWeekEnd = endOfWeek(now, {weekStartsOn: 1});
    if (isWithinInterval(date, {start: thisWeekStart, end: thisWeekEnd})) return 'this_week';

    const lastWeekStart = startOfWeek(subWeeks(now, 1), {weekStartsOn: 1});
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), {weekStartsOn: 1});
    if (isWithinInterval(date, {start: lastWeekStart, end: lastWeekEnd})) return 'last_week';

    return 'earlier';
  } catch {
    return 'earlier';
  }
}

function groupByDate(items: FeedItem[]): DateGroup[] {
  const bucketOrder: DateBucket[] = ['today', 'yesterday', 'this_week', 'last_week', 'earlier'];
  const groups: Record<DateBucket, FeedItem[]> = {
    today: [], yesterday: [], this_week: [], last_week: [], earlier: [],
  };

  for (const item of items) {
    const bucket = getDateBucket(item.timestamp);
    groups[bucket].push(item);
  }

  return bucketOrder
    .filter(key => groups[key].length > 0)
    .map(key => ({key, label: DATE_BUCKET_LABELS[key], items: groups[key]}));
}

// ─── Filter config ────────────────────────────────────────────────────
type FeedFilter = 'ALL' | FeedItemType;

const FILTER_OPTIONS: { value: FeedFilter; label: string }[] = [
  {value: 'ALL', label: 'All'},
  {value: 'ANNOUNCEMENT', label: 'Announcements'},
  {value: 'BIRTHDAY', label: 'Birthdays'},
  {value: 'WORK_ANNIVERSARY', label: 'Anniversaries'},
  {value: 'NEW_JOINER', label: 'New Joiners'},
  {value: 'RECOGNITION', label: 'Recognition'},
  {value: 'LINKEDIN_POST', label: 'LinkedIn'},
  {value: 'WALL_POST', label: 'Posts'},
];

/** Buckets that are "recent" — loaded eagerly on mount */
const EAGER_BUCKETS: Set<DateBucket> = new Set(['today', 'yesterday']);

// ─── CompanyFeed Props ────────────────────────────────────────────────
interface CompanyFeedProps {
  employeeId?: string;
  refreshKey?: number;
}

// ─── CompanyFeed (Orchestrator) ───────────────────────────────────────
export function CompanyFeed({employeeId, refreshKey = 0}: CompanyFeedProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [olderLoaded, setOlderLoaded] = useState(false);
  const [error, setError] = useState(false);

  const loadFeed = async (showRefresh = false, isCancelled?: () => boolean) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      const data = await feedService.getCompanyFeed(employeeId);
      if (isCancelled?.()) return;
      setItems(data);
      setOlderLoaded(true);
      setError(false);
    } catch (err) {
      if (isCancelled?.()) return;
      logger.error('Failed to load company feed:', err);
      setError(true);
    } finally {
      if (!isCancelled?.()) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  const loadOlderItems = useCallback(async () => {
    if (olderLoaded) return;
    try {
      const olderData = await feedService.getCompanyFeedOlder(employeeId, 1, 20);
      setItems(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const newItems = olderData.filter(i => !existingIds.has(i.id));
        if (newItems.length === 0) return prev;
        const merged = [...prev, ...newItems];
        merged.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        return merged;
      });
      setOlderLoaded(true);
    } catch (error) {
      logger.error('Failed to load older feed items:', error);
    }
  }, [employeeId, olderLoaded]);

  useEffect(() => {
    let cancelled = false;
    loadFeed(false, () => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, refreshKey]);

  const filteredItems = activeFilter === 'ALL' ? items : items.filter(item => item.type === activeFilter);
  const dateGroups = useMemo(() => groupByDate(filteredItems), [filteredItems]);

  if (isLoading) {
    return (
      <div className="skeuo-card rounded-xl border border-[var(--border-main)] p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Company Feed</h3>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i}
                 className="flex items-start gap-2.5 p-4 rounded-lg bg-[var(--bg-surface)] relative overflow-hidden">
              <div
                className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"/>
              <div className="w-8 h-8 rounded-full bg-[var(--bg-surface)] animate-pulse"/>
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-[var(--bg-surface)] rounded w-1/3 animate-pulse [animation-delay:100ms]"/>
                <div className="h-3 bg-[var(--bg-surface)] rounded w-2/3 animate-pulse [animation-delay:200ms]"/>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="skeuo-card rounded-xl border border-[var(--border-main)] p-4">
      {/* Header */}
      <div className="row-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Company Feed
        </h3>
        <button
          onClick={() => loadFeed(true)}
          disabled={isRefreshing}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          title="Refresh"
          aria-label="Refresh feed"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}/>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTER_OPTIONS.map(option => (
          <button
            key={option.value}
            onClick={() => setActiveFilter(option.value)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
              activeFilter === option.value
                ? 'bg-[var(--text-primary)] text-[var(--text-inverse)]'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Feed Items — grouped by date, older sections lazy-loaded */}
      {dateGroups.length > 0 ? (
        <div className="space-y-1">
          {dateGroups.map((group) => {
            const isEager = EAGER_BUCKETS.has(group.key);
            return (
              <FeedDateSection
                key={group.key}
                group={group}
                defaultExpanded={isEager}
                isLazy={!isEager && !olderLoaded}
                onLoadMore={!isEager && !olderLoaded ? loadOlderItems : undefined}
              >
                {(groupItems) =>
                  groupItems.map((item) => (
                    <FeedCard
                      key={item.id}
                      item={item}
                      onDeleted={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
                      onUpdated={(id, newContent) => setItems((prev) => prev.map((i) => i.id === id ? {
                        ...i,
                        description: newContent,
                        title: newContent.length > 120 ? newContent.substring(0, 120) + '...' : newContent
                      } : i))}
                    />
                  ))
                }
              </FeedDateSection>
            );
          })}
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertCircle className="h-8 w-8"/>}
          title="Couldn't load activity feed"
          description="Something went wrong while loading the company feed."
          actionLabel="Retry"
          onAction={() => loadFeed()}
        />
      ) : (
        <EmptyState
          icon={<Activity className="h-8 w-8"/>}
          title={activeFilter === 'ALL' ? 'No feed items yet' : `No ${FEED_LABELS[activeFilter as FeedItemType]?.toLowerCase()} items`}
          description="Activity from across the company will appear here as it happens."
        />
      )}
    </div>
  );
}
