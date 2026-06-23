/**
 * Pure presentation helpers shared by the operator dashboard `page.tsx` and its
 * extracted sub-components. Moved verbatim out of `page.tsx` (no behaviour change):
 * `formatRelativeTime` is used by both the notifications widget and the email modal;
 * `getPreviewUrl` by the Drive modal.
 */
import {formatDateShort} from '@/lib/utils/format/date';

/** Relative "Xm/Xh/Xd ago" label; falls back to a short date past a week. */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateShort(date);
}

/** Google Drive preview URL for a file by mime type. */
export function getPreviewUrl(file: {id: string; mimeType: string}): string | null {
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
  if (mimeType === 'application/pdf') {
    return `https://drive.google.com/file/d/${file.id}/preview`;
  }
  if (mimeType?.startsWith('image/')) {
    return `https://drive.google.com/uc?id=${file.id}`;
  }
  if (mimeType?.startsWith('video/')) {
    return `https://drive.google.com/file/d/${file.id}/preview`;
  }
  return `https://drive.google.com/file/d/${file.id}/preview`;
}
