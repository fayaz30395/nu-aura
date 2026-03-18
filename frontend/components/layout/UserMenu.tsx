'use client';

import React from 'react';
import Image from 'next/image';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────
export interface UserMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  userName: string;
  userAvatar?: string;
  userRole: string;
  onProfile?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
}

/**
 * User profile / settings / logout dropdown in the Header.
 * The parent (Header) controls open/close state so it can manage the
 * click-outside listener centrally alongside the notification dropdown.
 */
export function UserMenu({
  isOpen,
  onToggle,
  onClose,
  userName,
  userAvatar,
  userRole,
  onProfile,
  onSettings,
  onLogout,
}: UserMenuProps) {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="relative user-dropdown">
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-2 rounded-xl px-2 py-1.5 sm:px-3 sm:py-2 transition-all',
          'hover:bg-surface-100 dark:hover:bg-surface-800',
          isOpen && 'bg-surface-100 dark:bg-surface-800'
        )}
      >
        {userAvatar ? (
          <Image
            src={userAvatar}
            alt={userName}
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl object-cover ring-2 ring-surface-200 dark:ring-surface-700"
          />
        ) : (
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-primary-200 dark:ring-primary-800">
            {initials}
          </div>
        )}
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            {userName}
          </span>
          <span className="text-xs text-surface-500 dark:text-surface-300">
            {userRole}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'hidden sm:block h-4 w-4 text-surface-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl glass-midnight animate-fade-in-down overflow-hidden">
          {/* User Info Header */}
          <div className="p-4 border-b border-[var(--dropdown-divider)] bg-[var(--bg-card-hover)]">
            <p className="text-sm font-semibold text-[var(--dropdown-text)]">{userName}</p>
            <p className="text-xs text-[var(--dropdown-text-secondary)] mt-0.5">{userRole}</p>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <button
              onClick={() => { onClose(); onProfile?.(); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[var(--dropdown-text-secondary)] hover:bg-[var(--dropdown-hover)] hover:text-[var(--dropdown-text)] transition-all duration-150"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-surface)]">
                <User className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
              <span>View Profile</span>
            </button>

            <button
              onClick={() => { onClose(); onSettings?.(); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[var(--dropdown-text-secondary)] hover:bg-[var(--dropdown-hover)] hover:text-[var(--dropdown-text)] transition-all duration-150"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-surface)]">
                <Settings className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
              <span>Settings</span>
            </button>
          </div>

          <div className="border-t border-[var(--dropdown-divider)] p-2">
            <button
              onClick={() => { onClose(); onLogout?.(); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950/30 transition-all duration-150"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-danger-50 dark:bg-danger-950/30">
                <LogOut className="h-4 w-4" />
              </div>
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
