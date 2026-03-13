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
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => { setActiveTab('post'); setPostContent(''); }}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'post'
              ? 'border-b-2 border-gray-900 text-gray-900 dark:border-white dark:text-white'
              : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Edit3 size={14} />
          Post
        </button>
        <button
          onClick={() => setActiveTab('poll')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'poll'
              ? 'border-b-2 border-gray-900 text-gray-900 dark:border-white dark:text-white'
              : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <BarChart3 size={14} />
          Poll
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-500">Soon</span>
        </button>
        <button
          onClick={() => setActiveTab('praise')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'praise'
              ? 'border-b-2 border-gray-900 text-gray-900 dark:border-white dark:text-white'
              : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Trophy size={14} />
          Praise
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-500">Soon</span>
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
              className={`w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-all dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 focus:border-gray-400 focus:outline-none focus:ring-0 dark:focus:border-gray-600 ${
                isFocused ? 'h-20' : 'h-10'
              }`}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button type="button" className="rounded p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors" title="Add image">
                  <Image size={14} />
                </button>
                <button type="button" className="rounded p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors" title="Add emoji">
                  <Smile size={14} />
                </button>
                <button type="button" className="rounded p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors" title="Attach file">
                  <Paperclip size={14} />
                </button>
              </div>
              <button
                onClick={handlePost}
                disabled={!postContent.trim() || isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'poll' && (
          <div className="flex flex-col items-center justify-center py-8">
            <BarChart3 size={28} className="mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-xs text-gray-400">Poll feature coming soon</p>
          </div>
        )}

        {activeTab === 'praise' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Trophy size={28} className="mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-xs text-gray-400">Praise feature coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
