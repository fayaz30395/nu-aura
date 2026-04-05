'use client';

import React from 'react';
import {Download, Edit3, ExternalLink, File, Share2, Star, Trash2,} from 'lucide-react';
import {DriveFile} from './types';

interface FileContextMenuProps {
  file: DriveFile;
  position: { x: number; y: number };
  onOpen: (file: DriveFile) => void;
  onOpenInDrive: (file: DriveFile) => void;
  onDownload: (file: DriveFile) => void;
  onShare: (file: DriveFile) => void;
  onToggleStar: (file: DriveFile) => void;
  onRename: (file: DriveFile) => void;
  onDelete: (fileId: string) => void;
  menuRef: React.RefObject<HTMLDivElement>;
}

export function FileContextMenu({
                                  file,
                                  position,
                                  onOpen,
                                  onOpenInDrive,
                                  onDownload,
                                  onShare,
                                  onToggleStar,
                                  onRename,
                                  onDelete,
                                  menuRef,
                                }: FileContextMenuProps) {
  return (
    <div
      ref={menuRef}
      style={{left: position.x, top: position.y}}
      className="fixed z-50 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg shadow-[var(--shadow-dropdown)] py-1 min-w-[180px]"
    >
      {file.mimeType !== 'application/vnd.google-apps.folder' && (
        <button
          onClick={() => onOpen(file)}
          className="w-full px-4 py-2 text-left text-body-secondary hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
        >
          <File
            className="h-4 w-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
          Open
        </button>
      )}
      {file.webViewLink && (
        <button
          onClick={() => onOpenInDrive(file)}
          className="w-full px-4 py-2 text-left text-body-secondary hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
        >
          <ExternalLink
            className="h-4 w-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
          Open in Drive
        </button>
      )}
      {file.mimeType !== 'application/vnd.google-apps.folder' && file.webContentLink && (
        <button
          onClick={() => onDownload(file)}
          className="w-full px-4 py-2 text-left text-body-secondary hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
        >
          <Download
            className="h-4 w-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
          Download
        </button>
      )}
      <button
        onClick={() => onShare(file)}
        className="w-full px-4 py-2 text-left text-body-secondary hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
      >
        <Share2
          className="h-4 w-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
        Share
      </button>
      <button
        onClick={() => onToggleStar(file)}
        className="w-full px-4 py-2 text-left text-body-secondary hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
      >
        <Star className={`h-4 w-4 ${file.starred ? 'fill-warning-500 text-warning-500' : ''}`}/>
        {file.starred ? 'Remove star' : 'Add star'}
      </button>
      <button
        onClick={() => onRename(file)}
        className="w-full px-4 py-2 text-left text-body-secondary hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
      >
        <Edit3
          className="h-4 w-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
        Rename
      </button>
      <div className="border-t border-[var(--border-main)] dark:border-[var(--border-main)] my-1"/>
      <button
        onClick={() => onDelete(file.id)}
        className="w-full px-4 py-2 text-left text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950/30 flex items-center gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
      >
        <Trash2
          className="h-4 w-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"/>
        Delete
      </button>
    </div>
  );
}
