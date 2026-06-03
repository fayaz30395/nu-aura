'use client';

import {Lock} from 'lucide-react';

interface EditLockWarningProps {
  lockedByName: string;
  onForceEdit: () => void;
}

/**
 * Warning banner displayed when another user holds an edit lock on the content.
 * Offers a "Edit Anyway" button to force-acquire the lock.
 */
export default function EditLockWarning({lockedByName, onForceEdit}: EditLockWarningProps) {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-[var(--r-md)] border border-[var(--warn-bd)] bg-[var(--warn-bg)] mb-4"
      role="alert"
      aria-live="polite"
    >
      <Lock className="w-5 h-5 text-[var(--warn-fg)] flex-shrink-0"/>
      <div className="flex-1">
        <h4 className="font-semibold text-sm text-[var(--warn-fg)] mb-0.5">
          Content is being edited
        </h4>
        <p className="text-sm text-[var(--warn-fg)] opacity-90">
          <strong>{lockedByName}</strong> is currently editing this page. Your changes may conflict.
        </p>
      </div>
      <button
        onClick={onForceEdit}
        className="px-3 py-1.5 text-sm font-medium rounded-[var(--r-control)] bg-[var(--warn-bg)] text-[var(--warn-fg)] border border-[var(--warn-bd)] hover:opacity-80 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 flex-shrink-0"
      >
        Edit Anyway
      </button>
    </div>
  );
}
