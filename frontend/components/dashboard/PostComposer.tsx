'use client';

import { useState } from 'react';
import { Edit3, BarChart3, Trophy, Image, Smile, Paperclip, Send, Loader2 } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { wallService, CreatePostRequest } from '@/lib/services/wall.service';
import { wallKeys } from '@/lib/hooks/queries/useWall';
import { cn } from '@/lib/utils';

type TabType = 'post' | 'poll' | 'praise';

interface PostComposerProps {
  onPostCreated?: () => void;
}

export function PostComposer({ onPostCreated }: PostComposerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('post');
  const [postContent, setPostContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

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

      // Invalidate wall post cache so feed updates
      queryClient.invalidateQueries({ queryKey: wallKeys.posts() });

      notifications.show({
        title: 'Posted!',
        message: 'Your post has been shared with the organization.',
        color: 'green',
      });
      setPostContent('');
      setIsFocused(false);
      onPostCreated?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      notifications.show({
        title: 'Failed to post',
        message: errorMessage,
        color: 'red',
      });
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
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2',
            activeTab === 'post'
              ? 'border-primary-600 text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          <Edit3 size={14} />
          Post
        </button>
        <button
          onClick={() => setActiveTab('poll')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2',
            activeTab === 'poll'
              ? 'border-primary-600 text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          <BarChart3 size={14} />
          Poll
          <span className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-xs text-[var(--text-muted)] font-medium border border-[var(--border-subtle)]">
            Soon
          </span>
        </button>
        <button
          onClick={() => setActiveTab('praise')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2',
            activeTab === 'praise'
              ? 'border-primary-600 text-[var(--text-primary)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          <Trophy size={14} />
          Praise
          <span className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-xs text-[var(--text-muted)] font-medium border border-[var(--border-subtle)]">
            Soon
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'post' && (
          <div className="space-y-2">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={(e) => {
                // Don't collapse if focus moved to a sibling element (e.g. Post button, toolbar)
                // relatedTarget is the element receiving focus next
                const container = e.currentTarget.closest('.space-y-2');
                if (container && e.relatedTarget && container.contains(e.relatedTarget as Node)) {
                  return;
                }
                // Only collapse if content is empty
                if (!postContent.trim()) {
                  setIsFocused(false);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Write something..."
              className={cn(
                'input-aura w-full resize-none transition-all',
                isFocused ? 'h-20' : 'h-10'
              )}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  title="Add image"
                >
                  <Image size={14} />
                </button>
                <button
                  type="button"
                  className="rounded p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  title="Add emoji"
                >
                  <Smile size={14} />
                </button>
                <button
                  type="button"
                  className="rounded p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  title="Attach file"
                >
                  <Paperclip size={14} />
                </button>
              </div>
              <button
                onClick={handlePost}
                disabled={!postContent.trim() || isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'poll' && (
          <div className="flex flex-col items-center justify-center py-8">
            <BarChart3 size={28} className="mb-2 text-[var(--text-muted)]" />
            <p className="text-xs text-[var(--text-muted)]">Poll feature coming soon</p>
          </div>
        )}

        {activeTab === 'praise' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Trophy size={28} className="mb-2 text-[var(--text-muted)]" />
            <p className="text-xs text-[var(--text-muted)]">Praise feature coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
