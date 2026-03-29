'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppLayout } from '@/components/layout';
import { Skeleton } from '@mantine/core';
import dynamic from 'next/dynamic';
import { useGoogleLogin } from '@react-oauth/google';
import { getGoogleToken, saveGoogleToken, clearGoogleToken } from '@/lib/utils/googleToken';
import { createLogger } from '@/lib/utils/logger';
import { safeWindowOpen } from '@/lib/utils/url';

import {
  DriveOAuthPanel,
  DriveToolbar,
  DriveEmptyState,
  FileGridView,
  FileListView,
  FileContextMenu,
  DriveFile,
  DriveFileMetadata,
  DriveStats,
  ViewTab,
} from './_components';

// Dynamic imports for Drive modals — only loaded on first open
const NewFolderModal = dynamic(
  () => import('./_components/DriveModals').then((m) => ({ default: m.NewFolderModal })),
  { loading: () => <Skeleton height={250} radius="md" />, ssr: false }
);
const ShareModal = dynamic(
  () => import('./_components/DriveModals').then((m) => ({ default: m.ShareModal })),
  { loading: () => <Skeleton height={350} radius="md" />, ssr: false }
);
const RenameModal = dynamic(
  () => import('./_components/DriveModals').then((m) => ({ default: m.RenameModal })),
  { loading: () => <Skeleton height={220} radius="md" />, ssr: false }
);
const FilePreviewModal = dynamic(
  () => import('./_components/DriveModals').then((m) => ({ default: m.FilePreviewModal })),
  { loading: () => <Skeleton height={600} radius="md" />, ssr: false }
);
const DeleteConfirm = dynamic(
  () => import('./_components/DriveModals').then((m) => ({ default: m.DeleteConfirm })),
  { loading: () => <Skeleton height={180} radius="md" />, ssr: false }
);

const log = createLogger('NuDrivePage');

