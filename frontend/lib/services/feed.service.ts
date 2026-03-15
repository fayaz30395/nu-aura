import { apiClient } from '@/lib/api/client';
import { homeService } from './home.service';
import { announcementService } from './announcement.service';
import { recognitionService } from './recognition.service';
import { linkedinService } from './linkedin.service';
import type { FeedItem, FeedItemType } from '@/lib/types/feed';
import type { Announcement } from './announcement.service';
import type { Recognition } from '@/lib/types/recognition';
import type { LinkedInPost } from '@/lib/types/linkedin';
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
    ]);

    const items: FeedItem[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        items.push(...result.value);
      } else {
        console.warn('[FeedService] One feed source failed:', result.reason);
      }
    }

    // Sort: pinned announcements first, then by timestamp descending
    items.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return items;
  }

  private async fetchAnnouncements(employeeId?: string): Promise<FeedItem[]> {
    try {
      const data = employeeId
        ? await announcementService.getActiveAnnouncements(employeeId, 0, 10)
        : await announcementService.getAllAnnouncements(0, 10);

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

  private async fetchLinkedInPosts(): Promise<FeedItem[]> {
    try {
      const data = await linkedinService.getActiveLinkedInPosts(0, 10);
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
