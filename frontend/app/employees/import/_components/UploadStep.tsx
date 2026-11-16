'use client';

import {type DragEvent, type Ref, useState} from 'react';
import {Button, FileButton} from '@mantine/core';
import {CheckCircle, FileSpreadsheet, FileText, Upload} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {cn} from '@/lib/utils';

interface UploadStepProps {
  selectedFile: File | null;
  loading: boolean;
  resetFileRef: Ref<() => void>;
  onSelectFile: (file: File | null) => void;
  onClearFile: () => void;
  onDownloadTemplate: (type: 'csv' | 'xlsx') => void;
  onPreview: () => void;
}

export function UploadStep({
  selectedFile,
  loading,
  resetFileRef,
  onSelectFile,
  onClearFile,
  onDownloadTemplate,
  onPreview,
}: UploadStepProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) onSelectFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-4 sm:p-6">
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-text-1">Download Template</h2>
          <p className="mt-1 text-sm text-text-2">
            Download a template file with the required columns and fill it with your employee data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGate permission={Permissions.EMPLOYEE_CREATE}>
            <Button
              variant="default"
              leftSection={<FileText className="h-4 w-4 text-success-600"/>}
              onClick={() => onDownloadTemplate('csv')}
              disabled={loading}
            >
              CSV Template
            </Button>
          </PermissionGate>
          <PermissionGate permission={Permissions.EMPLOYEE_CREATE}>
            <Button
              variant="default"
              leftSection={<FileSpreadsheet className="h-4 w-4 text-accent-700 dark:text-accent-400"/>}
              onClick={() => onDownloadTemplate('xlsx')}
              disabled={loading}
            >
              Excel Template
            </Button>
          </PermissionGate>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-6">
        <h2 className="text-base font-semibold text-text-1">Upload File</h2>
        <div
          className={cn(
            'rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            dragActive
              ? 'border-accent-500 bg-accent-50 dark:bg-accent-950/30'
              : selectedFile
                ? 'border-success-500 bg-success-50 dark:bg-success-900/20'
                : 'border-border hover:border-border-strong'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-8 w-8 text-success-600" aria-hidden/>
              <p className="text-sm font-medium text-text-1">{selectedFile.name}</p>
              <p className="text-xs text-text-2">{(selectedFile.size / 1024).toFixed(2)} KB</p>
              <Button variant="subtle" color="red" size="xs" onClick={onClearFile}>
                Remove file
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-text-3" aria-hidden/>
              <p className="text-sm font-medium text-text-1">Drag and drop your file here</p>
              <p className="text-xs text-text-2">or</p>
              <FileButton
                onChange={onSelectFile}
                accept=".csv,.xls,.xlsx"
                resetRef={resetFileRef}
                inputProps={{'aria-label': 'Upload employee import file'}}
              >
                {(props) => <Button {...props}>Browse Files</Button>}
              </FileButton>
              <p className="text-xs text-text-3">Supports CSV, XLS, and XLSX files</p>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="flex justify-end">
            <PermissionGate permission={Permissions.EMPLOYEE_CREATE}>
              <Button onClick={onPreview} loading={loading} rightSection={<CheckCircle className="h-4 w-4"/>}>
                Preview Import
              </Button>
            </PermissionGate>
          </div>
        )}
      </section>
    </div>
  );
}