function DriveContent() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [driveStats, setDriveStats] = useState<DriveStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([{ id: 'root', name: 'My Drive' }]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('my-drive');

  // Modal states
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'reader' | 'writer' | 'commenter'>('reader');
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextMenuFile, setContextMenuFile] = useState<DriveFile | null>(null);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewImgError, setPreviewImgError] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Save token using unified storage
  const saveToken = (token: string, expiresIn: number = 3600) => {
    saveGoogleToken(token, expiresIn);
    setAccessToken(token);
  };

  // Clear stored token using unified storage
  const clearToken = () => {
    clearGoogleToken();
    setAccessToken(null);
    setFiles([]);
    setDriveStats(null);
  };

  const getStoredToken = (): string | null => {
    return getGoogleToken();
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      saveToken(tokenResponse.access_token, tokenResponse.expires_in);
      setError(null);
      await loadDriveFiles(tokenResponse.access_token);
      await loadDriveStats(tokenResponse.access_token);
    },
    onError: (errorResponse) => {
      log.error('Google login error:', errorResponse);
      setError('Failed to connect to Google Drive. Please try again.');
    },
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata',
  });

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const uploadFileToDrive = async (file: File) => {
    if (!accessToken) return;

    try {
      setUploading(true);
      const metadata: DriveFileMetadata = {
        name: file.name,
        mimeType: file.type,
      };

      if (currentFolder !== 'root') {
        metadata.parents = [currentFolder];
      }

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });

      if (!response.ok) throw new Error('Upload failed');

      await loadDriveFiles(accessToken, currentFolder, activeTab);
      await loadDriveStats(accessToken);
    } catch (uploadError) {
      log.error('Upload error:', uploadError);
      setError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      uploadFileToDrive(e.target.files[0]);
    }
  };

  const createNewFolder = async () => {
    if (!accessToken || !newFolderName.trim()) return;

    try {
      setCreatingFolder(true);

      const metadata: DriveFileMetadata = {
        name: newFolderName.trim(),
        mimeType: 'application/vnd.google-apps.folder',
        parents: currentFolder !== 'root' ? [currentFolder] : ['root'],
      };

      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) throw new Error('Failed to create folder');

      setNewFolderName('');
      setShowNewFolderModal(false);
      await loadDriveFiles(accessToken, currentFolder, activeTab);
    } catch (folderError) {
      log.error('Create folder error:', folderError);
      setError('Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const shareFile = async () => {
    if (!accessToken || !selectedFile || !shareEmail.trim()) return;

    try {
      setSharing(true);

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${selectedFile.id}/permissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'user',
            role: shareRole,
            emailAddress: shareEmail.trim(),
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to share file');

      setShareSuccess(true);
      setShareEmail('');
      setTimeout(() => { setShareSuccess(false); }, 3000);
    } catch (shareError) {
      log.error('Share error:', shareError);
      setError('Failed to share file');
    } finally {
      setSharing(false);
    }
  };

  const getShareableLink = async () => {
    if (!accessToken || !selectedFile) return;

    try {
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${selectedFile.id}/permissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: 'anyone', role: 'reader' }),
        }
      );

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${selectedFile.id}?fields=webViewLink`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setShareLink(data.webViewLink);
      }
    } catch (linkError) {
      log.error('Error getting shareable link:', linkError);
    }
  };

  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const deleteFile = async (fileId: string) => {
    setFileToDelete(fileId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteFile = async () => {
    if (!accessToken || !fileToDelete) return;

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileToDelete}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) throw new Error('Failed to delete file');

      setFiles(files.filter(f => f.id !== fileToDelete));
      setShowContextMenu(false);
      setDeleteConfirmOpen(false);
      setFileToDelete(null);
    } catch (deleteError) {
      log.error('Delete error:', deleteError);
      setError('Failed to delete file');
    }
  };

  const renameFile = async () => {
    if (!accessToken || !contextMenuFile || !renameValue.trim()) return;

    try {
      setRenaming(true);

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${contextMenuFile.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: renameValue.trim() }),
        }
      );

      if (!response.ok) throw new Error('Failed to rename file');

      setFiles(files.map(f =>
        f.id === contextMenuFile.id ? { ...f, name: renameValue.trim() } : f
      ));
      setShowRenameModal(false);
      setRenameValue('');
    } catch (renameError) {
      log.error('Rename error:', renameError);
      setError('Failed to rename file');
    } finally {
      setRenaming(false);
    }
  };

  const toggleStar = async (file: DriveFile) => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ starred: !file.starred }),
        }
      );

      if (!response.ok) throw new Error('Failed to update star');

      setFiles(files.map(f =>
        f.id === file.id ? { ...f, starred: !f.starred } : f
      ));
      setShowContextMenu(false);
    } catch (starError) {
      log.error('Star toggle error:', starError);
    }
  };

  const openPreview = async (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      navigateToFolder(file.id, file.name);
      return;
    }

    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewContent(null);
    setPreviewImgError(false);
    setShowPreviewModal(true);

    if (file.mimeType.startsWith('text/') || file.mimeType === 'application/json' || file.mimeType === 'application/javascript') {
      try {
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (response.ok) {
          const text = await response.text();
          setPreviewContent(text);
        }
      } catch (previewError) {
        log.error('Error fetching text content:', previewError);
      }
    }

    setPreviewLoading(false);
  };

  const downloadFile = async (file: DriveFile) => {
    if (!accessToken || !file.webContentLink) return;

    try {
      const response = await fetch(file.webContentLink, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (_downloadError) {
      if (file.webViewLink) {
        safeWindowOpen(file.webViewLink, '_blank');
      }
    }

    setShowContextMenu(false);
  };

  // Check for stored token on mount
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    const storedToken = getStoredToken();
    if (storedToken) {
      setAccessToken(storedToken);
      loadDriveFiles(storedToken);
      loadDriveStats(storedToken);
    } else {
      setIsLoading(false);
    }
    // loadDriveFiles and loadDriveStats are intentionally omitted: they take
    // token/folder params (not React state) and including them without useCallback
    // would cause an infinite re-render loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, isAuthenticated, router]);

  const loadDriveFiles = async (token: string, folderId: string = 'root', tab: ViewTab = 'my-drive') => {
    try {
      setIsLoading(true);

      let query = '';
      let orderBy = 'folder,name';

      switch (tab) {
        case 'my-drive':
          query = folderId === 'root'
            ? "'root' in parents and trashed = false"
            : `'${folderId}' in parents and trashed = false`;
          break;
        case 'shared':
          query = "sharedWithMe = true and trashed = false";
          orderBy = 'modifiedTime desc';
          break;
        case 'starred':
          query = "starred = true and trashed = false";
          orderBy = 'modifiedTime desc';
          break;
        case 'recent':
          query = "trashed = false";
          orderBy = 'viewedByMeTime desc,modifiedTime desc';
          break;
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime,iconLink,webViewLink,webContentLink,owners,shared,starred,sharingUser,permissions)&orderBy=${orderBy}&pageSize=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        if (response.status === 401) {
          clearToken();
          setError('Session expired. Please reconnect to Google Drive.');
          return;
        }
        throw new Error('Failed to fetch files');
      }

      const data = await response.json();
      setFiles(data.files || []);
      setError(null);
    } catch (err) {
      log.error('Error loading Drive files:', err);
      setError('Failed to load files from Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDriveStats = async (token: string) => {
    try {
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/about?fields=storageQuota',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Failed to fetch storage info');

      const data = await response.json();
      setDriveStats({
        used: parseInt(data.storageQuota?.usage || '0'),
        limit: parseInt(data.storageQuota?.limit || '0'),
        usedInDrive: parseInt(data.storageQuota?.usageInDrive || '0'),
        usedInTrash: parseInt(data.storageQuota?.usageInTrash || '0'),
      });
    } catch (err) {
      log.error('Error loading storage stats:', err);
    }
  };

  const handleTabChange = async (tab: ViewTab) => {
    setActiveTab(tab);

    if (tab !== 'my-drive') {
      setCurrentFolder('root');
      setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
    }

    if (accessToken) {
      await loadDriveFiles(accessToken, 'root', tab);
    }
  };

  const navigateToFolder = async (folderId: string, folderName: string) => {
    if (!accessToken) return;

    setCurrentFolder(folderId);

    if (activeTab !== 'my-drive') {
      setActiveTab('my-drive');
      setBreadcrumbs([{ id: 'root', name: 'My Drive' }, { id: folderId, name: folderName }]);
    } else {
      const existingIndex = breadcrumbs.findIndex(b => b.id === folderId);
      if (existingIndex >= 0) {
        setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1));
      } else {
        setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
      }
    }

    await loadDriveFiles(accessToken, folderId, 'my-drive');
  };

  const handleFileClick = (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      navigateToFolder(file.id, file.name);
    } else {
      openPreview(file);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, file: DriveFile) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuFile(file);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const openShareModal = (file: DriveFile) => {
    setSelectedFile(file);
    setShareEmail('');
    setShareLink(null);
    setShareSuccess(false);
    setShowShareModal(true);
    setShowContextMenu(false);
  };

  const openRenameModal = (file: DriveFile) => {
    setContextMenuFile(file);
    setRenameValue(file.name);
    setShowRenameModal(true);
    setShowContextMenu(false);
  };

  const refreshFiles = async () => {
    if (accessToken) {
      await loadDriveFiles(accessToken, currentFolder, activeTab);
    }
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading && !accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)]">
        <div className="skeuo-card p-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-200 border-t-accent-500 rounded-full animate-spin" />
          <p className="text-[var(--text-muted)] font-medium">Loading NU-Drive...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      activeMenuItem="nu-drive"
      breadcrumbs={[{ label: 'NU-Drive', href: '/nu-drive' }]}
    >
      <div className="space-y-6">
        {/* Header + OAuth Panel */}
        <DriveOAuthPanel
          isConnected={!!accessToken}
          uploading={uploading}
          error={error}
          onConnect={() => googleLogin()}
          onNewFolder={() => setShowNewFolderModal(true)}
          onFileSelect={handleFileSelect}
          onRefresh={refreshFiles}
          onDisconnect={clearToken}
        />

        {accessToken && (
          <>
            {/* Toolbar: storage stats, tabs, search, breadcrumbs */}
            <DriveToolbar
              searchQuery={searchQuery}
              viewMode={viewMode}
              activeTab={activeTab}
              breadcrumbs={breadcrumbs}
              driveStats={driveStats}
              onSearchChange={setSearchQuery}
              onViewModeChange={setViewMode}
              onTabChange={handleTabChange}
              onNavigateToFolder={navigateToFolder}
              onNewFolder={() => setShowNewFolderModal(true)}
              onFileSelect={handleFileSelect}
            />

            {/* File Area */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-accent-200 border-t-accent-500 rounded-full animate-spin" />
                  <p className="text-[var(--text-muted)]">Loading files...</p>
                </div>
              </div>
            ) : filteredFiles.length === 0 ? (
              <DriveEmptyState
                searchQuery={searchQuery}
                activeTab={activeTab}
                onNewFolder={() => setShowNewFolderModal(true)}
                onFileSelect={handleFileSelect}
              />
            ) : viewMode === 'grid' ? (
              <FileGridView
                files={filteredFiles}
                onFileClick={handleFileClick}
                onContextMenu={handleContextMenu}
              />
            ) : (
              <FileListView
                files={filteredFiles}
                activeTab={activeTab}
                onFileClick={handleFileClick}
                onContextMenu={handleContextMenu}
              />
            )}
          </>
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu && contextMenuFile && (
        <FileContextMenu
          file={contextMenuFile}
          position={contextMenuPos}
          menuRef={contextMenuRef}
          onOpen={(file) => { openPreview(file); setShowContextMenu(false); }}
          onOpenInDrive={(file) => { safeWindowOpen(file.webViewLink, '_blank'); setShowContextMenu(false); }}
          onDownload={downloadFile}
          onShare={openShareModal}
          onToggleStar={toggleStar}
          onRename={openRenameModal}
          onDelete={deleteFile}
        />
      )}

      {/* Modals */}
      <NewFolderModal
        opened={showNewFolderModal}
        newFolderName={newFolderName}
        creatingFolder={creatingFolder}
        onClose={() => { setShowNewFolderModal(false); setNewFolderName(''); }}
        onNameChange={setNewFolderName}
        onCreate={createNewFolder}
      />

      <ShareModal
        opened={showShareModal}
        file={selectedFile}
        shareEmail={shareEmail}
        shareRole={shareRole}
        sharing={sharing}
        shareSuccess={shareSuccess}
        shareLink={shareLink}
        linkCopied={linkCopied}
        onClose={() => setShowShareModal(false)}
        onEmailChange={setShareEmail}
        onRoleChange={setShareRole}
        onShare={shareFile}
        onGetShareableLink={getShareableLink}
        onCopyLink={copyLink}
      />

      <RenameModal
        opened={showRenameModal}
        file={contextMenuFile}
        renameValue={renameValue}
        renaming={renaming}
        onClose={() => { setShowRenameModal(false); setRenameValue(''); }}
        onRenameChange={setRenameValue}
        onRename={renameFile}
      />

      <FilePreviewModal
        opened={showPreviewModal}
        file={previewFile}
        previewLoading={previewLoading}
        previewContent={previewContent}
        previewImgError={previewImgError}
        onClose={() => { setShowPreviewModal(false); setPreviewFile(null); setPreviewContent(null); }}
        onDownload={downloadFile}
        onShare={openShareModal}
        onImgError={() => setPreviewImgError(true)}
      />

      <DeleteConfirm
        isOpen={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setFileToDelete(null); }}
        onConfirm={confirmDeleteFile}
      />
    </AppLayout>
  );
}

export default function NuDrivePage() {
  return <DriveContent />;
}
