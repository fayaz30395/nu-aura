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
  | 'SPOTLIGHT'
  | 'WALL_POST';

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
  // Wall post fields
  wallPostId?: string; // Wall post reference (for reactions/comments via wall API)
  wallPostAuthorId?: string; // Author employee UUID (for ownership checks)
  wallPostAuthor?: string;
  wallPostAuthorDepartment?: string;
  wallPostImageUrl?: string;
  wallPostType?: 'POST' | 'POLL' | 'PRAISE';
  // Poll fields
  pollOptions?: Array<{
    id: string;
    text: string;
    voteCount: number;
    votePercentage: number;
  }>;
  hasVoted?: boolean;
  userVotedOptionId?: string;
  totalVotes?: number;
  // Praise fields
  praiseRecipientName?: string;
  praiseRecipientAvatar?: string;
  praiseRecipientDepartment?: string;
  praiseRecipientDesignation?: string;
  praiseRecipientId?: string;
  praiseCategory?: string; // celebrationType from backend
  // Reactor details
  recentReactors?: Array<{
    employeeId: string;
    fullName: string;
    avatarUrl?: string;
    reactionType: string;
    reactedAt: string;
  }>;
  totalReactorCount?: number;
}

export interface CompanyFeedData {
  items: FeedItem[];
  hasMore: boolean;
  totalItems: number;
}
