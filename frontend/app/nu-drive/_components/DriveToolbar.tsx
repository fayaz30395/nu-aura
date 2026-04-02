'use client';

import React from 'react';
import {
  Search,
  Grid,
  List,
  FolderOpen,
  Users,
  Star,
  Clock,
  FolderPlus,
  UploadCloud,
  Folder,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { DriveStats, ViewTab } from './types';
import { formatBytes } from './fileUtils';

interface DriveToolbarProps {
  searchQuery: string;
  viewMode: 'grid' | 'list';
  activeTab: ViewTab;
  breadcrumbs: { id: string; name: string }[];
  driveStats: DriveStats | null;
  onSearchChange: (query: string) => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onTabChange: (tab: ViewTab) => void;
  onNavigateToFolder: (folderId: string, folderName: string) => void;
  onNewFolder: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function DriveToolbar({
  searchQuery,
  viewMode,
  activeTab,
  breadcrumbs,
  driveStats,
  onSearchChange,
  onViewModeChange,
  onTabChange,
  onNavigateToFolder,
  onNewFolder,
  onFileSelect,
}: DriveToolbarProps) {
  return (
    <>
      {/* Storage Stats */}
      {driveStats && driveStats.limit > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="row-between mb-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">Storage Used</span>
              <span className="text-body-muted">
                {formatBytes(driveStats.used)} of {formatBytes(driveStats.limit)}
              </span>
            </div>
            <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-500 to-success-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((driveStats.used / driveStats.limit) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border-main)]">
        <button
          onClick={() => onTabChange('my-drive')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'my-drive'
              ? 'border-accent-500 text-accent-700 dark:text-accent-400'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]'
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          My Drive
        </button>
        <button
          onClick={() => onTabChange('shared')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'shared'
              ? 'border-accent-500 text-accent-700 dark:text-accent-400'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]'
          }`}
        >
          <Users className="h-4 w-4" />
          Shared with me
        </button>
        <button
          onClick={() => onTabChange('starred')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'starred'
              ? 'border-accent-500 text-accent-700 dark:text-accent-400'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]'
          }`}
        >
          <Star className="h-4 w-4" />
          Starred
        </button>
        <button
          onClick={() => onTabChange('recent')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'recent'
              ? 'border-accent-500 text-accent-700 dark:text-accent-400'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]'
          }`}
        >
          <Clock className="h-4 w-4" />
          Recent
        </button>
      </div>

      {/* Search + View Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[var(--border-main)] rounded-lg overflow-hidden">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-accent-50 dark:bg-accent-950 text-accent-700' : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]'}`}
            >
              <Grid className="h-4 w-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-accent-50 dark:bg-accent-950 text-accent-700' : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]'}`}
            >
              <List className="h-4 w-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2" />
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      {activeTab === 'my-drive' && breadcrumbs.length > 1 && (
        <div className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id}>
              {index > 0 && <span className="text-[var(--text-muted)]">/</span>}
              <button
                onClick={() => onNavigateToFolder(crumb.id, crumb.name)}
                className={`hover:text-accent-700 ${index === breadcrumbs.length - 1
                    ? 'text-[var(--text-primary)] font-medium'
                    : 'text-[var(--text-muted)]'
                  }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Empty state actions for my-drive */}
      {activeTab === 'my-drive' && !searchQuery && (
        <div className="hidden">
          {/* Inline actions used inside FileGrid/FileListView empty states */}
          <Button
            variant="outline"
            size="sm"
            onClick={onNewFolder}
            leftIcon={<FolderPlus className="h-4 w-4" />}
          >
            New Folder
          </Button>
          <label className="cursor-pointer">
            <input type="file" className="hidden" onChange={onFileSelect} />
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent-700 hover:bg-accent-700 text-white text-sm font-medium rounded-lg transition-colors">
              <UploadCloud className="h-4 w-4" />
              Upload File
            </span>
          </label>
        </div>
      )}

      {/* Placeholder for empty state (unused; kept for parity) */}
      <style jsx>{`
        .drive-empty-folder { display: none; }
      `}</style>
    </>
  );
}

// Separate exported component for empty drive state (used in page)
interface DriveEmptyStateProps {
  searchQuery: string;
  activeTab: ViewTab;
  onNewFolder: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function DriveEmptyState({
  searchQuery,
  activeTab,
  onNewFolder,
  onFileSelect,
}: DriveEmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-16">
        <div className="text-center">
          <Folder className="h-16 w-16 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
            {searchQuery ? 'No files found' :
             activeTab === 'shared' ? 'No files shared with you' :
             activeTab === 'starred' ? 'No starred files' :
             activeTab === 'recent' ? 'No recent files' :
             'This folder is empty'}
          </h3>
          <p className="text-[var(--text-muted)]">
            {searchQuery
              ? 'Try adjusting your search query'
              : activeTab === 'my-drive'
                ? 'Upload files or create a new folder'
                : 'Files will appear here when available'}
          </p>
          {activeTab === 'my-drive' && !searchQuery && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onNewFolder}
                leftIcon={<FolderPlus className="h-4 w-4" />}
              >
                New Folder
              </Button>
              <label className="cursor-pointer">
                <input type="file" className="hidden" onChange={onFileSelect} />
                <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent-700 hover:bg-accent-700 text-white text-sm font-medium rounded-lg transition-colors">
                  <UploadCloud className="h-4 w-4" />
                  Upload File
                </span>
              </label>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
