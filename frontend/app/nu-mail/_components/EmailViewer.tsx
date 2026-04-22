'use client';

import React from 'react';
import {
  Archive,
  Calendar,
  ChevronLeft,
  Download,
  FileText,
  Forward,
  Loader2,
  Paperclip,
  Reply,
  ReplyAll,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {sanitizeEmailHtml} from '@/lib/utils/sanitize';
import {EmailAttachment, EmailMessage} from './types';

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
          <Loader2 className='w-10 h-10 text-accent animate-spin'/>
          <p className="text-[var(--text-muted)]">Loading email content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Back button and actions */}
      <div className="row-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          leftIcon={<ChevronLeft className="h-4 w-4"/>}
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
            <Reply className="h-4 w-4"/>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReplyAll}
            title="Reply All"
          >
            <ReplyAll className="h-4 w-4"/>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onForward}
            title="Forward"
          >
            <Forward className="h-4 w-4"/>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive(email.id)}
            title="Archive"
          >
            <Archive className="h-4 w-4"/>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(email.id)}
            title="Delete"
            className='text-status-danger-text hover:text-status-danger-text'
          >
            <Trash2 className="h-4 w-4"/>
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
            className={email.isStarred ? 'text-status-warning-text' : 'text-[var(--text-muted)] hover:text-status-warning-text'}
          >
            <Star className={`h-5 w-5 ${email.isStarred ? 'fill-current' : ''}`}/>
          </button>
        </div>

        <div className="flex items-start gap-4">
          <div
            className='w-10 h-10 rounded-full bg-accent-subtle flex items-center justify-center flex-shrink-0'>
            <User className='h-5 w-5 text-accent'/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--text-primary)]">
                {email.from}
              </span>
              <span className="text-body-muted">
                &lt;{email.fromEmail}&gt;
              </span>
            </div>
            <p className="text-body-muted">to {email.to}</p>
            {email.cc && (
              <p className="text-body-muted">cc: {email.cc}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-body-muted">
            <Calendar className="h-4 w-4"/>
            {new Date(email.date).toLocaleString()}
          </div>
        </div>

        {/* Email body */}
        <div className="border-t border-[var(--border-main)] pt-4">
          {email.bodyHtml ? (
            <div
              className="prose dark:prose-invert max-w-none email-content"
              dangerouslySetInnerHTML={{__html: sanitizeEmailHtml(email.bodyHtml)}}
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
              <Paperclip className="h-4 w-4"/>
              Attachments ({email.attachments.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((attachment: EmailAttachment) => (
                <button
                  key={attachment.id}
                  onClick={() => onDownloadAttachment(email.id, attachment.id, attachment.filename)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                >
                  <FileText
                    className="h-4 w-4 text-[var(--text-muted)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
                  <span className="text-body-secondary">
                    {attachment.filename}
                  </span>
                  <span className="text-caption">
                    ({formatFileSize(attachment.size)})
                  </span>
                  <Download className="h-3 w-3 text-[var(--text-muted)]"/>
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
            leftIcon={<Reply className="h-4 w-4"/>}
          >
            Reply
          </Button>
          <Button
            variant="outline"
            onClick={onForward}
            leftIcon={<Forward className="h-4 w-4"/>}
          >
            Forward
          </Button>
        </div>
      </div>
    </div>
  );
}
