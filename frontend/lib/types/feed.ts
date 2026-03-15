/**
 * Company Feed Types
 *
 * Unified social feed for the dashboard that aggregates:
 * - Announcements (from announcement service)
 * - Celebrations (birthdays, work anniversaries, new joiners, promotions)
 * - Recognitions/Kudos (from recognition service)
 */

export type FeedItemType =
  | 'ANNOUNCEMENT'
  | 'BIRTHDAY'
  | 'WORK_ANNIVERSARY'
  | 'NEW_JOINER'
  | 'PROMOTION'
  | 'RECOGNITION'
  | 'LINKEDIN_POST'
  | 'SPOTLIGHT';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  timestamp: string; // ISO date for sorting
  title: string;
  description?: string;
  // Person info (for celebrations/recognition)
  personName?: string;
  personAvatarUrl?: string;
  personDepartment?: string;
  personDesignation?: string;
  // Celebration-specific
  yearsCompleted?: number; // for work anniversaries
  isToday?: boolean; // birthday/anniversary is today
  daysUntil?: number; // days until the celebration
  daysSinceJoining?: number; // for new joiners
  // Announcement-specific
  category?: string;
  priority?: string;
  isPinned?: boolean;
  publishedByName?: string;
  readCount?: number;
  // Recognition-specific
  giverName?: string;
  receiverName?: string;
  recognitionType?: string;
  recognitionCategory?: string;
  pointsAwarded?: number;
  likesCount?: number;
  commentsCount?: number;
  hasReacted?: boolean; // Whether current user has reacted to this item
  // LinkedIn post-specific
  linkedinPostUrl?: string;
  linkedinAuthor?: string;
  linkedinAuthorTitle?: string;
  linkedinImageUrl?: string;
  linkedinEngagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
  // Spotlight-specific
  spotlightImageUrl?: string;
  spotlightCtaUrl?: string;
  spotlightCtaLabel?: string;
  // Wall post reference (for reactions/comments via wall API)
  wallPostId?: string;
}

export interface CompanyFeedData {
  items: FeedItem[];
  hasMore: boolean;
  totalItems: number;
}
