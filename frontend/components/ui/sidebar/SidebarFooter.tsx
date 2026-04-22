'use client';

import React from 'react';
import {Sparkles} from 'lucide-react';
import {cn} from '@/lib/utils';

export interface SidebarFooterProps {
  isCollapsed: boolean;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({isCollapsed}) => (
  <div
    className={cn(
      'p-4 transition-all duration-300',
      isCollapsed && 'flex justify-center'
    )}
    style={{borderTop: '1px solid var(--sidebar-border)'}}
  >
    {!isCollapsed ? (
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200"
        style={{
          background:
            'linear-gradient(135deg, rgba(58, 95, 217, 0.12) 0%, rgba(96, 165, 250, 0.08) 100%)',
          border: '1px solid rgba(58, 95, 217, 0.20)',
          boxShadow:
            'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 1px 3px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-200"
          style={{
            background:
              'linear-gradient(135deg, rgba(58, 95, 217, 0.25), rgba(96, 165, 250, 0.15))',
          }}
        >
          <Sparkles className='h-4 w-4 text-accent transition-transform duration-200'/>
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-semibold truncate"
            style={{color: 'var(--sidebar-text-active)'}}
          >
            Pro Features
          </p>
          <p className="text-2xs" style={{color: 'var(--sidebar-text-muted)'}}>
            All modules active
          </p>
        </div>
      </div>
    ) : (
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center group relative transition-all duration-200 hover:scale-105"
        style={{
          background:
            'linear-gradient(135deg, rgba(58, 95, 217, 0.25), rgba(96, 165, 250, 0.15))',
        }}
      >
        <Sparkles className='h-4 w-4 text-accent transition-transform duration-200'/>
        <div
          className="absolute left-full ml-2 px-2.5 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-main)] text-[var(--text-primary)] text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-[var(--shadow-dropdown)]">
          Pro Features Active
        </div>
      </div>
    )}
  </div>
);
