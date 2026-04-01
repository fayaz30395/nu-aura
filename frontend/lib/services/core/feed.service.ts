import { homeService } from './home.service';
import { announcementService } from '../platform/announcement.service';
import { recognitionService } from '../grow/recognition.service';
import { linkedinService } from '../platform/linkedin.service';
import { wallService } from './wall.service';
import type { WallPostResponse } from './wall.service';
import type { FeedItem } from '@/lib/types/core/feed';
import type { Announcement } from '../platform/announcement.service';
import type { Recognition } from '@/lib/types/grow/recognition';
import type { LinkedInPost } from '@/lib/types/platform/linkedin';
import type {
  BirthdayResponse,
  WorkAnniversaryResponse,
  NewJoineeResponse,
} from './home.service';

/**
 * Feed Service — aggregates announcements, celebrations, and recognitions
 * into a unified chronological feed for the dashboard.
 */
class FeedService {
  /**
   * Get the unified company feed.
   * Fetches from multiple sources in parallel and merges by timestamp.
   */
  async getCompanyFeed(employeeId?: string): Promise<FeedItem[]> {
    const results = await Promise.allSettled([
      this.fetchAnnouncements(employeeId),
      this.fetchBirthdays(),
      this.fetchAnniversaries(),
      this.fetchNewJoiners(),
      this.fetchRecognitions(),
      this.fetchLinkedInPosts(),
      this.fetchWallPosts(),
    ]);

    const items: FeedItem[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        items.push(...result.value);
      } else {
        console.warn('[FeedService] One feed source failed:', result.reason);
      }
    }

