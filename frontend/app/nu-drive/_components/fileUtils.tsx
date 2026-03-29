// Shared file utility functions and icons for nu-drive

import React from 'react';
import {
  Folder,
  File,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileSpreadsheet,
  Presentation,
} from 'lucide-react';
import { DriveFile } from './types';

export function getFileIcon(mimeType: string) {
  if (mimeType === 'application/vnd.google-apps.folder') return <Folder className="h-8 w-8 text-warning-500" />;
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-success-500" />;
  if (mimeType.startsWith('video/')) return <Film className="h-8 w-8 text-accent-700" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-8 w-8 text-accent-700" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-8 w-8 text-success-600" />;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <Presentation className="h-8 w-8 text-warning-500" />;
  if (mimeType.includes('document') || mimeType.includes('word')) return <FileText className="h-8 w-8 text-accent-500" />;
  return <File className="h-8 w-8 text-[var(--text-muted)]" />;
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getPreviewUrl(file: DriveFile): string | null {
  const mimeType = file.mimeType;

  if (mimeType === 'application/vnd.google-apps.document') {
    return `https://docs.google.com/document/d/${file.id}/preview`;
  }
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    return `https://docs.google.com/spreadsheets/d/${file.id}/preview`;
  }
  if (mimeType === 'application/vnd.google-apps.presentation') {
    return `https://docs.google.com/presentation/d/${file.id}/preview`;
  }
  if (mimeType === 'application/vnd.google-apps.drawing') {
    return `https://docs.google.com/drawings/d/${file.id}/preview`;
  }
  if (mimeType === 'application/vnd.google-apps.form') {
    return `https://docs.google.com/forms/d/${file.id}/viewform`;
  }
  if (mimeType === 'application/pdf') {
    return `https://drive.google.com/file/d/${file.id}/preview`;
  }
  if (mimeType.startsWith('image/')) {
    return `https://drive.google.com/uc?id=${file.id}`;
  }
  if (mimeType.startsWith('video/')) {
    return `https://drive.google.com/file/d/${file.id}/preview`;
  }
  if (mimeType.startsWith('audio/')) {
    return `https://drive.google.com/file/d/${file.id}/preview`;
  }
  if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/javascript') {
    return null;
  }
  if (
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('presentation')
  ) {
    return `https://drive.google.com/file/d/${file.id}/preview`;
  }

  return `https://drive.google.com/file/d/${file.id}/preview`;
}
