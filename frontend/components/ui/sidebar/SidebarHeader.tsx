'use client';

import React from 'react';
import Image from 'next/image';
import {PanelLeft, PanelLeftClose} from 'lucide-react';
import {cn} from '@/lib/utils';

export interface SidebarHeaderProps {
  isCollapsed: boolean;
  collapsible: boolean;
  onToggleCollapsed: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
                                                              isCollapsed,
                                                              collapsible,
                                                              onToggleCollapsed,
                                                            }) => (
  <>
    <div
      className={cn(
        'flex items-center h-16 px-4 transition-all duration-300',
        isCollapsed ? 'justify-center' : 'justify-between'
      )}
      style={{borderBottom: '1px solid var(--sidebar-border)'}}
    >
      {!isCollapsed ? (
        <div className="flex items-center gap-2">
          <Image
            src="/images/nulogic-logo-white.svg"
            alt="NULogic"
            width={130}
            height={38}
            className="h-8 w-auto object-contain"
            priority
          />
        </div>
      ) : (
        <div className="flex items-center justify-center">
          <Image
            src="/images/nulogic-icon.svg"
            alt="NULogic"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            priority
          />
        </div>
      )}
    </div>

    {collapsible && (
      <div
        className={cn(
          'px-4 py-2.5 transition-all duration-300',
          isCollapsed ? 'flex justify-center' : ''
        )}
        style={{borderBottom: '1px solid var(--sidebar-border)'}}
      >
        <button
          onClick={onToggleCollapsed}
          className={cn(
            'flex items-center gap-2 p-2 rounded-lg transition-all duration-200 ease-out cursor-pointer',
            isCollapsed ? 'w-full justify-center' : 'w-full'
          )}
          style={{color: 'var(--sidebar-text)'}}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          suppressHydrationWarning
        >
          {isCollapsed ? (
            <PanelLeft className="h-5 w-5 transition-transform duration-300"/>
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5 transition-transform duration-300"/>
              <span className="text-xs font-medium transition-opacity duration-200">Collapse</span>
              <kbd
                className="ml-auto text-xs font-mono px-1.5 py-0.5 rounded transition-colors duration-200"
                style={{
                  color: 'var(--sidebar-text-muted)',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--sidebar-border)',
                }}
              >
                {/* NOSONAR — branding key symbol */}
                &#8984;B
              </kbd>
            </>
          )}
        </button>
      </div>
    )}
  </>
);
