'use client';

import React from 'react';
import {AlertCircle, FolderPlus, HardDrive, Loader2, RefreshCw, UploadCloud} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Card, CardContent} from '@/components/ui/Card';

interface DriveOAuthPanelProps {
  isConnected: boolean;
  uploading: boolean;
  error: string | null;
  onConnect: () => void;
  onNewFolder: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRefresh: () => void;
  onDisconnect: () => void;
}

export function DriveOAuthPanel({
                                  isConnected,
                                  uploading,
                                  error,
                                  onConnect,
                                  onNewFolder,
                                  onFileSelect,
                                  onRefresh,
                                  onDisconnect,
                                }: DriveOAuthPanelProps) {
  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-success-500 flex items-center justify-center">
            <HardDrive className="h-6 w-6 text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">NU-Drive</h1>
            <p className="text-body-muted">Your organization&apos;s Google Drive</p>
          </div>
        </div>
        {!isConnected ? (
          <Button
            variant="primary"
            onClick={onConnect}
            leftIcon={<HardDrive className="h-4 w-4"/>}
          >
            Connect Google Drive
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onNewFolder}
              leftIcon={<FolderPlus className="h-4 w-4"/>}
            >
              New Folder
            </Button>
            <label>
              <input
                type="file"
                className="hidden"
                onChange={onFileSelect}
                disabled={uploading}
              />
              <div
                className={`cursor-pointer inline-flex items-center gap-2 h-8 px-4 text-sm font-medium text-white bg-accent-700 rounded-md hover:bg-accent-700 disabled:opacity-50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <UploadCloud className="h-4 w-4"/>}
                <span>Upload</span>
              </div>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              leftIcon={<RefreshCw className="h-4 w-4"/>}
            >
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              className="text-[var(--text-muted)] hover:text-danger-600"
            >
              Disconnect
            </Button>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-danger-200 dark:border-danger-900 bg-danger-50 dark:bg-danger-950/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-4 text-danger-600 dark:text-danger-400">
              <AlertCircle className="h-5 w-5"/>
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={onConnect} className="ml-auto">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connect Card (shown when not connected) */}
      {!isConnected && (
        <Card className="border-2 border-dashed border-[var(--border-main)] dark:border-[var(--border-main)]">
          <CardContent className="py-16">
            <div className="text-center">
              <div
                className="w-20 h-20 rounded-full bg-accent-50 dark:bg-accent-950/30 flex items-center justify-center mx-auto mb-6">
                <HardDrive className="h-10 w-10 text-accent-600 dark:text-accent-400"/>
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Connect to Google Drive
              </h2>
              <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
                Access your organization&apos;s Google Drive files directly within NULogic.
                View, search, upload, share, and manage your documents all in one place.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={onConnect}
                leftIcon={<HardDrive className="h-5 w-5"/>}
              >
                Connect Google Drive
              </Button>
              <p className="text-caption mt-4">
                You&apos;ll be asked to grant access to your Google Drive files.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
