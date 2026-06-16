'use client';

import React, {useCallback, useRef, useState} from 'react';
import {File, FileText, Image, Loader2, Upload, X} from 'lucide-react';
import {apiClient} from '@/lib/api/client';

interface FileUploadProps {
  onUpload: (result: FileUploadResult) => void;
  onError?: (error: string) => void;
  category?: 'profile-photos' | 'documents' | 'payslips' | 'letters' | 'attachments' | 'reports';
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
  className?: string;
  disabled?: boolean;
  employeeId?: string;
}

export interface FileUploadResult {
  objectName: string;
  filename: string;
  contentType: string;
  size: number;
  downloadUrl: string;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image;
  if (type === 'application/pdf') return FileText;
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FileUpload: React.FC<FileUploadProps> = ({
                                                        onUpload,
                                                        onError,
                                                        category = 'documents',
                                                        accept = 'image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt',
                                                        maxSize = 10 * 1024 * 1024, // 10MB default
                                                        multiple = false,
                                                        className = '',
                                                        disabled = false,
                                                        employeeId,
                                                      }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)} limit`;
    }

    if (accept !== '*/*') {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', '/'));
        }
        return file.type === type;
      });

      if (!isAccepted) {
        return `File type not accepted. Please upload: ${accept}`;
      }
    }

    return null;
  }, [maxSize, accept]);

  const uploadFile = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      onError?.(error);
      return;
    }

    setUploading(true);
    setProgress(0);
    setSelectedFile(file);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    try {
      let endpoint = '/api/v1/files/upload';

      // Use specific endpoints for profile photos and documents
      if (category === 'profile-photos' && employeeId) {
        endpoint = `/api/v1/files/upload/profile-photo/${employeeId}`;
      } else if (category === 'documents' && employeeId) {
        endpoint = `/api/v1/files/upload/document/${employeeId}`;
      }

      const response = await apiClient.post<FileUploadResult>(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        },
      });

      onUpload(response.data);
      setSelectedFile(null);
    } catch (err: unknown) {
      const errorMessage = typeof err === 'object' && err !== null && 'response' in err ? (err as {
        response?: { data?: { message?: string } }
      }).response?.data?.message : null;
      onError?.(errorMessage || 'Failed to upload file');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [category, employeeId, validateFile, onUpload, onError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      if (multiple) {
        files.forEach(file => uploadFile(file));
      } else {
        uploadFile(files[0]);
      }
    }
  }, [disabled, multiple, uploadFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (multiple) {
        Array.from(files).forEach(file => uploadFile(file));
      } else {
        uploadFile(files[0]);
      }
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [multiple, uploadFile]);

  const cancelUpload = useCallback(() => {
    setSelectedFile(null);
    setUploading(false);
    setProgress(0);
  }, []);

  const FileIcon = selectedFile ? getFileIcon(selectedFile.type) : Upload;

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={disabled || uploading ? -1 : 0}
        aria-label={uploading
          ? 'File upload in progress'
          : disabled
            ? 'File upload disabled'
            : `Upload file${multiple ? 's' : ''}. Press Enter or Space to browse files, or drag and drop.`}
        aria-disabled={disabled || uploading}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`
          relative border-2 border-dashed rounded-lg p-8
          flex flex-col items-center justify-center cursor-pointer
          transition-[border-color,background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]
          motion-reduce:transition-none
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2
          ${isDragging
          ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20 scale-[1.01] shadow-[var(--shadow-hover)] motion-reduce:scale-100'
          : 'border-[var(--border-main)] dark:border-surface-600 hover:border-accent-400 dark:hover:border-accent-500 hover:shadow-[var(--shadow-card)]'
        }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${uploading ? 'pointer-events-none' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
          aria-hidden="true"
          tabIndex={-1}
        />

        {uploading && selectedFile ? (
          <div className="w-full max-w-xs">
            <div className="flex items-center gap-2 mb-4">
              <FileIcon className="h-8 w-8 text-accent-500"/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-caption">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cancelUpload();
                }}
                type="button"
                aria-label="Cancel upload"
                className="press-scale focus-ring p-1 hover:bg-[var(--bg-surface)] rounded transition-colors duration-150 motion-reduce:transition-none"
              >
                <X className="h-4 w-4"/>
              </button>
            </div>
            <div className="relative h-2 bg-[var(--border-main)] dark:bg-surface-700 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-accent-500 transition-all duration-300"
                style={{width: `${progress}%`}}
              />
            </div>
            <div className="flex items-center justify-center mt-2 text-body-muted">
              <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
              Uploading... {progress}%
            </div>
          </div>
        ) : (
          <>
            <Upload
              className={`h-12 w-12 mb-4 transition-[color,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${
                isDragging ? 'text-accent-500 -translate-y-0.5 motion-reduce:translate-y-0' : 'text-[var(--text-muted)]'
              }`}
            />
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-caption">
              {accept === '*/*' ? 'Any file type' : accept.replace(/,/g, ', ')} up to {formatFileSize(maxSize)}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
