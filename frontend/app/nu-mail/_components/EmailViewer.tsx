'use client';

import React from 'react';
import {
  ChevronLeft,
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Trash2,
  Star,
  User,
  Calendar,
  Paperclip,
  FileText,
  Download,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { sanitizeEmailHtml } from '@/lib/utils/sanitize';
import { EmailMessage, EmailAttachment } from './types';

interface EmailViewerProps {
  email: EmailMessage;
  isLoadingEmail: boolean;
  onBack: () => void;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onArchive: (emailId: string) => void;
  onDelete: (emailId: string) => void;
  onToggleStar: (emailId: string, isStarred: boolean) => void;
  onDownloadAttachment: (messageId: string, attachmentId: string, filename: string) => void;
  formatFileSize: (bytes: number) => string;
}

export function EmailViewer({
  email,
  isLoadingEmail,
  onBack,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete,
  onToggleStar,
  onDownloadAttachment,
  formatFileSize,
}: EmailViewerProps) {
  if (isLoadingEmail) {
    return (
      <div className="p-6 flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-[var(--text-muted)]">Loading email content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Back button and actions */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          leftIcon={<ChevronLeft className="h-4 w-4" />}
        >
          Back to list
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReply}
            title="Reply"
          >
            <Reply className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReplyAll}
            title="Reply All"
          >
            <ReplyAll className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onForward}
            title="Forward"
          >
            <Forward className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive(email.id)}
            title="Archive"
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(email.id)}
            title="Delete"
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Email header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {email.subject}
          </h2>
          <button
            onClick={() => onToggleStar(email.id, email.isStarred)}
            className={email.isStarred ? 'text-yellow-500' : 'text-[var(--text-muted)] hover:text-yellow-500'}
          >
            <Star className={`h-5 w-5 ${email.isStarred ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--text-primary)]">
                {email.from}
              </span>
              <span className="text-sm text-[var(--text-muted)]">
                &lt;{email.fromEmail}&gt;
              </span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">to {email.to}</p>
            {email.cc && (
              <p className="text-sm text-[var(--text-muted)]">cc: {email.cc}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Calendar className="h-4 w-4" />
            {new Date(email.date).toLocaleString()}
          </div>
        </div>

        {/* Email body */}
        <div className="border-t border-[var(--border-main)] pt-4">
          {email.bodyHtml ? (
            <div
              className="prose dark:prose-invert max-w-none email-content"
              dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(email.bodyHtml) }}
            />
          ) : email.body ? (
            <pre className="text-[var(--text-secondary)] whitespace-pre-wrap font-sans text-sm">
              {email.body}
            </pre>
          ) : (
            <p className="text-[var(--text-muted)] italic">
              {email.snippet}
            </p>
          )}
        </div>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="border-t border-[var(--border-main)] pt-4">
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments ({email.attachments.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((attachment: EmailAttachment) => (
                <button
                  key={attachment.id}
                  onClick={() => onDownloadAttachment(email.id, attachment.id, attachment.filename)}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {attachment.filename}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    ({formatFileSize(attachment.size)})
                  </span>
                  <Download className="h-3 w-3 text-[var(--text-muted)]" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="border-t border-[var(--border-main)] pt-4 flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onReply}
            leftIcon={<Reply className="h-4 w-4" />}
          >
            Reply
          </Button>
          <Button
            variant="outline"
            onClick={onForward}
            leftIcon={<Forward className="h-4 w-4" />}
          >
            Forward
          </Button>
        </div>
      </div>
    </div>
  );
}
