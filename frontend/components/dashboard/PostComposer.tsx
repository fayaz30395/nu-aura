'use client';

import { useState, useRef, useEffect } from 'react';
import NextImage from 'next/image';
import {
  Edit3, BarChart3, Trophy, Image as ImageIcon, Smile, Paperclip, Send, Loader2,
  Plus, X, Search, Check,
} from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { wallService, CreatePostRequest } from '@/lib/services/core/wall.service';
import { wallKeys } from '@/lib/hooks/queries/useWall';
import { useEmployeeSearch } from '@/lib/hooks/queries/useEmployees';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';

type TabType = 'post' | 'poll' | 'praise';

// ─── Praise badge categories ────────────────────────────────────────
const PRAISE_CATEGORIES = [
  { id: 'team_player', label: 'Team Player', emoji: '🤝', color: 'bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-950 dark:text-accent-300 dark:border-accent-800' },
  { id: 'innovator', label: 'Innovator', emoji: '💡', color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-950 dark:text-warning-300 dark:border-warning-800' },
  { id: 'mentor', label: 'Mentor', emoji: '🎓', color: 'bg-accent-250 text-accent-900 border-accent-400 dark:bg-accent-900 dark:text-accent-500 dark:border-accent-900' },
  { id: 'go_getter', label: 'Go-Getter', emoji: '🚀', color: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-950 dark:text-success-300 dark:border-success-800' },
  { id: 'problem_solver', label: 'Problem Solver', emoji: '🧩', color: 'bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-950 dark:text-accent-300 dark:border-accent-800' },
  { id: 'customer_champion', label: 'Customer Champion', emoji: '⭐', color: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-950 dark:text-warning-300 dark:border-warning-800' },
  { id: 'culture_hero', label: 'Culture Hero', emoji: '🏆', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800' },
  { id: 'rising_star', label: 'Rising Star', emoji: '🌟', color: 'bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-950 dark:text-accent-300 dark:border-accent-800' },
] as const;

export { PRAISE_CATEGORIES };

interface PostComposerProps {
  onPostCreated?: () => void;
}

export function PostComposer({ onPostCreated }: PostComposerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('post');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // ─── Post state ──────────────────────────────────────────────
  const [postContent, setPostContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // ─── Poll state ──────────────────────────────────────────────
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // ─── Praise state ────────────────────────────────────────────
  const [praiseMessage, setPraiseMessage] = useState('');
  const [praiseCategory, setPraiseCategory] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<{
    id: string;
    fullName: string;
    avatarUrl?: string;
    designation?: string;
    department?: string;
  } | null>(null);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { data: searchResults } = useEmployeeSearch(recipientSearch, 0, 8, recipientSearch.length >= 2);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          recipientInputRef.current && !recipientInputRef.current.contains(e.target as Node)) {
        setShowRecipientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetAll = () => {
    setPostContent('');
    setPollQuestion('');
    setPollOptions(['', '']);
    setPraiseMessage('');
    setPraiseCategory(null);
    setSelectedRecipient(null);
    setRecipientSearch('');
    setIsFocused(false);
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    resetAll();
  };

  // ─── Handlers ────────────────────────────────────────────────

  const handlePost = async () => {
    if (!postContent.trim() || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const request: CreatePostRequest = {
        type: 'POST',
        content: postContent.trim(),
        visibility: 'ORGANIZATION',
      };
      await wallService.createPost(request);
      queryClient.invalidateQueries({ queryKey: wallKeys.posts() });
      notifications.show({ title: 'Posted!', message: 'Your post has been shared.', color: 'green' });
      resetAll();
      onPostCreated?.();
    } catch (error) {
      notifications.show({
        title: 'Failed to post',
        message: error instanceof Error ? error.message : 'Something went wrong.',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePoll = async () => {
    const validOptions = pollOptions.filter((o) => o.trim());
    if (!pollQuestion.trim() || validOptions.length < 2 || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const request: CreatePostRequest = {
        type: 'POLL',
        content: pollQuestion.trim(),
        visibility: 'ORGANIZATION',
        pollOptions: validOptions.map((o) => o.trim()),
      };
      await wallService.createPost(request);
      queryClient.invalidateQueries({ queryKey: wallKeys.posts() });
      notifications.show({ title: 'Poll created!', message: 'Your poll is now live.', color: 'green' });
      resetAll();
      onPostCreated?.();
    } catch (error) {
      notifications.show({
        title: 'Failed to create poll',
        message: error instanceof Error ? error.message : 'Something went wrong.',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendPraise = async () => {
    if (!selectedRecipient || !praiseCategory || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const categoryLabel = PRAISE_CATEGORIES.find((c) => c.id === praiseCategory)?.label ?? praiseCategory;
      const content = praiseMessage.trim() || `Recognized as ${categoryLabel}!`;
      const request: CreatePostRequest = {
        type: 'PRAISE',
        content,
        praiseRecipientId: selectedRecipient.id,
        celebrationType: praiseCategory,
        visibility: 'ORGANIZATION',
      };
      await wallService.createPost(request);
      queryClient.invalidateQueries({ queryKey: wallKeys.posts() });
      notifications.show({
        title: 'Praise sent!',
        message: `${selectedRecipient.fullName} has been recognized.`,
        color: 'green',
      });
      resetAll();
      onPostCreated?.();
    } catch (error) {
      notifications.show({
        title: 'Failed to send praise',
        message: error instanceof Error ? error.message : 'Something went wrong.',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll option helpers
  const addPollOption = () => {
    if (pollOptions.length < 10) setPollOptions([...pollOptions, '']);
  };
  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) setPollOptions(pollOptions.filter((_, i) => i !== index));
  };
  const updatePollOption = (index: number, value: string) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };

  const canSubmitPoll = pollQuestion.trim().length > 0 && pollOptions.filter((o) => o.trim()).length >= 2;
  const canSubmitPraise = !!selectedRecipient && !!praiseCategory;

  return (
    <div className="skeuo-card rounded-lg border border-[var(--border-main)]">
      {/* Tabs */}
      <div className="flex items-center border-b border-[var(--border-main)]">
        {([
          { key: 'post' as const, label: 'Post', icon: <Edit3 size={14} /> },
          { key: 'poll' as const, label: 'Poll', icon: <BarChart3 size={14} /> },
          { key: 'praise' as const, label: 'Praise', icon: <Trophy size={14} /> },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2',
              activeTab === tab.key
                ? 'border-accent-700 text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Post Tab ─────────────────────────────────────────── */}
      {activeTab === 'post' && (
        <div className="p-4 space-y-2">
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
              const container = e.currentTarget.closest('.space-y-2');
              if (container && e.relatedTarget && container.contains(e.relatedTarget as Node)) return;
              if (!postContent.trim()) setIsFocused(false);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handlePost(); }}
            placeholder="Write something..."
            className={cn('input-aura w-full resize-none transition-all', isFocused ? 'h-20' : 'h-10')}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button type="button" className="rounded p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Add image">
                <ImageIcon size={14} />
              </button>
              <button type="button" className="rounded p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Add emoji">
                <Smile size={14} />
              </button>
              <button type="button" className="rounded p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Attach file">
                <Paperclip size={14} />
              </button>
            </div>
            <button
              onClick={handlePost}
              disabled={!postContent.trim() || isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-700 px-4 py-2 text-xs font-semibold text-white hover:bg-accent-700 active:bg-accent-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {/* ── Poll Tab ─────────────────────────────────────────── */}
      {activeTab === 'poll' && (
        <div className="p-4 space-y-4">
          {/* Question */}
          <textarea
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="Ask a question..."
            className="input-aura w-full resize-none h-16"
            maxLength={500}
          />

          {/* Options */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Options</p>
            {pollOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-[var(--border-main)] text-[var(--text-muted)] text-xs shrink-0">
                  {index + 1}
                </div>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updatePollOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="input-aura flex-1"
                  maxLength={255}
                />
                {pollOptions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removePollOption(index)}
                    className="rounded p-1 text-[var(--text-muted)] hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 10 && (
              <button
                type="button"
                onClick={addPollOption}
                className="flex items-center gap-1.5 text-xs font-medium text-accent-700 hover:text-accent-700 transition-colors pl-7"
              >
                <Plus size={12} />
                Add option
              </button>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              onClick={handleCreatePoll}
              disabled={!canSubmitPoll || isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-700 px-4 py-2 text-xs font-semibold text-white hover:bg-accent-700 active:bg-accent-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
              {isSubmitting ? 'Creating...' : 'Create Poll'}
            </button>
          </div>
        </div>
      )}

      {/* ── Praise Tab ───────────────────────────────────────── */}
      {activeTab === 'praise' && (
        <div className="p-4 space-y-4">
          {/* Recipient search */}
          <div className="relative">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Who do you want to recognize?</p>
            {selectedRecipient ? (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-accent-200 bg-accent-50 dark:bg-accent-950 dark:border-accent-800">
                <div className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900 flex items-center justify-center text-sm font-semibold text-accent-700 dark:text-accent-300 overflow-hidden shrink-0">
                  {selectedRecipient.avatarUrl ? (
                    <NextImage src={selectedRecipient.avatarUrl} alt="" width={32} height={32} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    selectedRecipient.fullName.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{selectedRecipient.fullName}</p>
                  {selectedRecipient.designation && (
                    <p className="text-xs text-[var(--text-muted)] truncate">{selectedRecipient.designation}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedRecipient(null); setRecipientSearch(''); }}
                  className="rounded p-1 text-[var(--text-muted)] hover:text-danger-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    ref={recipientInputRef}
                    type="text"
                    value={recipientSearch}
                    onChange={(e) => { setRecipientSearch(e.target.value); setShowRecipientDropdown(true); }}
                    onFocus={() => recipientSearch.length >= 2 && setShowRecipientDropdown(true)}
                    placeholder="Search by name..."
                    className="input-aura w-full pl-8"
                  />
                </div>
                {showRecipientDropdown && searchResults && searchResults.content.length > 0 && (
                  <div ref={dropdownRef} className="absolute z-30 left-4 right-4 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] shadow-lg">
                    {searchResults.content
                      .filter((emp) => emp.id !== user?.employeeId)
                      .map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setSelectedRecipient({
                              id: emp.id,
                              fullName: `${emp.firstName} ${emp.lastName}`,
                              avatarUrl: emp.profilePhotoUrl,
                              designation: emp.designation,
                              department: emp.departmentName,
                            });
                            setRecipientSearch('');
                            setShowRecipientDropdown(false);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-xs font-semibold text-[var(--text-secondary)] overflow-hidden shrink-0">
                            {emp.profilePhotoUrl ? (
                              <NextImage src={emp.profilePhotoUrl} alt="" width={28} height={28} className="w-full h-full object-cover" unoptimized />
                            ) : (
                              emp.firstName?.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-[var(--text-primary)] truncate">{emp.firstName} {emp.lastName}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">{emp.designation || emp.departmentName}</p>
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
                  onClick={() => setPraiseCategory(praiseCategory === cat.id ? null : cat.id)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all',
                    praiseCategory === cat.id
                      ? `${cat.color} ring-2 ring-accent-400 ring-offset-1 dark:ring-offset-[var(--bg-card)]`
                      : 'border-[var(--border-main)] text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]'
                  )}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                  {praiseCategory === cat.id && <Check size={10} className="ml-0.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Message (optional) */}
          <textarea
            value={praiseMessage}
            onChange={(e) => setPraiseMessage(e.target.value)}
            placeholder="Add a message (optional)..."
            className="input-aura w-full resize-none h-16"
            maxLength={2000}
          />

          {/* Submit */}
          <div className="flex justify-end">
            <button
              onClick={handleSendPraise}
              disabled={!canSubmitPraise || isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-700 px-4 py-2 text-xs font-semibold text-white hover:bg-accent-700 active:bg-accent-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
              {isSubmitting ? 'Sending...' : 'Send Praise'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
