'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  HardDrive,
  Folder,
  File,
  FileText,
  Image,
  Film,
  Music,
  FileSpreadsheet,
  Presentation,
  Search,
  Grid,
  List,
  Star,
  Clock,
  Users,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  Loader2,
  FolderPlus,
  Share2,
  Download,
  Trash2,
  MoreVertical,
  X,
  Copy,
  Check,
  Edit3,
  FolderOpen,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useGoogleLogin } from '@react-oauth/google';
import { getGoogleToken, saveGoogleToken, clearGoogleToken } from '@/lib/utils/googleToken';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  owners?: { displayName: string; emailAddress?: string; photoLink?: string }[];
  shared?: boolean;
  starred?: boolean;
  sharingUser?: { displayName: string; emailAddress?: string };
  permissions?: { type: string; role: string; emailAddress?: string }[];
}

interface DriveStats {
  used: number;
  limit: number;
  usedInDrive: number;
  usedInTrash: number;
}

type ViewTab = 'my-drive' | 'shared' | 'starred' | 'recent';

function DriveContent() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
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

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Save token using unified storage (also saves to Drive-specific keys for compatibility)
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

  // Check if stored token is still valid (uses unified token from SSO login)
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
      console.error('Google login error:', errorResponse);
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
      const metadata: any = {
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
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      });

      if (!response.ok) throw new Error('Upload failed');

      // Refresh list
      await loadDriveFiles(accessToken, currentFolder, activeTab);
      await loadDriveStats(accessToken);

    } catch (error) {
      console.error('Upload error:', error);
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

  // Create new folder
  const createNewFolder = async () => {
    if (!accessToken || !newFolderName.trim()) return;

    try {
      setCreatingFolder(true);

      const metadata: any = {
        name: newFolderName.trim(),
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (currentFolder !== 'root') {
        metadata.parents = [currentFolder];
      } else {
        metadata.parents = ['root'];
      }

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

      // Refresh list
      await loadDriveFiles(accessToken, currentFolder, activeTab);

    } catch (error) {
      console.error('Create folder error:', error);
      setError('Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  // Share file
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

      // Refresh file list
      setTimeout(() => {
        setShareSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Share error:', error);
      setError('Failed to share file');
    } finally {
      setSharing(false);
    }
  };

  // Get shareable link
  const getShareableLink = async () => {
    if (!accessToken || !selectedFile) return;

    try {
      // First, make the file accessible via link
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${selectedFile.id}/permissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'anyone',
            role: 'reader',
          }),
        }
      );

      // Get the file with webViewLink
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${selectedFile.id}?fields=webViewLink`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setShareLink(data.webViewLink);
      }

    } catch (error) {
      console.error('Error getting shareable link:', error);
    }
  };

  // Copy link to clipboard
  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // Delete file
  const deleteFile = async (fileId: string) => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) throw new Error('Failed to delete file');

      // Remove from local state
      setFiles(files.filter(f => f.id !== fileId));
      setShowContextMenu(false);

    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete file');
    }
  };

  // Rename file
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

      // Update local state
      setFiles(files.map(f =>
        f.id === contextMenuFile.id ? { ...f, name: renameValue.trim() } : f
      ));

      setShowRenameModal(false);
      setRenameValue('');

    } catch (error) {
      console.error('Rename error:', error);
      setError('Failed to rename file');
    } finally {
      setRenaming(false);
    }
  };

  // Toggle star
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

      // Update local state
      setFiles(files.map(f =>
        f.id === file.id ? { ...f, starred: !f.starred } : f
      ));
      setShowContextMenu(false);

    } catch (error) {
      console.error('Star toggle error:', error);
    }
  };

  // Get preview URL for a file
  const getPreviewUrl = (file: DriveFile): string | null => {
    const mimeType = file.mimeType;

    // Google Docs types - use export/preview links
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

    // PDFs
    if (mimeType === 'application/pdf') {
      return `https://drive.google.com/file/d/${file.id}/preview`;
    }

    // Images
    if (mimeType.startsWith('image/')) {
      return `https://drive.google.com/uc?id=${file.id}`;
    }

    // Videos
    if (mimeType.startsWith('video/')) {
      return `https://drive.google.com/file/d/${file.id}/preview`;
    }

    // Audio
    if (mimeType.startsWith('audio/')) {
      return `https://drive.google.com/file/d/${file.id}/preview`;
    }

    // Text files - fetch content
    if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/javascript') {
      return null; // Will fetch content instead
    }

    // Office files (Word, Excel, PowerPoint) - use Google's viewer
    if (
      mimeType.includes('word') ||
      mimeType.includes('excel') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('powerpoint') ||
      mimeType.includes('presentation')
    ) {
      return `https://drive.google.com/file/d/${file.id}/preview`;
    }

    // Default: try Google Drive preview
    return `https://drive.google.com/file/d/${file.id}/preview`;
  };

  // Check if file type supports inline preview
  const supportsPreview = (mimeType: string): boolean => {
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

  // Open file preview
  const openPreview = async (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      navigateToFolder(file.id, file.name);
      return;
    }

    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewContent(null);
    setShowPreviewModal(true);

    // For text files, fetch the content
    if (file.mimeType.startsWith('text/') || file.mimeType === 'application/json' || file.mimeType === 'application/javascript') {
      try {
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (response.ok) {
          const text = await response.text();
          setPreviewContent(text);
        }
      } catch (err) {
        console.error('Error fetching text content:', err);
      }
    }

    setPreviewLoading(false);
  };

  // Download file
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

    } catch (error) {
      // Fall back to opening in new tab
      if (file.webViewLink) {
        window.open(file.webViewLink, '_blank');
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
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
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
      console.error('Error loading Drive files:', err);
      setError('Failed to load files from Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDriveStats = async (token: string) => {
    try {
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/about?fields=storageQuota',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch storage info');
      }

      const data = await response.json();
      setDriveStats({
        used: parseInt(data.storageQuota?.usage || '0'),
        limit: parseInt(data.storageQuota?.limit || '0'),
        usedInDrive: parseInt(data.storageQuota?.usageInDrive || '0'),
        usedInTrash: parseInt(data.storageQuota?.usageInTrash || '0'),
      });
    } catch (err) {
      console.error('Error loading storage stats:', err);
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

    // If coming from shared/starred/recent view, reset breadcrumbs for the shared folder
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

    // Load folder contents - for shared folders, we query by parent ID
    await loadDriveFiles(accessToken, folderId, 'my-drive');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') return <Folder className="h-8 w-8 text-yellow-500" />;
    if (mimeType.startsWith('image/')) return <Image className="h-8 w-8 text-green-500" />;
    if (mimeType.startsWith('video/')) return <Film className="h-8 w-8 text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-8 w-8 text-pink-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <Presentation className="h-8 w-8 text-orange-500" />;
    if (mimeType.includes('document') || mimeType.includes('word')) return <FileText className="h-8 w-8 text-blue-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileClick = (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      navigateToFolder(file.id, file.name);
    } else {
      // Open file in inline preview
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

  const handleConnectClick = () => {
    googleLogin();
  };

  if (isLoading && !accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-100 dark:bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-surface-500 font-medium">Loading NU-Drive...</p>
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
              <HardDrive className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">NU-Drive</h1>
              <p className="text-sm text-surface-500">Your organization's Google Drive</p>
            </div>
          </div>
          {!accessToken ? (
            <Button
              variant="primary"
              onClick={handleConnectClick}
              leftIcon={<HardDrive className="h-4 w-4" />}
            >
              Connect Google Drive
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewFolderModal(true)}
                leftIcon={<FolderPlus className="h-4 w-4" />}
              >
                New Folder
              </Button>
              <label>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                <div className={`cursor-pointer inline-flex items-center gap-2 h-8 px-3 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  <span>Upload</span>
                </div>
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshFiles}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearToken}
                className="text-surface-500 hover:text-red-600"
              >
                Disconnect
              </Button>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
                <Button variant="ghost" size="sm" onClick={handleConnectClick} className="ml-auto">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!accessToken ? (
          /* Connect Card */
          <Card className="border-2 border-dashed border-surface-300 dark:border-surface-700">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-6">
                  <HardDrive className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50 mb-2">
                  Connect to Google Drive
                </h2>
                <p className="text-surface-500 mb-6 max-w-md mx-auto">
                  Access your organization's Google Drive files directly within NuLogic.
                  View, search, upload, share, and manage your documents all in one place.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleConnectClick}
                  leftIcon={<HardDrive className="h-5 w-5" />}
                >
                  Connect Google Drive
                </Button>
                <p className="text-xs text-surface-400 mt-4">
                  You'll be asked to grant access to your Google Drive files.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Storage Stats */}
            {driveStats && driveStats.limit > 0 && (
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Storage Used</span>
                    <span className="text-sm text-surface-500">
                      {formatBytes(driveStats.used)} of {formatBytes(driveStats.limit)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((driveStats.used / driveStats.limit) * 100, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-surface-200 dark:border-surface-700">
              <button
                onClick={() => handleTabChange('my-drive')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'my-drive'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                }`}
              >
                <FolderOpen className="h-4 w-4" />
                My Drive
              </button>
              <button
                onClick={() => handleTabChange('shared')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'shared'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                }`}
              >
                <Users className="h-4 w-4" />
                Shared with me
              </button>
              <button
                onClick={() => handleTabChange('starred')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'starred'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                }`}
              >
                <Star className="h-4 w-4" />
                Starred
              </button>
              <button
                onClick={() => handleTabChange('recent')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'recent'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                }`}
              >
                <Clock className="h-4 w-4" />
                Recent
              </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-primary-50 dark:bg-primary-950 text-primary-600' : 'text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-800'}`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-primary-50 dark:bg-primary-950 text-primary-600' : 'text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-800'}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Breadcrumbs */}
            {activeTab === 'my-drive' && breadcrumbs.length > 1 && (
              <div className="flex items-center gap-2 text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.id}>
                    {index > 0 && <span className="text-surface-400">/</span>}
                    <button
                      onClick={() => navigateToFolder(crumb.id, crumb.name)}
                      className={`hover:text-primary-600 ${index === breadcrumbs.length - 1
                          ? 'text-surface-900 dark:text-surface-50 font-medium'
                          : 'text-surface-500'
                        }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                  <p className="text-surface-500">Loading files...</p>
                </div>
              </div>
            ) : filteredFiles.length === 0 ? (
              /* Empty State */
              <Card>
                <CardContent className="py-16">
                  <div className="text-center">
                    <Folder className="h-16 w-16 text-surface-300 dark:text-surface-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-surface-900 dark:text-surface-50 mb-2">
                      {searchQuery ? 'No files found' :
                       activeTab === 'shared' ? 'No files shared with you' :
                       activeTab === 'starred' ? 'No starred files' :
                       activeTab === 'recent' ? 'No recent files' :
                       'This folder is empty'}
                    </h3>
                    <p className="text-surface-500">
                      {searchQuery
                        ? 'Try adjusting your search query'
                        : activeTab === 'my-drive'
                          ? 'Upload files or create a new folder'
                          : 'Files will appear here when available'}
                    </p>
                    {activeTab === 'my-drive' && !searchQuery && (
                      <div className="flex items-center justify-center gap-3 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowNewFolderModal(true)}
                          leftIcon={<FolderPlus className="h-4 w-4" />}
                        >
                          New Folder
                        </Button>
                        <label className="cursor-pointer">
                          <input type="file" className="hidden" onChange={handleFileSelect} />
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">
                            <UploadCloud className="h-4 w-4" />
                            Upload File
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                    className="group p-4 bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all cursor-pointer relative"
                  >
                    <button
                      onClick={(e) => handleContextMenu(e, file)}
                      className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-surface-100 dark:hover:bg-surface-800 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4 text-surface-500" />
                    </button>
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl group-hover:bg-primary-50 dark:group-hover:bg-primary-950/30 transition-colors">
                        {getFileIcon(file.mimeType)}
                      </div>
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-50 truncate w-full">
                        {file.name}
                      </p>
                      {file.modifiedTime && (
                        <p className="text-xs text-surface-400 mt-1">
                          {new Date(file.modifiedTime).toLocaleDateString()}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        {file.starred && (
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        )}
                        {file.shared && (
                          <Users className="h-3 w-3 text-surface-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <Card>
                <div className="divide-y divide-surface-100 dark:divide-surface-800">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => handleFileClick(file)}
                      onContextMenu={(e) => handleContextMenu(e, file)}
                      className="flex items-center gap-4 p-4 hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {getFileIcon(file.mimeType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">
                            {file.name}
                          </p>
                          {file.starred && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                          )}
                          {file.shared && (
                            <Users className="h-4 w-4 text-surface-400 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          {activeTab === 'shared' && file.sharingUser && (
                            <span className="text-xs text-surface-500">
                              Shared by {file.sharingUser.displayName}
                            </span>
                          )}
                          {file.owners?.[0] && activeTab !== 'shared' && (
                            <span className="text-xs text-surface-500">
                              {file.owners[0].displayName}
                            </span>
                          )}
                          {file.modifiedTime && (
                            <span className="text-xs text-surface-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(file.modifiedTime).toLocaleDateString()}
                            </span>
                          )}
                          {file.size && (
                            <span className="text-xs text-surface-400">
                              {formatBytes(parseInt(file.size))}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleContextMenu(e, file)}
                        className="p-2 rounded-full hover:bg-surface-100 dark:hover:bg-surface-700"
                      >
                        <MoreVertical className="h-4 w-4 text-surface-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu && contextMenuFile && (
        <div
          ref={contextMenuRef}
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          className="fixed z-50 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg py-1 min-w-[180px]"
        >
          {contextMenuFile.mimeType !== 'application/vnd.google-apps.folder' && (
            <button
              onClick={() => {
                openPreview(contextMenuFile);
                setShowContextMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-3"
            >
              <File className="h-4 w-4" />
              Open
            </button>
          )}
          {contextMenuFile.webViewLink && (
            <button
              onClick={() => {
                window.open(contextMenuFile.webViewLink, '_blank');
                setShowContextMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-3"
            >
              <ExternalLink className="h-4 w-4" />
              Open in Drive
            </button>
          )}
          {contextMenuFile.mimeType !== 'application/vnd.google-apps.folder' && contextMenuFile.webContentLink && (
            <button
              onClick={() => downloadFile(contextMenuFile)}
              className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-3"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          )}
          <button
            onClick={() => openShareModal(contextMenuFile)}
            className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-3"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            onClick={() => toggleStar(contextMenuFile)}
            className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-3"
          >
            <Star className={`h-4 w-4 ${contextMenuFile.starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
            {contextMenuFile.starred ? 'Remove star' : 'Add star'}
          </button>
          <button
            onClick={() => openRenameModal(contextMenuFile)}
            className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-3"
          >
            <Edit3 className="h-4 w-4" />
            Rename
          </button>
          <div className="border-t border-surface-100 dark:border-surface-700 my-1" />
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this file?')) {
                deleteFile(contextMenuFile.id);
              } else {
                setShowContextMenu(false);
              }
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-3"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-surface-100 dark:border-surface-800">
              <h3 className="font-semibold text-surface-900 dark:text-surface-50">Create New Folder</h3>
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName('');
                }}
                className="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Folder Name
                </label>
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowNewFolderModal(false);
                    setNewFolderName('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={createNewFolder}
                  disabled={creatingFolder || !newFolderName.trim()}
                  leftIcon={creatingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
                >
                  {creatingFolder ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-surface-100 dark:border-surface-800">
              <h3 className="font-semibold text-surface-900 dark:text-surface-50">Share "{selectedFile.name}"</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {shareSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-lg">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Shared successfully!</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Share with
                </label>
                <Input
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Enter email address"
                  type="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Permission
                </label>
                <select
                  value={shareRole}
                  onChange={(e) => setShareRole(e.target.value as 'reader' | 'writer' | 'commenter')}
                  className="w-full px-3 py-2 border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-50"
                >
                  <option value="reader">Viewer</option>
                  <option value="commenter">Commenter</option>
                  <option value="writer">Editor</option>
                </select>
              </div>

              <Button
                variant="primary"
                onClick={shareFile}
                disabled={sharing || !shareEmail.trim()}
                leftIcon={sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                className="w-full"
              >
                {sharing ? 'Sharing...' : 'Share'}
              </Button>

              <div className="border-t border-surface-100 dark:border-surface-800 pt-4">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Get shareable link
                </label>
                {shareLink ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={shareLink}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={copyLink}
                      leftIcon={linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    >
                      {linkCopied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={getShareableLink}
                    className="w-full"
                  >
                    Generate Link
                  </Button>
                )}
                <p className="text-xs text-surface-500 mt-2">
                  Anyone with this link can view the file.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && contextMenuFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-surface-100 dark:border-surface-800">
              <h3 className="font-semibold text-surface-900 dark:text-surface-50">Rename</h3>
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setRenameValue('');
                }}
                className="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  New name
                </label>
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="Enter new name"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowRenameModal(false);
                    setRenameValue('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={renameFile}
                  disabled={renaming || !renameValue.trim()}
                  leftIcon={renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
                >
                  {renaming ? 'Renaming...' : 'Rename'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* File Preview Modal */}
      {showPreviewModal && previewFile && (
        <div className="fixed inset-0 bg-black/80 flex flex-col z-50">
          {/* Preview Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-surface-900/90 border-b border-surface-700">
            <div className="flex items-center gap-3">
              {getFileIcon(previewFile.mimeType)}
              <div>
                <h3 className="font-medium text-white truncate max-w-md">{previewFile.name}</h3>
                {previewFile.modifiedTime && (
                  <p className="text-xs text-surface-400">
                    Modified {new Date(previewFile.modifiedTime).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {previewFile.webContentLink && previewFile.mimeType !== 'application/vnd.google-apps.folder' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadFile(previewFile)}
                  className="text-white hover:bg-surface-700"
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Download
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openShareModal(previewFile)}
                className="text-white hover:bg-surface-700"
                leftIcon={<Share2 className="h-4 w-4" />}
              >
                Share
              </Button>
              {previewFile.webViewLink && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(previewFile.webViewLink, '_blank')}
                  className="text-white hover:bg-surface-700"
                  leftIcon={<ExternalLink className="h-4 w-4" />}
                >
                  Open in Drive
                </Button>
              )}
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewFile(null);
                  setPreviewContent(null);
                }}
                className="p-2 rounded-full hover:bg-surface-700 text-white ml-2"
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
              // Text content preview
              <div className="w-full h-full overflow-auto p-4">
                <pre className="bg-surface-900 text-surface-100 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-auto max-h-full">
                  {previewContent}
                </pre>
              </div>
            ) : previewFile.mimeType.startsWith('image/') ? (
              // Image preview - direct display
              <div className="flex items-center justify-center p-4 max-h-full max-w-full overflow-auto">
                <img
                  src={getPreviewUrl(previewFile) || ''}
                  alt={previewFile.name}
                  className="max-h-[calc(100vh-100px)] max-w-full object-contain rounded-lg shadow-2xl"
                  onError={(e) => {
                    // Fallback to iframe if direct image fails
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const iframe = document.createElement('iframe');
                      iframe.src = `https://drive.google.com/file/d/${previewFile.id}/preview`;
                      iframe.className = 'w-full h-[calc(100vh-100px)] rounded-lg';
                      iframe.allow = 'autoplay';
                      parent.appendChild(iframe);
                    }
                  }}
                />
              </div>
            ) : (
              // iframe preview for documents, videos, PDFs, etc.
              <iframe
                src={getPreviewUrl(previewFile) || `https://drive.google.com/file/d/${previewFile.id}/preview`}
                className="w-full h-full"
                allow="autoplay"
                style={{ border: 'none' }}
              />
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function NuDrivePage() {
  return <DriveContent />;
}
