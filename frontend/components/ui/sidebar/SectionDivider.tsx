'use client';

import React from 'react';
import {ChevronDown} from 'lucide-react';
import {cn} from '@/lib/utils';

export interface SectionDividerProps {
  label: string;
  sectionId: string;
  isCollapsed: boolean;
  isSectionExpanded: boolean;
  onToggleSection: (sectionId: string) => void;
}

export const SectionDivider: React.FC<SectionDividerProps> = ({
                                                                label,
                                                                sectionId,
                                                                isCollapsed,
                                                                isSectionExpanded,
                                                                onToggleSection,
                                                              }) => {
  if (isCollapsed) {
    return (
      <div className="px-4 py-4 text-center">
        <div
          className="w-full h-px mx-auto"
          style={{borderTop: '1px solid var(--sidebar-border)'}}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => onToggleSection(sectionId)}
      aria-expanded={isSectionExpanded}
      className="w-full row-between px-4 py-2.5 group rounded-md transition-all duration-200 hover:translate-x-0.5"
    >
      <span
        className="skeuo-deboss text-xs font-semibold uppercase tracking-wider transition-colors duration-200"
        style={{color: 'var(--sidebar-section-text)'}}
        suppressHydrationWarning
      >
        {label}
      </span>
      <ChevronDown
        className={cn(
          'h-3 w-3 transition-transform duration-300 ease-out',
          !isSectionExpanded && '-rotate-90'
        )}
        style={{color: 'var(--sidebar-text-muted)'}}
      />
    </button>
  );
};
