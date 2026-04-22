'use client';

import React from 'react';
import {MoreVertical, Trash2} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {SavedFilterPreset} from './types';

export interface SavedPresetsMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  savedPresets: SavedFilterPreset[];
  onLoadPreset: (id: string) => void;
  onDeletePreset: (id: string) => void;
}

export const SavedPresetsMenu: React.FC<SavedPresetsMenuProps> = ({
                                                                    isOpen,
                                                                    onToggle,
                                                                    savedPresets,
                                                                    onLoadPreset,
                                                                    onDeletePreset,
                                                                  }) => (
  <div className="relative">
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center gap-1.5 h-9 px-3 text-sm rounded-md cursor-pointer',
        'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
        'hover:bg-[var(--bg-secondary)]',
        'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:ring-offset-2',
        'transition-colors duration-150'
      )}
      aria-haspopup="true"
      aria-expanded={isOpen}
      aria-label="Saved filter presets"
    >
      <MoreVertical className="h-4 w-4"/>
    </button>

    {isOpen && savedPresets.length > 0 && (
      <div
        className={cn(
          'absolute right-0 z-50 mt-2 w-56 rounded-lg border shadow-[var(--shadow-dropdown)]',
          'border-[var(--border-main)] bg-[var(--bg-surface)]',
          'animate-in fade-in-0 zoom-in-95'
        )}
        role="menu"
      >
        <div className="px-4 py-2 border-b border-[var(--border-main)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Saved Presets
          </span>
        </div>
        <div className="py-1 max-h-64 overflow-y-auto">
          {savedPresets.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center justify-between px-4 py-2 hover:bg-[var(--bg-secondary)] group"
            >
              <button
                type="button"
                onClick={() => onLoadPreset(preset.id)}
                className={cn(
                  'flex-1 text-left text-sm text-[var(--text-primary)]',
                  'focus:outline-none cursor-pointer'
                )}
              >
                {preset.name}
              </button>
              <button
                type="button"
                onClick={() => onDeletePreset(preset.id)}
                className={cn(
                  'p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                  'text-[var(--text-muted)] hover:text-status-danger-text cursor-pointer'
                )}
                aria-label={`Delete preset ${preset.name}`}
              >
                <Trash2 className="h-3.5 w-3.5"/>
              </button>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
