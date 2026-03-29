'use client';

import React from 'react';
import NextImage from 'next/image';
import {
  X,
  FolderPlus,
  Loader2,
  Share2,
  Check,
  Copy,
  Edit3,
  Download,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DriveFile } from './types';
import { getFileIcon, getPreviewUrl } from './fileUtils';
import { safeWindowOpen } from '@/lib/utils/url';

// ---- New Folder Modal ----
interface NewFolderModalProps {
  opened: boolean;
  newFolderName: string;
  creatingFolder: boolean;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onCreate: () => void;
}

export const NewFolderModal = React.memo(function NewFolderModal({
  opened,
  newFolderName,
  creatingFolder,
  onClose,
  onNameChange,
  onCreate,
}: NewFolderModalProps) {
  if (!opened) return null;

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
          <h3 className="font-semibold text-[var(--text-primary)]">Create New Folder</h3>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Folder Name
            </label>
            <Input
              value={newFolderName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter folder name"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onCreate}
              disabled={creatingFolder || !newFolderName.trim()}
              leftIcon={creatingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
            >
              {creatingFolder ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
});

// ---- Share Modal ----
interface ShareModalProps {
  opened: boolean;
  file: DriveFile | null;
  shareEmail: string;
  shareRole: 'reader' | 'writer' | 'commenter';
  sharing: boolean;
  shareSuccess: boolean;
  shareLink: string | null;
  linkCopied: boolean;
  onClose: () => void;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: 'reader' | 'writer' | 'commenter') => void;
  onShare: () => void;
  onGetShareableLink: () => void;
  onCopyLink: () => void;
}

export const ShareModal = React.memo(function ShareModal({
  opened,
  file,
  shareEmail,
  shareRole,
  sharing,
  shareSuccess,
  shareLink,
  linkCopied,
  onClose,
  onEmailChange,
  onRoleChange,
  onShare,
  onGetShareableLink,
  onCopyLink,
}: ShareModalProps) {
  if (!opened || !file) return null;

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
          <h3 className="font-semibold text-[var(--text-primary)]">Share &quot;{file.name}&quot;</h3>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {shareSuccess && (
            <div className="flex items-center gap-2 p-4 bg-success-50 dark:bg-success-950/30 text-success-600 dark:text-success-400 rounded-lg">
              <Check className="h-4 w-4" />
              <span className="text-sm">Shared successfully!</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Share with
            </label>
            <Input
              value={shareEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="Enter email address"
              type="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Permission
            </label>
            <select
              value={shareRole}
              onChange={(e) => onRoleChange(e.target.value as 'reader' | 'writer' | 'commenter')}
              className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)]"
            >
              <option value="reader">Viewer</option>
              <option value="commenter">Commenter</option>
              <option value="writer">Editor</option>
            </select>
          </div>

          <Button
            variant="primary"
            onClick={onShare}
            disabled={sharing || !shareEmail.trim()}
            leftIcon={sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            className="w-full"
          >
            {sharing ? 'Sharing...' : 'Share'}
          </Button>

          <div className="border-t border-[var(--border-main)] pt-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Get shareable link
            </label>
            {shareLink ? (
              <div className="flex items-center gap-2">
                <Input value={shareLink} readOnly className="flex-1" />
                <Button
                  variant="outline"
                  onClick={onCopyLink}
                  leftIcon={linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                >
                  {linkCopied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={onGetShareableLink} className="w-full">
                Generate Link
              </Button>
            )}
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Anyone with this link can view the file.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
});

// ---- Rename Modal ----
interface RenameModalProps {
  opened: boolean;
  file: DriveFile | null;
  renameValue: string;
  renaming: boolean;
  onClose: () => void;
  onRenameChange: (value: string) => void;
  onRename: () => void;
}

export const RenameModal = React.memo(function RenameModal({
  opened,
  file,
  renameValue,
  renaming,
  onClose,
  onRenameChange,
  onRename,
}: RenameModalProps) {
  if (!opened || !file) return null;

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
          <h3 className="font-semibold text-[var(--text-primary)]">Rename</h3>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              New name
            </label>
            <Input
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              placeholder="Enter new name"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onRename}
              disabled={renaming || !renameValue.trim()}
              leftIcon={renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
            >
              {renaming ? 'Renaming...' : 'Rename'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
});

// ---- File Preview Modal ----
interface FilePreviewModalProps {
  opened: boolean;
  file: DriveFile | null;
  previewLoading: boolean;
  previewContent: string | null;
  previewImgError: boolean;
  onClose: () => void;
  onDownload: (file: DriveFile) => void;
  onShare: (file: DriveFile) => void;
  onImgError: () => void;
}

export const FilePreviewModal = React.memo(function FilePreviewModal({
  opened,
  file,
  previewLoading,
  previewContent,
  previewImgError,
  onClose,
  onDownload,
  onShare,
  onImgError,
}: FilePreviewModalProps) {
  if (!opened || !file) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col z-50">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-[var(--bg-secondary)]/90 border-b border-[var(--border-main)]">
        <div className="flex items-center gap-4">
          {getFileIcon(file.mimeType)}
          <div>
            <h3 className="font-medium text-white truncate max-w-md">{file.name}</h3>
            {file.modifiedTime && (
              <p className="text-xs text-[var(--text-muted)]">
                Modified {new Date(file.modifiedTime).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {file.webContentLink && file.mimeType !== 'application/vnd.google-apps.folder' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownload(file)}
              className="text-white hover:bg-[var(--bg-secondary)]"
              leftIcon={<Download className="h-4 w-4" />}
            >
              Download
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShare(file)}
            className="text-white hover:bg-[var(--bg-secondary)]"
            leftIcon={<Share2 className="h-4 w-4" />}
          >
            Share
          </Button>
          {file.webViewLink && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => safeWindowOpen(file.webViewLink, '_blank')}
              className="text-white hover:bg-[var(--bg-secondary)]"
              leftIcon={<ExternalLink className="h-4 w-4" />}
            >
              Open in Drive
            </Button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-white ml-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {previewLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
            <p className="text-white">Loading preview...</p>
          </div>
        ) : previewContent ? (
          <div className="w-full h-full overflow-auto p-4">
            <pre className="bg-[var(--bg-secondary)] text-[var(--text-primary)] p-4 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-auto max-h-full">
              {previewContent}
            </pre>
          </div>
        ) : file.mimeType.startsWith('image/') ? (
          <div className="relative flex items-center justify-center w-full h-[calc(100vh-100px)]">
            {previewImgError || !getPreviewUrl(file) ? (
              <iframe
                src={`https://drive.google.com/file/d/${file.id}/preview`}
                className="w-full h-full rounded-lg"
                allow="autoplay"
                title={file.name}
              />
            ) : (
              <NextImage
                src={getPreviewUrl(file)!}
                alt={file.name}
                fill
                sizes="100vw"
                className="object-contain rounded-lg shadow-2xl"
                onError={onImgError}
              />
            )}
          </div>
        ) : (
          <iframe
            src={getPreviewUrl(file) || `https://drive.google.com/file/d/${file.id}/preview`}
            className="w-full h-full"
            allow="autoplay"
            style={{ border: 'none' }}
          />
        )}
      </div>
    </div>
  );
});

// ---- Delete Confirm ----
interface DeleteConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirm = React.memo(function DeleteConfirm({ isOpen, onClose, onConfirm }: DeleteConfirmProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete File"
      message="Are you sure you want to delete this file? This action cannot be undone."
      confirmText="Delete"
      cancelText="Cancel"
      type="danger"
    />
  );
});
