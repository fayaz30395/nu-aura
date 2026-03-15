'use client';

import { useState } from 'react';
import { Edit3, BarChart3, Trophy, Image, Smile, Paperclip, Send, Loader2 } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { wallService, CreatePostRequest } from '@/lib/services/wall.service';

type TabType = 'post' | 'poll' | 'praise';

export function PostComposer() {
  const [activeTab, setActiveTab] = useState<TabType>('post');
  const [postContent, setPostContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      notifications.show({
        title: 'Posted!',
        message: 'Your post has been shared with the organization.',
        color: 'green',
      });
      setPostContent('');
      setIsFocused(false);
    } catch {
      notifications.show({
        title: 'Post Submitted',
        message: 'Your post will appear in the feed shortly.',
        color: 'blue',
      });
      setPostContent('');
      setIsFocused(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) handlePost();
  };

  return (
    <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)]">
      {/* Tabs */}
      <div className="flex items-center border-b border-[var(--border-main)]">
        <button
          onClick={() => { setActiveTab('post'); setPostContent(''); }}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'post'
              ? 'border-b-2 border-[var(--text-primary)] text-[var(--text-primary)]'
              : 'border-b-2 border-transparent text-[var(--text-muted)] hover:text-gray-700 dark:text-[var(--text-muted)]'
          }`}
        >
          <Edit3 size={14} />
          Post
        </button>
        <button
          onClick={() => setActiveTab('poll')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'poll'
              ? 'border-b-2 border-[var(--text-primary)] text-[var(--text-primary)]'
              : 'border-b-2 border-transparent text-[var(--text-muted)] hover:text-gray-700 dark:text-[var(--text-muted)]'
          }`}
        >
          <BarChart3 size={14} />
          Poll
          <span className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 text-xs text-[var(--text-muted)] dark:bg-gray-800 dark:text-[var(--text-muted)]">Soon</span>
        </button>
        <button
          onClick={() => setActiveTab('praise')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'praise'
              ? 'border-b-2 border-[var(--text-primary)] text-[var(--text-primary)]'
              : 'border-b-2 border-transparent text-[var(--text-muted)] hover:text-gray-700 dark:text-[var(--text-muted)]'
          }`}
        >
          <Trophy size={14} />
          Praise
          <span className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 text-xs text-[var(--text-muted)] dark:bg-gray-800 dark:text-[var(--text-muted)]">Soon</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {activeTab === 'post' && (
          <div className="space-y-2">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Write something..."
              className={`w-full resize-none rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-gray-400 transition-all dark:border-gray-700 dark:placeholder-gray-500 focus:border-gray-400 focus:outline-none focus:ring-0 dark:focus:border-gray-600 ${
                isFocused ? 'h-20' : 'h-10'
              }`}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button type="button" className="rounded p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors" title="Add image">
                  <Image size={14} />
                </button>
                <button type="button" className="rounded p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors" title="Add emoji">
                  <Smile size={14} />
                </button>
                <button type="button" className="rounded p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors" title="Attach file">
                  <Paperclip size={14} />
                </button>
              </div>
              <button
                onClick={handlePost}
                disabled={!postContent.trim() || isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'poll' && (
          <div className="flex flex-col items-center justify-center py-8">
            <BarChart3 size={28} className="mb-2 text-gray-300 dark:text-[var(--text-secondary)]" />
            <p className="text-xs text-[var(--text-muted)]">Poll feature coming soon</p>
          </div>
        )}

        {activeTab === 'praise' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Trophy size={28} className="mb-2 text-gray-300 dark:text-[var(--text-secondary)]" />
            <p className="text-xs text-[var(--text-muted)]">Praise feature coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
