'use client';

import {useEffect, useRef, useState} from 'react';
import {BarChart3, Edit3, Trophy} from 'lucide-react';
import {notifications} from '@mantine/notifications';
import {useQueryClient} from '@tanstack/react-query';
import {CreatePostRequest, wallService} from '@/lib/services/core/wall.service';
import {wallKeys} from '@/lib/hooks/queries/useWall';
import {useEmployeeSearch} from '@/lib/hooks/queries/useEmployees';
import {useAuth} from '@/lib/hooks/useAuth';
import {cn} from '@/lib/utils';
import {ComposerTextarea} from './_composer/ComposerTextarea';
import {ComposerPoll} from './_composer/ComposerPoll';
import {ComposerPraise, type PraiseRecipient} from './_composer/ComposerPraise';
import {PRAISE_CATEGORIES} from './_composer/praiseCategories';

// Re-export for external consumers (FeedCard and others)
export {PRAISE_CATEGORIES};

type TabType = 'post' | 'poll' | 'praise';

interface PostComposerProps {
  onPostCreated?: () => void;
}

export function PostComposer({onPostCreated}: PostComposerProps) {
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
  const [selectedRecipient, setSelectedRecipient] = useState<PraiseRecipient | null>(null);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {user} = useAuth();
  const {data: searchResults} = useEmployeeSearch(recipientSearch, 0, 8, recipientSearch.length >= 2);

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
      queryClient.invalidateQueries({queryKey: wallKeys.posts()});
      notifications.show({title: 'Posted!', message: 'Your post has been shared.', color: 'green'});
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
      queryClient.invalidateQueries({queryKey: wallKeys.posts()});
      notifications.show({title: 'Poll created!', message: 'Your poll is now live.', color: 'green'});
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
      queryClient.invalidateQueries({queryKey: wallKeys.posts()});
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

  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const container = e.currentTarget.closest('.space-y-2');
    if (container && e.relatedTarget && container.contains(e.relatedTarget as Node)) return;
    if (!postContent.trim()) setIsFocused(false);
  };

  const handleRecipientSearchChange = (value: string) => {
    setRecipientSearch(value);
    setShowRecipientDropdown(true);
  };

  const handleRecipientFocus = () => {
    if (recipientSearch.length >= 2) setShowRecipientDropdown(true);
  };

  const handleSelectRecipient = (recipient: PraiseRecipient) => {
    setSelectedRecipient(recipient);
    setRecipientSearch('');
    setShowRecipientDropdown(false);
  };

  const handleClearRecipient = () => {
    setSelectedRecipient(null);
    setRecipientSearch('');
  };

  const handleTogglePraiseCategory = (categoryId: string) => {
    setPraiseCategory(praiseCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="skeuo-card rounded-lg border border-[var(--border-main)]">
      {/* Tabs */}
      <div className="flex items-center border-b border-[var(--border-main)]">
        {([
          {key: 'post' as const, label: 'Post', icon: <Edit3 size={14}/>},
          {key: 'poll' as const, label: 'Poll', icon: <BarChart3 size={14}/>},
          {key: 'praise' as const, label: 'Praise', icon: <Trophy size={14}/>},
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2',
              activeTab === tab.key
                ? 'border-[var(--accent-primary)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'post' && (
        <ComposerTextarea
          value={postContent}
          isFocused={isFocused}
          isSubmitting={isSubmitting}
          onChange={setPostContent}
          onFocus={() => setIsFocused(true)}
          onBlur={handleTextareaBlur}
          onSubmit={handlePost}
        />
      )}
      {activeTab === 'poll' && (
        <ComposerPoll
          question={pollQuestion}
          options={pollOptions}
          canSubmit={canSubmitPoll}
          isSubmitting={isSubmitting}
          onQuestionChange={setPollQuestion}
          onOptionChange={updatePollOption}
          onAddOption={addPollOption}
          onRemoveOption={removePollOption}
          onSubmit={handleCreatePoll}
        />
      )}
      {activeTab === 'praise' && (
        <ComposerPraise
          selectedRecipient={selectedRecipient}
          recipientSearch={recipientSearch}
          showRecipientDropdown={showRecipientDropdown}
          searchResults={searchResults}
          currentUserEmployeeId={user?.employeeId}
          praiseCategory={praiseCategory}
          praiseMessage={praiseMessage}
          canSubmit={canSubmitPraise}
          isSubmitting={isSubmitting}
          recipientInputRef={recipientInputRef}
          dropdownRef={dropdownRef}
          onRecipientSearchChange={handleRecipientSearchChange}
          onRecipientFocus={handleRecipientFocus}
          onSelectRecipient={handleSelectRecipient}
          onClearRecipient={handleClearRecipient}
          onTogglePraiseCategory={handleTogglePraiseCategory}
          onPraiseMessageChange={setPraiseMessage}
          onSubmit={handleSendPraise}
        />
      )}
    </div>
  );
}
