'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AtSign, Search } from 'lucide-react';
import { MOCK_USERS, type MockUser } from '@/lib/data/mock-fluence';

// ─── Types ──────────────────────────────────────────────────────

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export interface MentionInputHandle {
  focus: () => void;
}

// ─── Component ──────────────────────────────────────────────────

export const MentionInput = forwardRef<MentionInputHandle, MentionInputProps>(
  function MentionInput({ value, onChange, onSubmit, placeholder, disabled, className }, ref) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [mentionActive, setMentionActive] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);
    const [selectedIdx, setSelectedIdx] = useState(0);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }));

    // Filter users based on mention query
    const filteredUsers = mentionQuery.length === 0
      ? MOCK_USERS.slice(0, 6)
      : MOCK_USERS.filter(
          (u) =>
            u.fullName.toLowerCase().includes(mentionQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(mentionQuery.toLowerCase()) ||
            u.department.toLowerCase().includes(mentionQuery.toLowerCase())
        ).slice(0, 6);

    // Auto-resize textarea
    const autoResize = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }, []);

    useEffect(() => {
      autoResize();
    }, [value, autoResize]);

    // Detect @ trigger
    const handleInput = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart || 0;
        onChange(newValue);

        // Check if we just typed @
        const textBeforeCursor = newValue.slice(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex >= 0) {
          const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
          if (charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) {
            const query = textBeforeCursor.slice(lastAtIndex + 1);
            // Only active if query has no spaces (still typing the mention)
            if (!query.includes(' ') && query.length <= 20) {
              setMentionActive(true);
              setMentionQuery(query);
              setMentionStartIndex(lastAtIndex);
              setSelectedIdx(0);
              return;
            }
          }
        }

        setMentionActive(false);
      },
      [onChange]
    );

    // Insert mention
    const insertMention = useCallback(
      (user: MockUser) => {
        const before = value.slice(0, mentionStartIndex);
        const cursorPos = textareaRef.current?.selectionStart || value.length;
        const after = value.slice(cursorPos);
        const newValue = `${before}@${user.fullName} ${after}`;
        onChange(newValue);
        setMentionActive(false);
        setMentionQuery('');

        // Focus and move cursor after the mention
        requestAnimationFrame(() => {
          const el = textareaRef.current;
          if (el) {
            const newPos = before.length + user.fullName.length + 2; // +2 for @ and space
            el.focus();
            el.setSelectionRange(newPos, newPos);
          }
        });
      },
      [value, mentionStartIndex, onChange]
    );

    // Keyboard navigation in mention dropdown
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (mentionActive && filteredUsers.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx((prev) => (prev + 1) % filteredUsers.length);
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
            return;
          }
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            insertMention(filteredUsers[selectedIdx]);
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setMentionActive(false);
            return;
          }
        }

        // Submit on Enter (without shift)
        if (e.key === 'Enter' && !e.shiftKey && !mentionActive) {
          e.preventDefault();
          onSubmit();
        }
      },
      [mentionActive, filteredUsers, selectedIdx, insertMention, onSubmit]
    );

    // Close dropdown on click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target as Node) &&
          textareaRef.current &&
          !textareaRef.current.contains(e.target as Node)
        ) {
          setMentionActive(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get initials for avatar
    const getInitials = (name: string) =>
      name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    // Generate a consistent color from user id
    const getUserColor = (id: string) => {
      const colors = [
        'from-accent-500 to-accent-600',
        'from-success-500 to-success-600',
        'from-warning-500 to-warning-600',
        'from-danger-500 to-danger-600',
        'from-accent-700 to-accent-800',
        'from-accent-500 to-accent-600',
        'from-warning-500 to-warning-600',
        'from-success-500 to-success-600',
      ];
      const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      return colors[hash % colors.length];
    };

    return (
      <div className={`relative ${className || ''}`}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Write a comment... Use @ to mention someone'}
          disabled={disabled}
          rows={1}
          className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-700)]/40 focus:border-[var(--accent-700)] text-sm transition-all duration-200 resize-none leading-relaxed"
          style={{ minHeight: '42px' }}
        />

        {/* Mention hint */}
        {!mentionActive && value.length === 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[var(--text-muted)] pointer-events-none">
            <AtSign className="h-3.5 w-3.5" />
            <span className="text-xs">mention</span>
          </div>
        )}

        {/* Mention dropdown */}
        <AnimatePresence>
          {mentionActive && filteredUsers.length > 0 && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute bottom-full left-0 mb-2 w-full max-w-sm z-50 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-dropdown)] overflow-hidden"
            >
              {/* Search header */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border-subtle)]">
                <Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">
                  {mentionQuery ? `Searching "${mentionQuery}"` : 'Tag a team member'}
                </span>
              </div>

              {/* User list */}
              <div className="max-h-52 overflow-y-auto py-1">
                {filteredUsers.map((user, idx) => (
                  <motion.button
                    key={user.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent textarea blur
                      insertMention(user);
                    }}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={`w-full flex items-center gap-4 px-4 py-2 text-left transition-colors duration-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                      idx === selectedIdx
                        ? 'bg-[var(--accent-700)]/10'
                        : 'hover:bg-[var(--bg-secondary)]'
                    }`}
                    aria-label={`Select ${user.fullName}`}
                  >
                    <div
                      className={`flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br ${getUserColor(user.id)} flex items-center justify-center text-white text-xs font-semibold`}
                    >
                      {getInitials(user.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {user.fullName}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {user.role} · {user.department}
                      </p>
                    </div>
                    {idx === selectedIdx && (
                      <kbd className="flex-shrink-0 text-2xs px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                        Enter
                      </kbd>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state for mention */}
        <AnimatePresence>
          {mentionActive && filteredUsers.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute bottom-full left-0 mb-2 w-full max-w-sm z-50 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-dropdown)] p-4 text-center"
            >
              <AtSign className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1" />
              <p className="text-sm text-[var(--text-muted)]">No matching team members</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
