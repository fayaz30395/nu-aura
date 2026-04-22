'use client';

import {MoreHorizontal, Pencil, Trash2} from 'lucide-react';

export interface ActionMenuProps {
  showMenu: boolean;
  setShowMenu: (v: boolean) => void;
  onEdit?: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function ActionMenu({showMenu, setShowMenu, onEdit, onDelete, isDeleting}: ActionMenuProps) {
  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
        aria-label="Open menu"
      >
        <MoreHorizontal className="h-3.5 w-3.5"/>
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10 cursor-pointer" onClick={() => setShowMenu(false)}/>
          <div
            className="absolute right-0 top-full mt-1 z-20 min-w-[120px] rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-dropdown)] py-1">
            {onEdit && (
              <button
                onClick={() => {
                  onEdit();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]  transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                <Pencil className="h-3 w-3"/>
                Edit post
              </button>
            )}
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className='w-full flex items-center gap-2 px-4 py-1.5 text-xs text-status-danger-text hover:bg-status-danger-bg transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
            >
              <Trash2 className="h-3 w-3"/>
              {isDeleting ? 'Deleting...' : 'Delete post'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
