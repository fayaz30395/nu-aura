'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, BarChart3, Award, X, Plus, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/hooks/useAuth';
import { CreatePostRequest, PostType, PostVisibility } from '@/lib/services/wall.service';
import { cn } from '@/lib/utils';

// ==================== Zod Schemas ====================

const postSchema = z.object({
  type: z.literal('POST' as const),
  content: z.string().min(1, 'Post content is required').max(2000, 'Post must be 2000 characters or less'),
  visibility: z.enum(['ORGANIZATION', 'DEPARTMENT', 'TEAM'] as const),
});

const pollSchema = z.object({
  type: z.literal('POLL' as const),
  content: z.string().min(1, 'Poll question is required').max(500, 'Question must be 500 characters or less'),
  pollOptions: z
    .array(z.string().min(1, 'Option cannot be empty').max(500, 'Option must be 500 characters or less'))
    .min(2, 'At least 2 options are required')
    .max(6, 'Maximum 6 options allowed'),
  visibility: z.enum(['ORGANIZATION', 'DEPARTMENT', 'TEAM'] as const),
});

const praiseSchema = z.object({
  type: z.literal('PRAISE' as const),
  content: z.string().min(1, 'Praise message is required').max(2000, 'Message must be 2000 characters or less'),
  praiseRecipientId: z.string().min(1, 'Please select an employee'),
  visibility: z.enum(['ORGANIZATION', 'DEPARTMENT', 'TEAM'] as const),
});

type PostFormData = z.infer<typeof postSchema>;
type PollFormData = z.infer<typeof pollSchema>;
type PraiseFormData = z.infer<typeof praiseSchema>;

// ==================== Props ====================

interface PostComposerProps {
  onSubmit: (data: CreatePostRequest) => void;
  isSubmitting: boolean;
}

// ==================== Component ====================

