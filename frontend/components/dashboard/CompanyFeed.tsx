'use client';

import { useState, useEffect } from 'react';
import { format, formatDistanceToNow, isToday, parseISO } from 'date-fns';
import {
  Megaphone,
  Cake,
  Trophy,
  UserPlus,
  TrendingUp,
  Award,
  Heart,
  MessageCircle,
  ThumbsUp,
  Star,
  Pin,
  ChevronDown,
  Sparkles,
  PartyPopper,
  Gift,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, Badge } from '@/components/ui';
import { feedService } from '@/lib/services/feed.service';
import type { FeedItem, FeedItemType } from '@/lib/types/feed';

// ─── Config ──────────────────────────────────────────────────────────
const FEED_COLORS: Record<FeedItemType, { bg: string; border: string; icon: string; badge: string }> = {
  ANNOUNCEMENT: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-l-blue-500',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  },
  BIRTHDAY: {
    bg: 'bg-pink-50 dark:bg-pink-950/30',
    border: 'border-l-pink-500',
    icon: 'text-pink-600 dark:text-pink-400',
    badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
  },
  WORK_ANNIVERSARY: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-l-amber-500',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  },
  NEW_JOINER: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-l-emerald-500',
    icon: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  },
  PROMOTION: {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-l-violet-500',
    icon: 'text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300',
  },
  RECOGNITION: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-l-orange-500',
    icon: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  },
};

const FEED_ICONS: Record<FeedItemType, React.ReactNode> = {
  ANNOUNCEMENT: <Megaphone className="h-5 w-5" />,
  BIRTHDAY: <Cake className="h-5 w-5" />,
  WORK_ANNIVERSARY: <Trophy className="h-5 w-5" />,
  NEW_JOINER: <UserPlus className="h-5 w-5" />,
  PROMOTION: <TrendingUp className="h-5 w-5" />,
  RECOGNITION: <Award className="h-5 w-5" />,
};

const FEED_LABELS: Record<FeedItemType, string> = {
  ANNOUNCEMENT: 'Announcement',
  BIRTHDAY: 'Birthday',
  WORK_ANNIVERSARY: 'Work Anniversary',
  NEW_JOINER: 'New Joiner',
  PROMOTION: 'Promotion',
  RECOGNITION: 'Recognition',
};

const ITEMS_PER_PAGE = 8;

// ─── Filter Types ────────────────────────────────────────────────────
type FeedFilter = 'ALL' | FeedItemType;

const FILTER_OPTIONS: { value: FeedFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ANNOUNCEMENT', label: 'Announcements' },
  { value: 'BIRTHDAY', label: 'Birthdays' },
  { value: 'WORK_ANNIVERSARY', label: 'Anniversaries' },
  { value: 'NEW_JOINER', label: 'New Joiners' },
  { value: 'RECOGNITION', label: 'Recognition' },
];

// ─── Main Component ──────────────────────────────────────────────────
interface CompanyFeedProps {
  employeeId?: string;
}

