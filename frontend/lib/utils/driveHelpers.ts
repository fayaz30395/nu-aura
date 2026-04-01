/**
 * Shared Drive Utilities for NU-Drive and NU-Fluence Drive
 * Extracted common functions for both integrations
 */

/**
 * Format bytes into human-readable file size
 * @example
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1048576) // "1 MB"
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get human-readable label for MIME type
 */
export const getMimeTypeLabel = (mimeType: string): string => {
  if (mimeType === 'application/vnd.google-apps.folder') return 'Folder';
  if (mimeType === 'application/vnd.google-apps.document') return 'Google Doc';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'Google Sheet';
  if (mimeType === 'application/vnd.google-apps.presentation') return 'Google Slides';
  if (mimeType === 'application/vnd.google-apps.drawing') return 'Google Drawing';
  if (mimeType === 'application/vnd.google-apps.form') return 'Google Form';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Word Document';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Excel Sheet';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'PowerPoint';
  if (mimeType.startsWith('text/')) return 'Text File';
  return 'File';
};

/**
 * Get preview URL for a Google Drive file based on MIME type
 * Returns null for files that don't support preview
 */
export const getPreviewUrl = (fileId: string, mimeType: string): string | null => {
  // Google Docs types - use preview links
  if (mimeType === 'application/vnd.google-apps.document') {
    return `https://docs.google.com/document/d/${fileId}/preview`;
  }
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    return `https://docs.google.com/spreadsheets/d/${fileId}/preview`;
  }
  if (mimeType === 'application/vnd.google-apps.presentation') {
    return `https://docs.google.com/presentation/d/${fileId}/preview`;
  }
  if (mimeType === 'application/vnd.google-apps.drawing') {
    return `https://docs.google.com/drawings/d/${fileId}/preview`;
  }
  if (mimeType === 'application/vnd.google-apps.form') {
    return `https://docs.google.com/forms/d/${fileId}/viewform`;
  }

  // PDFs
  if (mimeType === 'application/pdf') {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  // Images - direct download/view
  if (mimeType.startsWith('image/')) {
    return `https://drive.google.com/uc?id=${fileId}`;
  }

  // Videos
  if (mimeType.startsWith('video/')) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  // Audio
  if (mimeType.startsWith('audio/')) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  // Text files - fetch content instead
  if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/javascript') {
    return null;
  }

  // Office files (Word, Excel, PowerPoint) - use Google's viewer
  if (
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('presentation')
  ) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  // Default: try Google Drive preview
  return `https://drive.google.com/file/d/${fileId}/preview`;
};

/**
 * Check if file type supports inline preview
 */
export const isPreviewable = (mimeType: string): boolean => {
  // Folders don't have preview
  if (mimeType === 'application/vnd.google-apps.folder') return false;

  // Supported types
  const supportedTypes = [
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.presentation',
    'application/vnd.google-apps.drawing',
    'application/vnd.google-apps.form',
    'application/pdf',
    'image/',
    'video/',
    'audio/',
    'text/',
    'application/json',
    'application/javascript',
    'word',
    'excel',
    'powerpoint',
  ];

  return supportedTypes.some(type => mimeType.includes(type) || mimeType.startsWith(type));
};
