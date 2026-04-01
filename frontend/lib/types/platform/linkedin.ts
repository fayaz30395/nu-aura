/**
 * LinkedIn Post types for manual curation.
 * Admin pastes LinkedIn post URLs; backend stores metadata.
 * Future: LinkedIn Marketing API auto-fetch.
 */

export interface LinkedInPost {
  id: string;
  postUrl: string;
  authorName: string;
  authorTitle?: string;
  authorAvatarUrl?: string;
  contentSnippet: string;
  imageUrl?: string;
  postedAt: string; // ISO date
  engagement: LinkedInEngagement;
  tags: string[];
  isFromNulogic: boolean; // true = posted by Nulogic, false = tagged Nulogic
  isActive: boolean;
  curatedAt: string; // when admin added it
  curatedBy?: string;
  tenantId?: string;
}

export interface LinkedInEngagement {
  likes: number;
  comments: number;
  shares: number;
}

export interface CreateLinkedInPostRequest {
  postUrl: string;
  authorName: string;
  authorTitle?: string;
  authorAvatarUrl?: string;
  contentSnippet: string;
  imageUrl?: string;
  postedAt: string;
  engagement?: Partial<LinkedInEngagement>;
  tags?: string[];
  isFromNulogic: boolean;
}

export interface UpdateLinkedInPostRequest {
  contentSnippet?: string;
  imageUrl?: string;
  engagement?: Partial<LinkedInEngagement>;
  tags?: string[];
  isActive?: boolean;
}