export function CompanyFeed({ employeeId }: CompanyFeedProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('ALL');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFeed = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      const data = await feedService.getCompanyFeed(employeeId);
      setItems(data);
    } catch (error) {
      console.error('[CompanyFeed] Failed to load feed:', error);
      // Set demo data on failure
      setItems(getDemoFeed());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [employeeId]);

  const filteredItems = activeFilter === 'ALL'
    ? items
    : items.filter(item => item.type === activeFilter);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;

  const handleShowMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  // ─── Loading State ───────────────────────────────────────────
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-500" />
              Company Feed
            </h3>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-50 dark:bg-surface-800">
                  <div className="w-10 h-10 rounded-full bg-surface-200 dark:bg-surface-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-1/3" />
                    <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded w-2/3" />
                    <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Main Render ─────────────────────────────────────────────
  return (
    <Card>
      <CardContent>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-500" />
            Company Feed
          </h3>
          <button
            onClick={() => loadFeed(true)}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            title="Refresh feed"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTER_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => {
                setActiveFilter(option.value);
                setVisibleCount(ITEMS_PER_PAGE);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                activeFilter === option.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Feed Items */}
        {visibleItems.length > 0 ? (
          <div className="space-y-3">
            {visibleItems.map(item => (
              <FeedCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Sparkles className="h-10 w-10 mx-auto text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-surface-500 dark:text-surface-400 text-sm">
              {activeFilter === 'ALL'
                ? 'No feed items yet. Check back soon!'
                : `No ${FEED_LABELS[activeFilter as FeedItemType]?.toLowerCase()} items to show.`}
            </p>
          </div>
        )}

        {/* Show More */}
        {hasMore && (
          <button
            onClick={handleShowMore}
            className="w-full mt-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            Show more <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Feed Card ───────────────────────────────────────────────────────
function FeedCard({ item }: { item: FeedItem }) {
  const colors = FEED_COLORS[item.type];
  const icon = FEED_ICONS[item.type];

  return (
    <div className={`relative rounded-lg border-l-4 ${colors.border} ${colors.bg} p-4 transition-all hover:shadow-sm`}>
      <div className="flex items-start gap-3">
        {/* Icon / Avatar */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colors.bg} ${colors.icon}`}>
          {item.personAvatarUrl ? (
            <img
              src={item.personAvatarUrl}
              alt={item.personName || ''}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            icon
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Type Badge + Pinned */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${colors.badge}`}>
              {FEED_LABELS[item.type]}
            </span>
            {item.isPinned && (
              <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
                <Pin className="h-3 w-3" /> Pinned
              </span>
            )}
            {item.isToday && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                Today
              </span>
            )}
            {item.priority === 'CRITICAL' && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                Urgent
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-surface-900 dark:text-surface-50 leading-snug">
            {item.title}
          </p>

          {/* Type-specific details */}
          {item.type === 'ANNOUNCEMENT' && item.description && (
            <p className="text-xs text-surface-600 dark:text-surface-400 mt-1 line-clamp-2">
              {stripHtml(item.description)}
            </p>
          )}

          {item.type === 'RECOGNITION' && (
            <div className="mt-1">
              <p className="text-xs text-surface-600 dark:text-surface-400">
                {item.giverName} recognized <span className="font-medium text-surface-800 dark:text-surface-200">{item.receiverName}</span>
              </p>
              {item.description && (
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 line-clamp-2 italic">
                  &ldquo;{item.description}&rdquo;
                </p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                {item.pointsAwarded && item.pointsAwarded > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
                    <Star className="h-3 w-3" /> {item.pointsAwarded} pts
                  </span>
                )}
                {(item.likesCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-surface-500">
                    <ThumbsUp className="h-3 w-3" /> {item.likesCount}
                  </span>
                )}
                {(item.commentsCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-surface-500">
                    <MessageCircle className="h-3 w-3" /> {item.commentsCount}
                  </span>
                )}
              </div>
            </div>
          )}

          {item.type === 'BIRTHDAY' && (
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              {item.personDepartment && <span>{item.personDepartment}</span>}
              {!item.isToday && item.daysUntil !== undefined && (
                <span> &middot; in {item.daysUntil} day{item.daysUntil !== 1 ? 's' : ''}</span>
              )}
            </p>
          )}

          {item.type === 'WORK_ANNIVERSARY' && (
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              {item.personDesignation && <span>{item.personDesignation}</span>}
              {item.personDepartment && <span> &middot; {item.personDepartment}</span>}
            </p>
          )}

          {item.type === 'NEW_JOINER' && (
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              {item.description}
              {item.daysSinceJoining !== undefined && item.daysSinceJoining <= 7 && (
                <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  (joined {item.daysSinceJoining === 0 ? 'today' : `${item.daysSinceJoining}d ago`})
                </span>
              )}
            </p>
          )}

          {/* Footer: timestamp + publisher */}
          <div className="flex items-center gap-2 mt-2 text-xs text-surface-400">
            <span>{formatFeedDate(item.timestamp)}</span>
            {item.publishedByName && (
              <span>&middot; by {item.publishedByName}</span>
            )}
            {item.readCount !== undefined && item.readCount > 0 && (
              <span>&middot; {item.readCount} read{item.readCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function formatFeedDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    const distance = formatDistanceToNow(date, { addSuffix: true });
    return distance;
  } catch {
    return dateStr;
  }
}

// ─── Demo Feed Data (fallback when APIs fail) ────────────────────────
function getDemoFeed(): FeedItem[] {
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 259200000).toISOString();
  const fiveDaysAgo = new Date(Date.now() - 432000000).toISOString();

  return [
    {
      id: 'demo-ann-1',
      type: 'ANNOUNCEMENT',
      timestamp: today,
      title: 'Q1 2026 All-Hands Meeting — March 20th',
      description: 'Join us for the quarterly all-hands meeting. We will discuss company performance, upcoming product launches, and open Q&A with leadership.',
      category: 'EVENT',
      priority: 'HIGH',
      isPinned: true,
      publishedByName: 'HR Team',
      readCount: 45,
    },
    {
      id: 'demo-bday-1',
      type: 'BIRTHDAY',
      timestamp: today,
      title: 'Happy Birthday, Priya Sharma!',
      personName: 'Priya Sharma',
      personDepartment: 'Engineering',
      isToday: true,
      daysUntil: 0,
    },
    {
      id: 'demo-recog-1',
      type: 'RECOGNITION',
      timestamp: yesterday,
      title: 'Outstanding Delivery',
      description: 'Incredible work on the payment gateway integration. The client was thrilled with the early delivery!',
      giverName: 'Arjun Patel',
      receiverName: 'Meera Nair',
      recognitionType: 'KUDOS',
      recognitionCategory: 'GOING_EXTRA_MILE',
      pointsAwarded: 50,
      likesCount: 12,
      commentsCount: 3,
    },
    {
      id: 'demo-anniv-1',
      type: 'WORK_ANNIVERSARY',
      timestamp: yesterday,
      title: 'Rahul Verma completes 3 years!',
      personName: 'Rahul Verma',
      personDepartment: 'Product',
      personDesignation: 'Senior Product Manager',
      yearsCompleted: 3,
      isToday: false,
      daysUntil: 1,
    },
    {
      id: 'demo-newjoin-1',
      type: 'NEW_JOINER',
      timestamp: twoDaysAgo,
      title: 'Welcome Ananya Reddy to the team!',
      description: 'UX Designer - Design',
      personName: 'Ananya Reddy',
      personDepartment: 'Design',
      personDesignation: 'UX Designer',
      daysSinceJoining: 2,
    },
    {
      id: 'demo-ann-2',
      type: 'ANNOUNCEMENT',
      timestamp: threeDaysAgo,
      title: 'Updated Remote Work Policy — Effective April 1',
      description: 'We are updating our hybrid work policy. Employees can now work remotely up to 3 days per week. Please review the full policy in the HR portal.',
      category: 'POLICY_UPDATE',
      priority: 'MEDIUM',
      isPinned: false,
      publishedByName: 'Deepa Kumar',
      readCount: 128,
    },
    {
      id: 'demo-recog-2',
      type: 'RECOGNITION',
      timestamp: fiveDaysAgo,
      title: 'Team Player Award',
      description: 'Always willing to help others and share knowledge. A true team player!',
      giverName: 'Vikram Singh',
      receiverName: 'Kavitha Rajan',
      recognitionType: 'APPRECIATION',
      recognitionCategory: 'TEAMWORK',
      pointsAwarded: 30,
      likesCount: 8,
      commentsCount: 1,
    },
    {
      id: 'demo-bday-2',
      type: 'BIRTHDAY',
      timestamp: new Date(Date.now() + 172800000).toISOString(),
      title: "Arun Kumar's birthday is coming up",
      personName: 'Arun Kumar',
      personDepartment: 'Finance',
      isToday: false,
      daysUntil: 2,
    },
  ];
}
