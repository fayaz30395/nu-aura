'use client';

import {useRef, useState} from 'react';
import {ActionIcon, Button, FileButton, Skeleton} from '@mantine/core';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {FileText, Trash2, Upload} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {useToast} from '@/components/notifications/ToastProvider';
import {Callout} from '@/components/ui/Callout';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {QueryState} from '@/components/ui/QueryState';
import {Permissions} from '@/lib/hooks/usePermissions';
import {employeeService, type EmployeeDocumentRecord} from '@/lib/services/hrms/employee.service';
import {createLogger} from '@/lib/utils/logger';
import {SectionCard} from './DetailPrimitives';

const log = createLogger('EmployeeDocumentsTab');

const DOCUMENTS_SKELETON = (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
    {[1, 2, 3].map((i) => <Skeleton key={i} height={72} radius="md"/>)}
  </div>
);

export function DocumentsTab({employeeId}: {employeeId: string}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const resetFileRef = useRef<() => void>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EmployeeDocumentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const documentsQueryKey = ['employee-documents', employeeId];
  const documentsQuery = useQuery({
    queryKey: documentsQueryKey,
    queryFn: () => employeeService.listDocuments(employeeId),
  });

  const handleUpload = async (file: File | null) => {
    resetFileRef.current?.();
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      await employeeService.uploadDocument(employeeId, file);
      await queryClient.invalidateQueries({queryKey: documentsQueryKey});
      toast.success('Document Uploaded', `${file.name} uploaded successfully.`);
    } catch (err) {
      setUploadError('Failed to upload document. Please try again.');
      log.error('Error uploading employee document:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const doc = pendingDelete;
    setIsDeleting(true);
    try {
      await employeeService.deleteDocument(doc.objectName);
      await queryClient.invalidateQueries({queryKey: documentsQueryKey});
      toast.success('Document Deleted', `${doc.fileName} was deleted.`);
    } catch (err) {
      toast.error('Error', 'Failed to delete document.');
      log.error('Error deleting employee document:', err);
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <SectionCard
      title="Documents"
      actions={
        <PermissionGate permission={Permissions.DOCUMENT_UPLOAD}>
          <FileButton
            onChange={(file) => void handleUpload(file)}
            resetRef={resetFileRef}
            disabled={isUploading}
            inputProps={{id: 'employee-document-upload'}}
          >
            {(props) => (
              <Button {...props} size="sm" variant="default" leftSection={<Upload className="h-4 w-4"/>} loading={isUploading}>
                Upload Document
              </Button>
            )}
          </FileButton>
        </PermissionGate>
      }
    >
      {uploadError && (
        <Callout tone="danger" className="mb-4">{uploadError}</Callout>
      )}

      <QueryState
        query={documentsQuery}
        skeleton={DOCUMENTS_SKELETON}
        isEmpty={(docs) => docs.length === 0}
        empty={{
          icon: <FileText className="h-full w-full"/>,
          title: 'No documents uploaded yet',
          description: 'Documents uploaded this session will appear here.',
        }}
        errorTitle="Couldn't load documents"
        errorMessage="Failed to load documents. Please try again."
      >
        {(documents) => (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {documents.map((doc) => (
              <li
                key={doc.objectName}
                className="flex items-center gap-4 rounded-lg border border-border bg-surface-aura-sunken p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400">
                  <FileText className="h-4 w-4" aria-hidden="true"/>
                </span>
                <div className="min-w-0 flex-1">
                  {doc.downloadUrl ? (
                    <a
                      href={doc.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-medium text-accent-700 hover:underline dark:text-accent-400"
                    >
                      {doc.fileName}
                    </a>
                  ) : (
                    <p className="truncate text-sm font-medium text-text-1">{doc.fileName}</p>
                  )}
                  <p className="text-xs tabular-nums text-text-3">{Math.round(doc.fileSize / 1024)} KB</p>
                </div>
                <PermissionGate permission={Permissions.DOCUMENT_DELETE}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => setPendingDelete(doc)}
                    aria-label={`Delete ${doc.fileName}`}
                  >
                    <Trash2 className="h-4 w-4"/>
                  </ActionIcon>
                </PermissionGate>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        onClose={() => !isDeleting && setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
        title="Delete document?"
        message={`${pendingDelete?.fileName ?? 'This document'} will be permanently removed.`}
        confirmText="Delete"
        type="danger"
        loading={isDeleting}
      />
    </SectionCard>
  );
}
