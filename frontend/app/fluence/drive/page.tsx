'use client';

import React, {useMemo, useState} from 'react';
import {File, FileImage, FileSpreadsheet, FileText, HardDrive, Search, Upload,} from 'lucide-react';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {cn} from '@/lib/utils';
import {createLogger} from '@/lib/utils/logger';
import {FileUploader} from '@/components/fluence/FileUploader';
import {FileList} from '@/components/fluence/FileList';
import {useDeleteAttachment, useRecentAttachments, useUploadAttachment,} from '@/lib/hooks/queries/useFluence';
import {FluenceAttachment} from '@/lib/types/platform/fluence';
import {TextInput} from '@mantine/core';

const _log = createLogger('FluenceDrivePage');

type FileCategory = 'all' | 'documents' | 'images' | 'spreadsheets' | 'other';

// A temporary content ID for drive-level uploads (not attached to any specific content)
const DRIVE_CONTENT_ID = '00000000-0000-0000-0000-000000000000';
const DRIVE_CONTENT_TYPE = 'WIKI_PAGE';

function categorizeFile(contentType: string): FileCategory {
  if (contentType.startsWith('image/')) return 'images';
  if (
    contentType.includes('pdf') ||
    contentType.includes('word') ||
    contentType.includes('text/')
  )
    return 'documents';
  if (
    contentType.includes('spreadsheet') ||
    contentType.includes('excel') ||
    contentType.includes('csv')
  )
    return 'spreadsheets';
  return 'other';
}

function FluenceDriveContent() {
  const {hasPermission, isReady} = usePermissions();
  const canManageDrive = hasPermission(Permissions.DOCUMENT_UPLOAD) || hasPermission(Permissions.DOCUMENT_DELETE);
  const [activeCategory, setActiveCategory] = useState<FileCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const {data: attachments = [], isLoading} = useRecentAttachments();
  const uploadMutation = useUploadAttachment();
  const deleteMutation = useDeleteAttachment();

  const handleUpload = async (file: File) => {
    await uploadMutation.mutateAsync({
      contentType: DRIVE_CONTENT_TYPE,
      contentId: DRIVE_CONTENT_ID,
      file,
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const filteredAttachments = useMemo(() => {
    let result = attachments;

    // Filter by category
    if (activeCategory !== 'all') {
      result = result.filter(
        (a: FluenceAttachment) => categorizeFile(a.contentType) === activeCategory
      );
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((a: FluenceAttachment) =>
        a.fileName.toLowerCase().includes(query)
      );
    }

    return result;
  }, [attachments, activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<FileCategory, number> = {
      all: attachments.length,
      documents: 0,
      images: 0,
      spreadsheets: 0,
      other: 0,
    };
    attachments.forEach((a: FluenceAttachment) => {
      const cat = categorizeFile(a.contentType);
      counts[cat]++;
    });
    return counts;
  }, [attachments]);

  if (!isReady) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-accent-200 border-t-accent-500 rounded-full animate-spin"/>
            <p className="text-[var(--text-muted)] font-medium">Loading NU-Fluence Drive...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const categories: { id: FileCategory; label: string; icon: React.ElementType }[] = [
    {id: 'all', label: 'All Files', icon: File},
    {id: 'documents', label: 'Documents', icon: FileText},
    {id: 'images', label: 'Images', icon: FileImage},
    {id: 'spreadsheets', label: 'Spreadsheets', icon: FileSpreadsheet},
    {id: 'other', label: 'Other', icon: File},
  ];

  return (
    <AppLayout
      activeMenuItem="fluence-drive"
      breadcrumbs={[{label: 'Drive', href: '/fluence/drive'}]}
    >
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-lg bg-gradient-to-br from-accent-700 to-accent-800 flex items-center justify-center shadow-[var(--shadow-dropdown)]">
            <HardDrive className="h-8 w-8 text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold skeuo-emboss">
              NU-Fluence Drive
            </h1>
            <p className="text-[var(--text-muted)]">
              Upload, manage, and share files across your knowledge base
            </p>
          </div>
        </div>

        {/* Upload Area — gated behind document permissions (DEF-54) */}
        {canManageDrive && (
          <FileUploader
            onUpload={handleUpload}
            isUploading={uploadMutation.isPending}
          />
        )}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <TextInput
            placeholder="Search files..."
            leftSection={<Search className="h-4 w-4"/>}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            className="flex-1"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 border-b border-[var(--border-main)] overflow-x-auto">
          {categories.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-4 font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2',
                  activeCategory === cat.id
                    ? 'text-accent-600 dark:text-accent-400 border-accent-600 dark:border-accent-400'
                    : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)] dark:hover:text-[var(--text-secondary)]'
                )}
              >
                <CatIcon className="h-4 w-4"/>
                {cat.label}
                <span className="text-xs bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
                  {categoryCounts[cat.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* File List */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-accent-200 border-t-accent-500 rounded-full animate-spin"/>
                <p className="text-[var(--text-muted)]">Loading files...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <FileList
            attachments={filteredAttachments}
            onDelete={handleDelete}
            isDeleting={deleteMutation.isPending}
          />
        )}

        {/* Upload Tip */}
        {attachments.length === 0 && !isLoading && (
          <Card className="bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <Upload className="h-5 w-5 text-accent-600 dark:text-accent-400"/>
                Getting Started
              </h3>
              <p className="text-body-secondary">
                Upload files to your Drive to share them across wiki pages and blog posts.
                Files can be up to 50MB in size. Supported formats include documents, images,
                spreadsheets, and more.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

export default function FluenceDrivePage() {
  return <FluenceDriveContent/>;
}
