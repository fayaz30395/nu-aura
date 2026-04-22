'use client';

export interface FeedCardBodyProps {
  isEditing: boolean;
  editContent: string;
  localContent: string;
  isSavingEdit: boolean;
  onEditChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function FeedCardBody({
                               isEditing,
                               editContent,
                               localContent,
                               isSavingEdit,
                               onEditChange,
                               onSave,
                               onCancel,
                             }: FeedCardBodyProps) {
  return (
    <div className="px-4 pb-4">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) onSave();
              if (e.key === 'Escape') onCancel();
            }}
            className="input-aura w-full resize-none text-sm min-h-[60px]"
            autoFocus
            disabled={isSavingEdit}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              disabled={isSavingEdit}
              className="px-4 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!editContent.trim() || isSavingEdit}
              className='px-4 py-1.5 text-xs font-semibold text-inverse bg-accent rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
            >
              {isSavingEdit ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
          {localContent}
        </p>
      )}
    </div>
  );
}
