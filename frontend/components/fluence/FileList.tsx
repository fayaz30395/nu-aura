'use client';

import React from 'react';
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Download,
  Trash2,
  FileCode,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FluenceAttachment } from '@/lib/types/platform/fluence';
import { fluenceService } from '@/lib/services/platform/fluence.service';
import { cn } from '@/lib/utils';
import { safeWindowOpen } from '@/lib/utils/url';

interface FileListProps {
  attachments: FluenceAttachment[];
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  className?: string;
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) return FileImage;
  if (contentType.includes('pdf')) return FileText;
  if (contentType.includes('spreadsheet') || contentType.includes('excel') || contentType.includes('csv'))
    return FileSpreadsheet;
  if (contentType.includes('text/') || contentType.includes('json') || contentType.includes('xml'))
    return FileCode;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function FileList({ attachments, onDelete, isDeleting, className }: FileListProps) {
  const handleDownload = async (attachment: FluenceAttachment) => {
    try {
      const downloadUrl = await fluenceService.getAttachmentDownloadUrl(attachment.id);
      safeWindowOpen(downloadUrl, '_blank');
    } catch {
      // If pre-signed URL fails, try direct downloadUrl from the attachment
      if (attachment.downloadUrl) {
        safeWindowOpen(attachment.downloadUrl, '_blank');
      }
    }
  };

  if (attachments.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mx-auto mb-4">
          <File className="h-6 w-6 text-[var(--text-muted)]" />
        </div>
        <p className="text-body-muted">No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {attachments.map((attachment) => {
        const IconComponent = getFileIcon(attachment.contentType);
        return (
          <div
            key={attachment.id}
            className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border-main)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
              <IconComponent className="h-5 w-5 text-accent-600 dark:text-accent-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {attachment.fileName}
              </p>
              <p className="text-caption">
                {formatFileSize(attachment.fileSize)}
                {attachment.createdAt && (
                  <span className="ml-2">{formatDate(attachment.createdAt)}</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(attachment)}
                title="Download"
                className="p-2"
              >
                <Download className="h-4 w-4" />
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(attachment.id)}
                  disabled={isDeleting}
                  title="Delete"
                  className="p-2 text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
