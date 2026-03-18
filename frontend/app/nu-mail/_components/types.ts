// Shared types for nu-mail components

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface SendAsAddress {
  sendAsEmail: string;
  displayName?: string;
  signature?: string;
  isPrimary?: boolean;
  isDefault?: boolean;
  treatAsAlias?: boolean;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  cc?: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  labels: string[];
  body?: string;
  bodyHtml?: string;
  attachments?: EmailAttachment[];
}

export interface EmailLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

export interface ComposeEmail {
  to: string;
  cc: string;
  subject: string;
  body: string;
  replyToId?: string;
  threadId?: string;
}

export interface EmailContact {
  email: string;
  name: string;
  designation?: string;
  department?: string;
}
