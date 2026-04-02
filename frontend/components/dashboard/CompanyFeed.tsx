'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  isToday, isYesterday, parseISO,
  startOfWeek, endOfWeek, subWeeks, isWithinInterval, startOfDay,
} from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { feedService } from '@/lib/services/core/feed.service';
import type { FeedItem, FeedItemType } from '@/lib/types/core/feed';
import { logger } from '@/lib/utils/logger';
import { FeedCard, FEED_LABELS } from './FeedCard';
import { FeedDateSection } from './FeedDateSection';
import type { DateBucket, DateGroup } from './FeedDateSection';

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

    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    if (isWithinInterval(date, { start: thisWeekStart, end: thisWeekEnd })) return 'this_week';

    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    if (isWithinInterval(date, { start: lastWeekStart, end: lastWeekEnd })) return 'last_week';

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
    .map(key => ({ key, label: DATE_BUCKET_LABELS[key], items: groups[key] }));
}

// ─── Filter config ────────────────────────────────────────────────────
type FeedFilter = 'ALL' | FeedItemType;

const FILTER_OPTIONS: { value: FeedFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ANNOUNCEMENT', label: 'Announcements' },
  { value: 'BIRTHDAY', label: 'Birthdays' },
  { value: 'WORK_ANNIVERSARY', label: 'Anniversaries' },
  { value: 'NEW_JOINER', label: 'New Joiners' },
  { value: 'RECOGNITION', label: 'Recognition' },
  { value: 'LINKEDIN_POST', label: 'LinkedIn' },
  { value: 'WALL_POST', label: 'Posts' },
];

/** Buckets that are "recent" — loaded eagerly on mount */
const EAGER_BUCKETS: Set<DateBucket> = new Set(['today', 'yesterday']);

// ─── CompanyFeed Props ────────────────────────────────────────────────
interface CompanyFeedProps {
  employeeId?: string;
  refreshKey?: number;
}

// ─── CompanyFeed (Orchestrator) ───────────────────────────────────────
export function CompanyFeed({ employeeId, refreshKey = 0 }: CompanyFeedProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [olderLoaded, setOlderLoaded] = useState(false);

  const loadFeed = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      const data = await feedService.getCompanyFeed(employeeId);
      setItems(data);
      setOlderLoaded(true);
    } catch {
      setItems(getDemoFeed());
      setOlderLoaded(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
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
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, refreshKey]);

  const filteredItems = activeFilter === 'ALL' ? items : items.filter(item => item.type === activeFilter);
  const dateGroups = useMemo(() => groupByDate(filteredItems), [filteredItems]);

  if (isLoading) {
    return (
      <div className="skeuo-card rounded-xl border border-[var(--border-main)] p-4">
        <h3 className="skeuo-emboss text-sm font-semibold text-[var(--text-primary)] mb-3">Company Feed</h3>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-2.5 p-4 rounded-lg bg-[var(--bg-surface)] relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="w-8 h-8 rounded-full bg-[var(--bg-surface)] animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-[var(--bg-surface)] rounded w-1/3 animate-pulse" style={{ animationDelay: '0.1s' }} />
                <div className="h-3 bg-[var(--bg-surface)] rounded w-2/3 animate-pulse" style={{ animationDelay: '0.2s' }} />
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
      <div className="row-between mb-3">
        <h3 className="skeuo-emboss text-sm font-semibold text-[var(--text-primary)]">
          Company Feed
        </h3>
        <button
          onClick={() => loadFeed(true)}
          disabled={isRefreshing}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          title="Refresh"
          aria-label="Refresh feed"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
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
                      onUpdated={(id, newContent) => setItems((prev) => prev.map((i) => i.id === id ? { ...i, description: newContent, title: newContent.length > 120 ? newContent.substring(0, 120) + '...' : newContent } : i))}
                    />
                  ))
                }
              </FeedDateSection>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-caption">
            {activeFilter === 'ALL' ? 'No feed items yet.' : `No ${FEED_LABELS[activeFilter as FeedItemType]?.toLowerCase()} items.`}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Demo Feed Data ───────────────────────────────────────────────────
