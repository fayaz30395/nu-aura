'use client';

import {RefObject} from 'react';
import NextImage from 'next/image';
import {Check, Loader2, Search, Trophy, X} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {Employee} from '@/lib/types/hrms/employee';
import {PRAISE_CATEGORIES} from './praiseCategories';

export interface PraiseRecipient {
  id: string;
  fullName: string;
  avatarUrl?: string;
  designation?: string;
  department?: string;
}

export interface ComposerPraiseProps {
  selectedRecipient: PraiseRecipient | null;
  recipientSearch: string;
  showRecipientDropdown: boolean;
  searchResults?: { content: Employee[] };
  currentUserEmployeeId?: string;
  praiseCategory: string | null;
  praiseMessage: string;
  canSubmit: boolean;
  isSubmitting: boolean;
  recipientInputRef: RefObject<HTMLInputElement>;
  dropdownRef: RefObject<HTMLDivElement>;
  onRecipientSearchChange: (value: string) => void;
  onRecipientFocus: () => void;
  onSelectRecipient: (recipient: PraiseRecipient) => void;
  onClearRecipient: () => void;
  onTogglePraiseCategory: (categoryId: string) => void;
  onPraiseMessageChange: (value: string) => void;
  onSubmit: () => void;
}

export function ComposerPraise({
                                 selectedRecipient,
                                 recipientSearch,
                                 showRecipientDropdown,
                                 searchResults,
                                 currentUserEmployeeId,
                                 praiseCategory,
                                 praiseMessage,
                                 canSubmit,
                                 isSubmitting,
                                 recipientInputRef,
                                 dropdownRef,
                                 onRecipientSearchChange,
                                 onRecipientFocus,
                                 onSelectRecipient,
                                 onClearRecipient,
                                 onTogglePraiseCategory,
                                 onPraiseMessageChange,
                                 onSubmit,
                               }: ComposerPraiseProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Recipient search */}
      <div className="relative">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Who do you want to recognize?</p>
        {selectedRecipient ? (
          <div
            className='flex items-center gap-2 p-2 rounded-lg border border-[var(--accent-primary)] bg-accent-subtle'>
            <div
              className='w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center text-sm font-semibold text-accent overflow-hidden shrink-0'>
              {selectedRecipient.avatarUrl ? (
                <NextImage src={selectedRecipient.avatarUrl} alt="" width={32} height={32}
                           className="w-full h-full object-cover" unoptimized/>
              ) : (
                selectedRecipient.fullName.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{selectedRecipient.fullName}</p>
              {selectedRecipient.designation && (
                <p className="text-caption truncate">{selectedRecipient.designation}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClearRecipient}
              className='rounded p-1 text-[var(--text-muted)] hover:text-status-danger-text transition-colors'
            >
              <X size={14}/>
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"/>
              <input
                ref={recipientInputRef}
                type="text"
                value={recipientSearch}
                onChange={(e) => onRecipientSearchChange(e.target.value)}
                onFocus={onRecipientFocus}
                placeholder="Search by name..."
                className="input-aura w-full pl-8"
              />
            </div>
            {showRecipientDropdown && searchResults && searchResults.content.length > 0 && (
              <div ref={dropdownRef}
                   className="absolute z-30 left-4 right-4 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-dropdown)]">
                {searchResults.content
                  .filter((emp) => emp.id !== currentUserEmployeeId)
                  .map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => onSelectRecipient({
                        id: emp.id,
                        fullName: `${emp.firstName} ${emp.lastName}`,
                        avatarUrl: emp.profilePhotoUrl,
                        designation: emp.designation,
                        department: emp.departmentName,
                      })}
                      className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <div
                        className="w-7 h-7 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-xs font-semibold text-[var(--text-secondary)] overflow-hidden shrink-0">
                        {emp.profilePhotoUrl ? (
                          <NextImage src={emp.profilePhotoUrl} alt="" width={28} height={28}
                                     className="w-full h-full object-cover" unoptimized/>
                        ) : (
                          emp.firstName?.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--text-primary)] truncate">{emp.firstName} {emp.lastName}</p>
                        <p className="text-caption truncate">{emp.designation || emp.departmentName}</p>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
      {/* Category badges */}
      <div>
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Recognition badge</p>
        <div className="flex flex-wrap gap-2">
          {PRAISE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onTogglePraiseCategory(cat.id)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all',
                praiseCategory === cat.id
                  ? `${cat.color} ring-2 ring-accent-400 ring-offset-1 dark:ring-offset-[var(--bg-card)]`
                  : 'border-[var(--border-main)] text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]'
              )}
            >
              <span>{cat.emoji}</span>
              {cat.label}
              {praiseCategory === cat.id && <Check size={10} className="ml-0.5"/>}
            </button>
          ))}
        </div>
      </div>
      {/* Message (optional) */}
      <textarea
        value={praiseMessage}
        onChange={(e) => onPraiseMessageChange(e.target.value)}
        placeholder="Add a message (optional)..."
        className="input-aura w-full resize-none h-16"
        maxLength={2000}
      />
      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
          className='inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-inverse hover:bg-accent active:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2'
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Trophy size={14}/>}
          {isSubmitting ? 'Sending...' : 'Send Praise'}
        </button>
      </div>
    </div>
  );
}
