'use client';

import React from 'react';
import { Star, Users, MoreVertical } from 'lucide-react';
import { DriveFile } from './types';
import { getFileIcon } from './fileUtils';

interface FileGridViewProps {
  files: DriveFile[];
  onFileClick: (file: DriveFile) => void;
  onContextMenu: (e: React.MouseEvent, file: DriveFile) => void;
}

export function FileGridView({ files, onFileClick, onContextMenu }: FileGridViewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {files.map((file) => (
        <div
          key={file.id}
          onClick={() => onFileClick(file)}
          onContextMenu={(e) => onContextMenu(e, file)}
          className="group p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-main)] hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all cursor-pointer relative"
        >
          <button
            onClick={(e) => onContextMenu(e, file)}
            className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-opacity"
          >
            <MoreVertical className="h-4 w-4 text-[var(--text-muted)]" />
          </button>
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 p-4 bg-[var(--bg-secondary)] rounded-xl group-hover:bg-primary-50 dark:group-hover:bg-primary-950/30 transition-colors">
              {getFileIcon(file.mimeType)}
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] truncate w-full">
              {file.name}
            </p>
            {file.modifiedTime && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {new Date(file.modifiedTime).toLocaleDateString()}
              </p>
            )}
            <div className="flex items-center gap-1 mt-1">
              {file.starred && (
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              )}
              {file.shared && (
                <Users className="h-3 w-3 text-[var(--text-muted)]" />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
