'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Progress } from '@mantine/core';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
  className?: string;
}

export function FileUploader({ onUpload, isUploading = false, className }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup interval and timeout on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 50MB limit`;
    }
    return null;
  };

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSelectedFile(file);
    setUploadProgress(0);

    // Simulate progress since we don't have onUploadProgress from the API
    progressIntervalRef.current = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await onUpload(file);
      setUploadProgress(100);
      resetTimeoutRef.current = setTimeout(() => {
        setSelectedFile(null);
        setUploadProgress(0);
      }, 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      setSelectedFile(null);
      setUploadProgress(0);
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFile]);

  return (
    <div className={cn('space-y-3', className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
          isDragging
            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
            : 'border-[var(--border-main)] hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-900/10',
          isUploading && 'pointer-events-none opacity-60'
        )}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Upload file"
        />

        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Upload className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>

          {selectedFile ? (
            <div className="space-y-2 w-full max-w-xs">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
              <Progress value={uploadProgress} size="sm" color="violet" />
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {isDragging ? 'Drop your file here' : 'Drag and drop a file, or click to browse'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Maximum file size: 50MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-danger-600 dark:text-danger-400 flex-shrink-0" />
          <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto p-1"
            onClick={(e) => {
              e.stopPropagation();
              setError(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
