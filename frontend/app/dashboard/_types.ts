/**
 * Shared types for the operator dashboard and its extracted sub-components.
 * `GoogleNotification` was previously declared inline in `page.tsx`; moved here so
 * the modal sub-component can share the exact same shape (no behaviour change).
 */
export interface GoogleNotification {
  id: string;
  type: 'email' | 'drive' | 'calendar';
  title: string;
  subtitle: string;
  timestamp: Date;
  link?: string;
  isUnread?: boolean;
  hasVideo?: boolean;
  // Full event data for calendar events
  calendarEvent?: {
    id: string;
    summary: string;
    description?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    location?: string;
    hangoutLink?: string;
    htmlLink?: string;
    attendees?: { email: string; displayName?: string; responseStatus?: string }[];
    organizer?: { email: string; displayName?: string };
  };
  // Full email data
  emailData?: {
    id: string;
    threadId: string;
    from: string;
    subject: string;
    snippet?: string;
  };
  // Full drive file data
  driveFile?: {
    id: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
  };
}
