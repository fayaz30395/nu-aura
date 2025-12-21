'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image, FileText, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

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
  accept = '*/*',
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

  const validateFile = (file: File): string | null => {
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
  };

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
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to upload file';
      onError?.(errorMessage);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [category, employeeId, maxSize, onUpload, onError]);

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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-8
          flex flex-col items-center justify-center
          transition-all cursor-pointer
          ${isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
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
        />

        {uploading && selectedFile ? (
          <div className="w-full max-w-xs">
            <div className="flex items-center gap-3 mb-3">
              <FileIcon className="h-8 w-8 text-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cancelUpload();
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-center mt-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading... {progress}%
            </div>
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-500">
              {accept === '*/*' ? 'Any file type' : accept.replace(/,/g, ', ')} up to {formatFileSize(maxSize)}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
