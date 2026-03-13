/**
 * Company Spotlight types.
 * Admin-managed carousel slides displayed above the feed on the dashboard.
 * Used for: org vision, department highlights, upcoming events, culture posts.
 */

export interface Spotlight {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  bgGradient?: string; // tailwind gradient classes, e.g. "from-blue-600 to-indigo-700"
  displayOrder: number;
  isActive: boolean;
  startDate?: string; // ISO date — show only after this date
  endDate?: string;   // ISO date — hide after this date
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  tenantId?: string;
}

export interface CreateSpotlightRequest {
  title: string;
  description?: string;
  imageUrl?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  bgGradient?: string;
  displayOrder?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateSpotlightRequest {
  title?: string;
  description?: string;
  imageUrl?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  bgGradient?: string;
  displayOrder?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}
