'use client';

import { useState, useEffect } from 'react';
import { format, formatDistanceToNow, isToday, parseISO } from 'date-fns';
import {
  Megaphone, Cake, Trophy, UserPlus, TrendingUp, Award,
  MessageCircle, ThumbsUp, Heart, Star, Pin, ChevronDown,
  RefreshCw, Linkedin, Lightbulb, ExternalLink,
} from 'lucide-react';
import { feedService } from '@/lib/services/feed.service';
import { wallService } from '@/lib/services/wall.service';
import type { FeedItem, FeedItemType } from '@/lib/types/feed';

// ─── Config ──────────────────────────────────────────────────────────
const FEED_COLORS: Record<FeedItemType, { bg: string; border: string; icon: string; badge: string }> = {
  ANNOUNCEMENT: {
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-l-gray-400',
    icon: 'text-gray-500 dark:text-gray-400',
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  BIRTHDAY: {
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-l-gray-400',
    icon: 'text-gray-500 dark:text-gray-400',
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  WORK_ANNIVERSARY: {
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-l-gray-400',
    icon: 'text-gray-500 dark:text-gray-400',
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  NEW_JOINER: {
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-l-gray-400',
    icon: 'text-gray-500 dark:text-gray-400',
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  PROMOTION: {
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-l-gray-400',
    icon: 'text-gray-500 dark:text-gray-400',
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  RECOGNITION: {
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-l-gray-400',
    icon: 'text-gray-500 dark:text-gray-400',
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  LINKEDIN_POST: {
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-l-gray-400',
    icon: 'text-gray-500 dark:text-gray-400',
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  SPOTLIGHT: {
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-l-gray-400',
    icon: 'text-gray-500 dark:text-gray-400',
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
};

const FEED_ICONS: Record<FeedItemType, React.ReactNode> = {
  ANNOUNCEMENT: <Megaphone className="h-4 w-4" />,
  BIRTHDAY: <Cake className="h-4 w-4" />,
  WORK_ANNIVERSARY: <Trophy className="h-4 w-4" />,
  NEW_JOINER: <UserPlus className="h-4 w-4" />,
  PROMOTION: <TrendingUp className="h-4 w-4" />,
  RECOGNITION: <Award className="h-4 w-4" />,
  LINKEDIN_POST: <Linkedin className="h-4 w-4" />,
  SPOTLIGHT: <Lightbulb className="h-4 w-4" />,
};

const FEED_LABELS: Record<FeedItemType, string> = {
  ANNOUNCEMENT: 'Announcement',
  BIRTHDAY: 'Birthday',
  WORK_ANNIVERSARY: 'Work Anniversary',
  NEW_JOINER: 'New Joiner',
  PROMOTION: 'Promotion',
  RECOGNITION: 'Recognition',
  LINKEDIN_POST: 'LinkedIn',
  SPOTLIGHT: 'Spotlight',
};

const ITEMS_PER_PAGE = 8;

type FeedFilter = 'ALL' | FeedItemType;

const FILTER_OPTIONS: { value: FeedFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ANNOUNCEMENT', label: 'Announcements' },
  { value: 'BIRTHDAY', label: 'Birthdays' },
  { value: 'WORK_ANNIVERSARY', label: 'Anniversaries' },
  { value: 'NEW_JOINER', label: 'New Joiners' },
  { value: 'RECOGNITION', label: 'Recognition' },
  { value: 'LINKEDIN_POST', label: 'LinkedIn' },
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
    } catch {
      setItems(getDemoFeed());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { loadFeed(); }, [employeeId]);

  const filteredItems = activeFilter === 'ALL' ? items : items.filter(item => item.type === activeFilter);
  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Company Feed</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-start gap-2.5 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Company Feed
        </h3>
        <button
          onClick={() => loadFeed(true)}
          disabled={isRefreshing}
          className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {FILTER_OPTIONS.map(option => (
          <button
            key={option.value}
            onClick={() => { setActiveFilter(option.value); setVisibleCount(ITEMS_PER_PAGE); }}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
              activeFilter === option.value
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Feed Items */}
      {visibleItems.length > 0 ? (
        <div className="space-y-2">
          {visibleItems.map(item => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-xs text-gray-400">
            {activeFilter === 'ALL' ? 'No feed items yet.' : `No ${FEED_LABELS[activeFilter as FeedItemType]?.toLowerCase()} items.`}
          </p>
        </div>
      )}

      {/* Show More */}
      {hasMore && (
        <button
          onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
          className="w-full mt-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          Show more <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Feed Card ───────────────────────────────────────────────────────
function FeedCard({ item }: { item: FeedItem }) {
  const colors = FEED_COLORS[item.type];
  const icon = FEED_ICONS[item.type];
  const [liked, setLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(item.likesCount ?? 0);

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLocalLikeCount((prev) => wasLiked ? Math.max(0, prev - 1) : prev + 1);
    try {
      if (item.wallPostId) {
        if (wasLiked) {
          await wallService.removeReaction(item.wallPostId);
        } else {
          await wallService.addReaction(item.wallPostId, 'LIKE');
        }
      }
    } catch {
      // Revert on error
      setLiked(wasLiked);
      setLocalLikeCount(item.likesCount ?? 0);
    }
  };

  return (
    <div className={`rounded-lg border-l-2 ${colors.border} ${colors.bg} p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800`}>
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 ${colors.icon}`}>
          {item.personAvatarUrl ? (
            <img src={item.personAvatarUrl} alt={item.personName || ''} className="w-8 h-8 rounded-full object-cover" />
          ) : icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badge row */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${colors.badge}`}>
              {FEED_LABELS[item.type]}
            </span>
            {item.isPinned && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                <Pin className="h-2.5 w-2.5" /> Pinned
              </span>
            )}
            {item.isToday && (
              <span className="text-[10px] font-medium text-green-600 dark:text-green-400">Today</span>
            )}
            {item.priority === 'CRITICAL' && (
              <span className="text-[10px] font-medium text-red-600 dark:text-red-400">Urgent</span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
            {item.title}
          </p>

          {/* Type-specific content */}
          {item.type === 'ANNOUNCEMENT' && item.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
              {stripHtml(item.description)}
            </p>
          )}

          {item.type === 'RECOGNITION' && (
            <div className="mt-0.5">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.giverName} recognized <span className="font-medium text-gray-700 dark:text-gray-300">{item.receiverName}</span>
              </p>
              {item.description && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 italic">
                  &ldquo;{item.description}&rdquo;
                </p>
              )}
              <div className="flex items-center gap-2.5 mt-1">
                {item.pointsAwarded && item.pointsAwarded > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">
                    <Star className="h-2.5 w-2.5" /> {item.pointsAwarded} pts
                  </span>
                )}
                {(item.likesCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                    <ThumbsUp className="h-2.5 w-2.5" /> {item.likesCount}
                  </span>
                )}
                {(item.commentsCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                    <MessageCircle className="h-2.5 w-2.5" /> {item.commentsCount}
                  </span>
                )}
              </div>
            </div>
          )}

          {item.type === 'BIRTHDAY' && (
            <p className="text-xs text-gray-400 mt-0.5">
              {item.personDepartment}
              {!item.isToday && item.daysUntil !== undefined && ` · in ${item.daysUntil}d`}
            </p>
          )}

          {item.type === 'WORK_ANNIVERSARY' && (
            <p className="text-xs text-gray-400 mt-0.5">
              {item.personDesignation}{item.personDepartment && ` · ${item.personDepartment}`}
            </p>
          )}

          {item.type === 'NEW_JOINER' && (
            <p className="text-xs text-gray-400 mt-0.5">
              {item.description}
              {item.daysSinceJoining !== undefined && item.daysSinceJoining <= 7 && (
                <span className="ml-1 text-gray-500 font-medium">
                  (joined {item.daysSinceJoining === 0 ? 'today' : `${item.daysSinceJoining}d ago`})
                </span>
              )}
            </p>
          )}

          {item.type === 'LINKEDIN_POST' && (
            <div className="mt-1">
              {item.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>
              )}
              {item.linkedinImageUrl && (
                <div className="mt-1.5 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img src={item.linkedinImageUrl} alt="" className="w-full h-24 object-cover" />
                </div>
              )}
              <div className="flex items-center gap-2.5 mt-1.5">
                {item.linkedinEngagement && (
                  <>
                    {item.linkedinEngagement.likes > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                        <ThumbsUp className="h-2.5 w-2.5" /> {item.linkedinEngagement.likes}
                      </span>
                    )}
                    {item.linkedinEngagement.comments > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                        <MessageCircle className="h-2.5 w-2.5" /> {item.linkedinEngagement.comments}
                      </span>
                    )}
                  </>
                )}
                {item.linkedinPostUrl && (
                  <a
                    href={item.linkedinPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 ml-auto"
                  >
                    View on LinkedIn <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Reaction Bar */}
          <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleLike}
              className={`inline-flex items-center gap-1 text-[11px] transition-colors ${
                liked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Heart className={`h-3 w-3 ${liked ? 'fill-red-500' : ''}`} />
              {localLikeCount > 0 ? localLikeCount : 'Like'}
            </button>
            <button className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <MessageCircle className="h-3 w-3" />
              {(item.commentsCount ?? 0) > 0 ? item.commentsCount : 'Comment'}
            </button>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
            <span>{formatFeedDate(item.timestamp)}</span>
            {item.publishedByName && <span>· {item.publishedByName}</span>}
            {item.readCount !== undefined && item.readCount > 0 && (
              <span>· {item.readCount} read{item.readCount !== 1 ? 's' : ''}</span>
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
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

// ─── Demo Feed Data ──────────────────────────────────────────────────
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
