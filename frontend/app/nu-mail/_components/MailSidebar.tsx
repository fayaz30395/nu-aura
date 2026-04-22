'use client';

import React from 'react';
import {AlertCircle, FileText, Inbox, Plus, Send, Star, Tag, Trash2,} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Card, CardContent} from '@/components/ui/Card';
import {EmailLabel} from './types';

interface MailSidebarProps {
  labels: EmailLabel[];
  selectedLabel: string;
  unreadCount: number;
  onLabelSelect: (labelId: string) => void;
  onCompose: () => void;
}

function getLabelIcon(labelId: string) {
  switch (labelId) {
    case 'INBOX':
      return <Inbox className="h-4 w-4"/>;
    case 'SENT':
      return <Send className="h-4 w-4"/>;
    case 'STARRED':
      return <Star className="h-4 w-4"/>;
    case 'DRAFT':
      return <FileText className="h-4 w-4"/>;
    case 'TRASH':
      return <Trash2 className="h-4 w-4"/>;
    case 'SPAM':
      return <AlertCircle className="h-4 w-4"/>;
    default:
      return <Tag className="h-4 w-4"/>;
  }
}

export function MailSidebar({
                              labels,
                              selectedLabel,
                              unreadCount,
                              onLabelSelect,
                              onCompose,
                            }: MailSidebarProps) {
  return (
    <Card className="lg:col-span-1">
      <CardContent className="p-2">
        <Button
          variant="primary"
          className="w-full mb-4"
          onClick={onCompose}
          leftIcon={<Plus className="h-4 w-4"/>}
        >
          Compose
        </Button>
        <nav className="space-y-1">
          {labels.map((label) => (
            <button
              key={label.id}
              onClick={() => onLabelSelect(label.id)}
              className={`w-full row-between gap-4 px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                selectedLabel === label.id
                  ? "bg-accent-subtle text-accent"
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <div className="flex items-center gap-4">
                {getLabelIcon(label.id)}
                <span>{label.name}</span>
              </div>
              {label.id === 'INBOX' && unreadCount > 0 && (
                <span
                  className='px-2 py-0.5 bg-status-danger-bg text-status-danger-text rounded-full text-xs font-medium'>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
}