function getDemoFeed(): FeedItem[] {
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 259200000).toISOString();
  const fiveDaysAgo = new Date(Date.now() - 432000000).toISOString();

  return [
    {
      id: 'demo-ann-1', type: 'ANNOUNCEMENT', timestamp: today,
      title: 'Q1 2026 All-Hands Meeting — March 20th',
      description: 'Join us for the quarterly all-hands meeting. We will discuss company performance, upcoming product launches, and open Q&A with leadership.',
      category: 'EVENT', priority: 'HIGH', isPinned: true, publishedByName: 'HR Team', readCount: 45,
    },
    {
      id: 'demo-bday-1', type: 'BIRTHDAY', timestamp: today,
      title: 'Happy Birthday, Priya Sharma!',
      personName: 'Priya Sharma', personDepartment: 'Engineering', isToday: true, daysUntil: 0,
    },
    {
      id: 'demo-recog-1', type: 'RECOGNITION', timestamp: yesterday,
      title: 'Outstanding Delivery',
      description: 'Incredible work on the payment gateway integration. The client was thrilled with the early delivery!',
      giverName: 'Arjun Patel', receiverName: 'Meera Nair',
      recognitionType: 'KUDOS', recognitionCategory: 'GOING_EXTRA_MILE',
      pointsAwarded: 50, likesCount: 12, commentsCount: 3,
    },
    {
      id: 'demo-anniv-1', type: 'WORK_ANNIVERSARY', timestamp: yesterday,
      title: 'Rahul Verma completes 3 years!',
      personName: 'Rahul Verma', personDepartment: 'Product', personDesignation: 'Senior Product Manager',
      yearsCompleted: 3, isToday: false, daysUntil: 1,
    },
    {
      id: 'demo-newjoin-1', type: 'NEW_JOINER', timestamp: twoDaysAgo,
      title: 'Welcome Ananya Reddy to the team!',
      description: 'UX Designer - Design',
      personName: 'Ananya Reddy', personDepartment: 'Design', personDesignation: 'UX Designer',
      daysSinceJoining: 2,
    },
    {
      id: 'demo-ann-2', type: 'ANNOUNCEMENT', timestamp: threeDaysAgo,
      title: 'Updated Remote Work Policy — Effective April 1',
      description: 'We are updating our hybrid work policy. Employees can now work remotely up to 3 days per week.',
      category: 'POLICY_UPDATE', priority: 'MEDIUM', isPinned: false, publishedByName: 'Deepa Kumar', readCount: 128,
    },
    {
      id: 'demo-recog-2', type: 'RECOGNITION', timestamp: fiveDaysAgo,
      title: 'Team Player Award',
      description: 'Always willing to help others and share knowledge. A true team player!',
      giverName: 'Vikram Singh', receiverName: 'Kavitha Rajan',
      recognitionType: 'APPRECIATION', recognitionCategory: 'TEAMWORK',
      pointsAwarded: 30, likesCount: 8, commentsCount: 1,
    },
    {
      id: 'demo-bday-2', type: 'BIRTHDAY', timestamp: new Date(Date.now() + 172800000).toISOString(),
      title: "Arun Kumar's birthday is coming up",
      personName: 'Arun Kumar', personDepartment: 'Finance', isToday: false, daysUntil: 2,
    },
    {
      id: 'demo-linkedin-1', type: 'LINKEDIN_POST' as FeedItemType, timestamp: yesterday,
      title: 'Nulogic recognized as Top 50 HR Tech Startups 2026',
      description: 'Thrilled to announce that Nulogic has been featured in the Top 50 HR Tech Startups to Watch in 2026.',
      linkedinAuthor: 'Nulogic', linkedinAuthorTitle: 'Official Company Page',
      linkedinPostUrl: 'https://linkedin.com/company/nulogic', linkedinImageUrl: undefined,
      linkedinEngagement: { likes: 234, comments: 45, shares: 67 },
    },
  ];
}