export function PostComposer({ onSubmit, isSubmitting }: PostComposerProps): React.ReactElement {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<PostType>('POST');

  // Initialize forms for each tab
  const postForm = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      type: 'POST',
      content: '',
      visibility: 'ORGANIZATION',
    },
  });

  const pollForm = useForm<PollFormData>({
    resolver: zodResolver(pollSchema),
    defaultValues: {
      type: 'POLL',
      content: '',
      pollOptions: ['', ''],
      visibility: 'ORGANIZATION',
    },
  });

  const praiseForm = useForm<PraiseFormData>({
    resolver: zodResolver(praiseSchema),
    defaultValues: {
      type: 'PRAISE',
      content: '',
      praiseRecipientId: '',
      visibility: 'ORGANIZATION',
    },
  });

  // Field array for poll options
  const { fields, append, remove } = useFieldArray({
    control: pollForm.control,
    name: 'pollOptions',
  });

  // Handle post submission
  const handlePostSubmit = (data: PostFormData): void => {
    const request: CreatePostRequest = {
      type: 'POST',
      content: data.content,
      visibility: data.visibility,
    };
    onSubmit(request);
    postForm.reset();
  };

  // Handle poll submission
  const handlePollSubmit = (data: PollFormData): void => {
    const request: CreatePostRequest = {
      type: 'POLL',
      content: data.content,
      pollOptions: data.pollOptions,
      visibility: data.visibility,
    };
    onSubmit(request);
    pollForm.reset();
  };

  // Handle praise submission
  const handlePraiseSubmit = (data: PraiseFormData): void => {
    const request: CreatePostRequest = {
      type: 'PRAISE',
      content: data.content,
      praiseRecipientId: data.praiseRecipientId,
      visibility: data.visibility,
    };
    onSubmit(request);
    praiseForm.reset();
  };

  // Get user initials for avatar
  const getUserInitials = (): string => {
    if (!user) return 'U';
    const names = user.fullName.split(' ');
    return names.map((n) => n.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  return (
    <Card className="mb-6 bg-white dark:bg-surface-800" variant="default" padding="md">
      <CardContent className="p-0">
        {/* Header with user info */}
        <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900">
            <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">{getUserInitials()}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-surface-900 dark:text-surface-50">{user?.fullName || 'User'}</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">{user?.employeeId || 'Employee'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 mb-4 border-b border-surface-200 dark:border-surface-700">
          <button
            onClick={() => setActiveTab('POST')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors relative',
              activeTab === 'POST'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'
            )}
          >
            Post
            {activeTab === 'POST' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('POLL')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors relative',
              activeTab === 'POLL'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'
            )}
          >
            Poll
            {activeTab === 'POLL' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('PRAISE')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors relative',
              activeTab === 'PRAISE'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'
            )}
          >
            Praise
            {activeTab === 'PRAISE' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        </div>

        {/* Tab Content with Animation */}
        <AnimatePresence mode="wait">
          {/* POST TAB */}
          {activeTab === 'POST' && (
            <motion.div
              key="post"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <form onSubmit={postForm.handleSubmit(handlePostSubmit)} className="space-y-4">
                <div>
                  <textarea
                    placeholder="What's on your mind?"
                    {...postForm.register('content')}
                    rows={4}
                    className={cn(
                      'w-full px-3 py-2 text-sm border rounded-lg bg-surface-50 dark:bg-surface-900 dark:text-surface-50',
                      'border-surface-200 dark:border-surface-700',
                      'placeholder-surface-400 dark:placeholder-surface-500',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
                      'resize-none',
                      postForm.formState.errors.content && 'border-danger-500 focus:ring-danger-500/50'
                    )}
                  />
                  {postForm.formState.errors.content && (
                    <p className="mt-1 text-xs text-danger-500">{postForm.formState.errors.content.message}</p>
                  )}
                </div>

                {/* Visibility Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Visible to:</label>
                  <Controller
                    control={postForm.control}
                    name="visibility"
                    render={({ field }) => (
                      <select
                        {...field}
                        className={cn(
                          'px-3 py-2 text-sm border rounded-lg bg-white dark:bg-surface-900 dark:text-surface-50',
                          'border-surface-200 dark:border-surface-700',
                          'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500'
                        )}
                      >
                        <option value="ORGANIZATION">Organization</option>
                        <option value="DEPARTMENT">Department</option>
                        <option value="TEAM">Team</option>
                      </select>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    loadingText="Posting..."
                    leftIcon={<Send className="w-4 h-4" />}
                    variant="primary"
                    size="md"
                  >
                    Post
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {/* POLL TAB */}
          {activeTab === 'POLL' && (
            <motion.div
              key="poll"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <form onSubmit={pollForm.handleSubmit(handlePollSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Poll Question
                  </label>
                  <textarea
                    placeholder="Ask a question..."
                    {...pollForm.register('content')}
                    rows={3}
                    className={cn(
                      'w-full px-3 py-2 text-sm border rounded-lg bg-surface-50 dark:bg-surface-900 dark:text-surface-50',
                      'border-surface-200 dark:border-surface-700',
                      'placeholder-surface-400 dark:placeholder-surface-500',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
                      'resize-none',
                      pollForm.formState.errors.content && 'border-danger-500 focus:ring-danger-500/50'
                    )}
                  />
                  {pollForm.formState.errors.content && (
                    <p className="mt-1 text-xs text-danger-500">{pollForm.formState.errors.content.message}</p>
                  )}
                </div>

                {/* Poll Options */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Options
                  </label>
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-surface-500 dark:text-surface-400 w-6">{index + 1}.</span>
                        <input
                          {...pollForm.register(`pollOptions.${index}`)}
                          placeholder={`Option ${index + 1}`}
                          className={cn(
                            'flex-1 px-3 py-2 text-sm border rounded-lg bg-surface-50 dark:bg-surface-900 dark:text-surface-50',
                            'border-surface-200 dark:border-surface-700',
                            'placeholder-surface-400 dark:placeholder-surface-500',
                            'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
                            pollForm.formState.errors.pollOptions?.[index] && 'border-danger-500 focus:ring-danger-500/50'
                          )}
                        />
                        {fields.length > 2 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-1.5 text-surface-500 hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-950 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {pollForm.formState.errors.pollOptions && (
                    <p className="mt-1 text-xs text-danger-500">{pollForm.formState.errors.pollOptions.message}</p>
                  )}

                  {/* Add Option Button */}
                  {fields.length < 6 && (
                    <button
                      type="button"
                      onClick={() => append('')}
                      className="mt-2 flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Option
                    </button>
                  )}
                </div>

                {/* Visibility Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Visible to:</label>
                  <Controller
                    control={pollForm.control}
                    name="visibility"
                    render={({ field }) => (
                      <select
                        {...field}
                        className={cn(
                          'px-3 py-2 text-sm border rounded-lg bg-white dark:bg-surface-900 dark:text-surface-50',
                          'border-surface-200 dark:border-surface-700',
                          'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500'
                        )}
                      >
                        <option value="ORGANIZATION">Organization</option>
                        <option value="DEPARTMENT">Department</option>
                        <option value="TEAM">Team</option>
                      </select>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    loadingText="Creating..."
                    leftIcon={<BarChart3 className="w-4 h-4" />}
                    variant="primary"
                    size="md"
                  >
                    Create Poll
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {/* PRAISE TAB */}
          {activeTab === 'PRAISE' && (
            <motion.div
              key="praise"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <form onSubmit={praiseForm.handleSubmit(handlePraiseSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Praise for
                  </label>
                  <input
                    type="text"
                    placeholder="Enter employee ID"
                    {...praiseForm.register('praiseRecipientId')}
                    className={cn(
                      'w-full px-3 py-2 text-sm border rounded-lg bg-surface-50 dark:bg-surface-900 dark:text-surface-50',
                      'border-surface-200 dark:border-surface-700',
                      'placeholder-surface-400 dark:placeholder-surface-500',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
                      praiseForm.formState.errors.praiseRecipientId && 'border-danger-500 focus:ring-danger-500/50'
                    )}
                  />
                  {praiseForm.formState.errors.praiseRecipientId && (
                    <p className="mt-1 text-xs text-danger-500">{praiseForm.formState.errors.praiseRecipientId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Your Message
                  </label>
                  <textarea
                    placeholder="Share your praise and appreciation..."
                    {...praiseForm.register('content')}
                    rows={4}
                    className={cn(
                      'w-full px-3 py-2 text-sm border rounded-lg bg-surface-50 dark:bg-surface-900 dark:text-surface-50',
                      'border-surface-200 dark:border-surface-700',
                      'placeholder-surface-400 dark:placeholder-surface-500',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
                      'resize-none',
                      praiseForm.formState.errors.content && 'border-danger-500 focus:ring-danger-500/50'
                    )}
                  />
                  {praiseForm.formState.errors.content && (
                    <p className="mt-1 text-xs text-danger-500">{praiseForm.formState.errors.content.message}</p>
                  )}
                </div>

                {/* Visibility Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Visible to:</label>
                  <Controller
                    control={praiseForm.control}
                    name="visibility"
                    render={({ field }) => (
                      <select
                        {...field}
                        className={cn(
                          'px-3 py-2 text-sm border rounded-lg bg-white dark:bg-surface-900 dark:text-surface-50',
                          'border-surface-200 dark:border-surface-700',
                          'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500'
                        )}
                      >
                        <option value="ORGANIZATION">Organization</option>
                        <option value="DEPARTMENT">Department</option>
                        <option value="TEAM">Team</option>
                      </select>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    loadingText="Sending..."
                    leftIcon={<Award className="w-4 h-4" />}
                    variant="primary"
                    size="md"
                  >
                    Send Praise
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
