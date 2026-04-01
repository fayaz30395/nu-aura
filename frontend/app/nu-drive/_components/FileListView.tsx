'use client';

import React from 'react';
import { Star, Users, Clock, MoreVertical } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { DriveFile, ViewTab } from './types';
import { getFileIcon, formatBytes } from './fileUtils';

interface FileListViewProps {
  files: DriveFile[];
  activeTab: ViewTab;
  onFileClick: (file: DriveFile) => void;
  onContextMenu: (e: React.MouseEvent, file: DriveFile) => void;
}

export function FileListView({ files, activeTab, onFileClick, onContextMenu }: FileListViewProps) {
  return (
    <Card>
      <div className="divide-y divide-surface-100 dark:divide-surface-800">
        {files.map((file) => (
          <div
            key={file.id}
            onClick={() => onFileClick(file)}
            onContextMenu={(e) => onContextMenu(e, file)}
            className="flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
          >
            <div className="flex-shrink-0">
              {getFileIcon(file.mimeType)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {file.name}
                </p>
                {file.starred && (
                  <Star className="h-4 w-4 text-warning-500 fill-warning-500 flex-shrink-0" />
                )}
                {file.shared && (
                  <Users className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-4 mt-1">
                {activeTab === 'shared' && file.sharingUser && (
                  <span className="text-xs text-[var(--text-muted)]">
                    Shared by {file.sharingUser.displayName}
                  </span>
                )}
                {file.owners?.[0] && activeTab !== 'shared' && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {file.owners[0].displayName}
                  </span>
                )}
                {file.modifiedTime && (
                  <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(file.modifiedTime).toLocaleDateString()}
                  </span>
                )}
                {file.size && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatBytes(parseInt(file.size))}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => onContextMenu(e, file)}
              className="p-2 rounded-full hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]"
            >
              <MoreVertical className="h-4 w-4 text-[var(--text-muted)]" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
