'use client';

import { Alert, Button } from '@mantine/core';
import { Lock } from 'lucide-react';

interface EditLockWarningProps {
  lockedByName: string;
  onForceEdit: () => void;
}

/**
 * Warning banner displayed when another user holds an edit lock on the content.
 * Offers a "Edit Anyway" button to force-acquire the lock.
 */
export default function EditLockWarning({ lockedByName, onForceEdit }: EditLockWarningProps) {
  return (
    <Alert
      icon={<Lock className="w-5 h-5" />}
      title="Content is being edited"
      color="yellow"
      variant="light"
      className="mb-4"
    >
      <div className="row-between gap-4">
        <span className="text-sm">
          <strong>{lockedByName}</strong> is currently editing this page. Your changes may conflict.
        </span>
        <Button
          size="xs"
          variant="subtle"
          color="yellow"
          onClick={onForceEdit}
        >
          Edit Anyway
        </Button>
      </div>
    </Alert>
  );
}