    return this.sortFeedItems(items);
  }

  /**
   * Get feed items filtered to a specific date range.
   * Used for lazy-loading older date sections without re-fetching everything.
   * For "recent" (today/yesterday): fetches from all sources.
   * For "older": fetches only wall posts and announcements (celebrations are always recent).
   */
  async getCompanyFeedRecent(employeeId?: string): Promise<FeedItem[]> {
    // Fetch all sources — celebrations are inherently "recent" items
    return this.getCompanyFeed(employeeId);
  }

  async getCompanyFeedOlder(employeeId?: string, page = 0, size = 20): Promise<FeedItem[]> {
    // For older content, only wall posts and announcements have historical data worth fetching.
    // Celebrations (birthdays, anniversaries, new joiners) are always near-current-date.
    const results = await Promise.allSettled([
      this.fetchAnnouncements(employeeId, page, size),
      this.fetchWallPosts(page, size),
      this.fetchLinkedInPosts(page, size),
    ]);

    const items: FeedItem[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        items.push(...result.value);
      } else {
        console.warn('[FeedService] Older feed source failed:', result.reason);
      }
    }

    return this.sortFeedItems(items);
  }

  private sortFeedItems(items: FeedItem[]): FeedItem[] {
    // Sort: pinned announcements first, then by timestamp descending
    items.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return items;
  }

  private async fetchAnnouncements(employeeId?: string, page = 0, size = 10): Promise<FeedItem[]> {
    try {
      const data = employeeId
        ? await announcementService.getActiveAnnouncements(employeeId, page, size)
        : await announcementService.getAllAnnouncements(page, size);

      return data.content.map((a: Announcement): FeedItem => ({
        id: `announcement-${a.id}`,
        type: 'ANNOUNCEMENT',
        timestamp: a.publishedAt || a.createdAt,
        title: a.title,
        description: a.content,
        category: a.category,
        priority: a.priority,
        isPinned: a.isPinned,
        publishedByName: a.publishedByName,
        readCount: a.readCount,
        wallPostId: a.wallPostId, // Enable reactions/comments through wall API
        hasReacted: a.hasReacted, // User's reaction status
      }));
    } catch {
      return [];
    }
  }

  private async fetchBirthdays(): Promise<FeedItem[]> {
    try {
      const birthdays = await homeService.getUpcomingBirthdays(14);
      return birthdays.map((b: BirthdayResponse): FeedItem => ({
        id: `birthday-${b.employeeId}`,
        type: 'BIRTHDAY',
        timestamp: b.birthdayDate,
        title: b.isToday
          ? `Happy Birthday, ${b.employeeName}!`
          : `${b.employeeName}'s birthday is coming up`,
        personName: b.employeeName,
        personAvatarUrl: b.avatarUrl,
        personDepartment: b.department,
        isToday: b.isToday,
        daysUntil: b.daysUntil,
      }));
    } catch {
      return [];
    }
  }

  private async fetchAnniversaries(): Promise<FeedItem[]> {
    try {
      const anniversaries = await homeService.getUpcomingAnniversaries(14);
      return anniversaries.map((a: WorkAnniversaryResponse): FeedItem => ({
        id: `anniversary-${a.employeeId}`,
        type: 'WORK_ANNIVERSARY',
        timestamp: a.anniversaryDate,
        title: a.isToday
          ? `${a.employeeName} completes ${a.yearsCompleted} year${a.yearsCompleted > 1 ? 's' : ''}!`
          : `${a.employeeName}'s ${a.yearsCompleted}-year anniversary is coming up`,
        personName: a.employeeName,
        personAvatarUrl: a.avatarUrl,
        personDepartment: a.department,
        personDesignation: a.designation,
        yearsCompleted: a.yearsCompleted,
        isToday: a.isToday,
        daysUntil: a.daysUntil,
      }));
    } catch {
      return [];
    }
  }

  private async fetchNewJoiners(): Promise<FeedItem[]> {
    try {
      const joiners = await homeService.getNewJoinees(30);
      return joiners.map((j: NewJoineeResponse): FeedItem => ({
        id: `newjoiner-${j.employeeId}`,
        type: 'NEW_JOINER',
        timestamp: j.joiningDate,
        title: `Welcome ${j.employeeName} to the team!`,
        description: j.designation
          ? `${j.designation}${j.department ? ` - ${j.department}` : ''}`
          : j.department || undefined,
        personName: j.employeeName,
        personAvatarUrl: j.avatarUrl,
        personDepartment: j.department,
        personDesignation: j.designation,
        daysSinceJoining: j.daysSinceJoining,
      }));
    } catch {
      return [];
    }
  }

  private async fetchRecognitions(): Promise<FeedItem[]> {
    try {
      const data = await recognitionService.getPublicFeed(0, 10);
      return data.content.map((r: Recognition): FeedItem => ({
        id: `recognition-${r.id}`,
        type: 'RECOGNITION',
        timestamp: r.recognizedAt || r.createdAt,
        title: r.title,
        description: r.message,
        giverName: r.isAnonymous ? 'Someone' : r.giverName,
        receiverName: r.receiverName,
        recognitionType: r.type,
        recognitionCategory: r.category,
        pointsAwarded: r.pointsAwarded,
        likesCount: r.likesCount,
        commentsCount: r.commentsCount,
        wallPostId: r.wallPostId, // Enable reactions/comments through wall API
        hasReacted: r.hasReacted, // User's reaction status
      }));
    } catch {
      return [];
    }
  }

  private async fetchWallPosts(page = 0, size = 20): Promise<FeedItem[]> {
    try {
      const data = await wallService.getPosts(page, size);
      return data.content.map((post: WallPostResponse): FeedItem => ({
        id: `wallpost-${post.id}`,
        type: 'WALL_POST',
        timestamp: post.createdAt,
        title: post.content.length > 120
          ? post.content.substring(0, 120) + '...'
          : post.content,
        description: post.content,
        personName: post.author.fullName,
        personDepartment: post.author.department,
        personDesignation: post.author.designation,
        personAvatarUrl: post.author.avatarUrl,
        isPinned: post.pinned,
        likesCount: Object.values(post.reactionCounts).reduce((a, b) => a + b, 0),
        commentsCount: post.commentCount,
        hasReacted: post.hasReacted,
        wallPostId: post.id,
        wallPostAuthorId: post.author.id,
        wallPostAuthor: post.author.fullName,
        wallPostAuthorDepartment: post.author.department,
        wallPostImageUrl: post.imageUrl ?? undefined,
        wallPostType: post.type,
        // Poll data
        pollOptions: post.pollOptions,
        hasVoted: post.hasVoted,
        userVotedOptionId: post.userVotedOptionId,
        totalVotes: post.pollOptions?.reduce((sum, opt) => sum + opt.voteCount, 0) ?? 0,
        // Praise data
        praiseRecipientName: post.praiseRecipient?.fullName,
        praiseRecipientAvatar: post.praiseRecipient?.avatarUrl,
        praiseRecipientDepartment: post.praiseRecipient?.department,
        praiseRecipientDesignation: post.praiseRecipient?.designation,
        praiseRecipientId: post.praiseRecipient?.employeeId,
        praiseCategory: post.celebrationType,
        recentReactors: post.recentReactors,
        totalReactorCount: post.totalReactorCount,
      }));
    } catch {
      return [];
    }
  }

  private async fetchLinkedInPosts(page = 0, size = 10): Promise<FeedItem[]> {
    try {
      const data = await linkedinService.getActiveLinkedInPosts(page, size);
      return data.content.map((post: LinkedInPost): FeedItem => ({
        id: `linkedin-${post.id}`,
        type: 'LINKEDIN_POST',
        timestamp: post.postedAt,
        title: post.contentSnippet.substring(0, 80),
        linkedinPostUrl: post.postUrl,
        linkedinAuthor: post.authorName,
        linkedinAuthorTitle: post.authorTitle,
        linkedinImageUrl: post.imageUrl,
        linkedinEngagement: post.engagement,
      }));
    } catch {
      return [];
    }
  }
}

export const feedService = new FeedService();
