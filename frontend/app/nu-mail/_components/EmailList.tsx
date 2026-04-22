'use client';

import React from 'react';
import {ChevronLeft, ChevronRight, MailOpen, Paperclip, Search, Star,} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {EmailMessage} from './types';

interface EmailListProps {
  emails: EmailMessage[];
  searchQuery: string;
  isLoading: boolean;
  selectedLabel: string;
  pageToken: string | null;
  prevPageTokens: string[];
  onSearchChange: (query: string) => void;
  onEmailClick: (emailId: string) => void;
  onToggleStar: (emailId: string, isStarred: boolean) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  formatDate: (dateString: string) => string;
}

export function EmailList({
                            emails,
                            searchQuery,
                            isLoading,
                            selectedLabel,
                            pageToken,
                            prevPageTokens,
                            onSearchChange,
                            onEmailClick,
                            onToggleStar,
                            onNextPage,
                            onPrevPage,
                            formatDate,
                          }: EmailListProps) {
  return (
    <>
      {/* Toolbar */}
      <div className="border-b border-[var(--border-main)] p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"/>
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevPage}
              disabled={prevPageTokens.length === 0}
            >
              <ChevronLeft className="h-4 w-4"/>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNextPage}
              disabled={!pageToken}
            >
              <ChevronRight className="h-4 w-4"/>
            </Button>
          </div>
        </div>
      </div>
      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div
              className='w-10 h-10 border-4 border-[var(--accent-primary)] border-t-accent-500 rounded-full animate-spin'/>
            <p className="text-[var(--text-muted)]">Loading emails...</p>
          </div>
        </div>
      ) : emails.length === 0 ? (
        /* Empty State */
        (<div className="py-16">
          <div className="text-center">
            <MailOpen className="h-16 w-16 text-[var(--text-muted)] mx-auto mb-4"/>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              {searchQuery ? 'No emails found' : 'No emails here'}
            </h3>
            <p className="text-[var(--text-muted)]">
              {searchQuery
                ? 'Try adjusting your search query'
                : `Your ${selectedLabel.toLowerCase()} is empty`}
            </p>
          </div>
        </div>)
      ) : (
        /* Email List */
        (<div className='divide-y divide-surface-100'>
          {emails.map((email) => (
            <div
              key={email.id}
              onClick={() => onEmailClick(email.id)}
              className={`flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors ${
                !email.isRead ? 'bg-accent-50/50' : ''
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(email.id, email.isStarred);
                }}
                className={`flex-shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                  email.isStarred
                    ? 'text-warning-500'
                    : 'text-[var(--text-muted)] dark:text-[var(--text-secondary)] hover:text-warning-500'
                }`}
                aria-label={email.isStarred ? 'Remove star' : 'Add star'}
              >
                <Star className={`h-5 w-5 ${email.isStarred ? 'fill-current' : ''}`}/>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm truncate ${
                    !email.isRead
                      ? 'font-semibold text-[var(--text-primary)]'
                      : 'font-medium text-[var(--text-secondary)]'
                  }`}>
                    {email.from}
                  </span>
                  {email.hasAttachments && (
                    <Paperclip className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0"/>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm truncate ${
                    !email.isRead
                      ? 'font-medium text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)]'
                  }`}>
                    {email.subject}
                  </span>
                  <span className="text-body-muted truncate hidden sm:inline">
                    - {email.snippet}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 text-caption">
                {formatDate(email.date)}
              </div>
            </div>
          ))}
        </div>)
      )}
    </>
  );
}
