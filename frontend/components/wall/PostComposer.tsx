'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, BarChart3, Award, X, Plus, Image, Smile, Paperclip } from 'lucide-react';
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

const pollOptionSchema = z.object({
  value: z.string().min(1, 'Option cannot be empty').max(500, 'Option must be 500 characters or less'),
});

const pollSchema = z.object({
  type: z.literal('POLL' as const),
  content: z.string().min(1, 'Poll question is required').max(500, 'Question must be 500 characters or less'),
  pollOptions: z
    .array(pollOptionSchema)
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

// ==================== Tab Config ====================

interface TabConfig {
  id: PostType;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  { id: 'POST', label: 'Post', icon: <Send className="w-4 h-4" /> },
  { id: 'POLL', label: 'Poll', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'PRAISE', label: 'Praise', icon: <Award className="w-4 h-4" /> },
];

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
      pollOptions: [{ value: '' }, { value: '' }],
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
      pollOptions: data.pollOptions.map((o) => o.value),
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

  return (
    <Card className="bg-[var(--bg-card)]" variant="default" padding="md">
      <CardContent className="p-0">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--border-subtle)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors relative',
                activeTab === tab.id
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="composerActiveTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content with Animation */}
        <AnimatePresence mode="wait">
          {/* POST TAB */}
          {activeTab === 'POST' && (
            <motion.div
              key="post"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <form onSubmit={postForm.handleSubmit(handlePostSubmit)} className="space-y-4 pt-4">
                <div>
                  <textarea
                    placeholder="Write something..."
                    {...postForm.register('content')}
                    rows={4}
                    className={cn(
                      'input-aura w-full resize-none',
                      postForm.formState.errors.content && 'border-danger-500 focus:ring-danger-500/50'
                    )}
                  />
                  {postForm.formState.errors.content && (
                    <p className="mt-1 text-xs text-danger-500">{postForm.formState.errors.content.message}</p>
                  )}
                </div>

                {/* Footer: media buttons + submit */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                      title="Add image"
                    >
                      <Image className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                      title="Add emoji"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                      title="Attach file"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                  </div>

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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <form onSubmit={pollForm.handleSubmit(handlePollSubmit)} className="space-y-4 pt-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Poll Question
                  </label>
                  <textarea
                    placeholder="Ask a question..."
                    {...pollForm.register('content')}
                    rows={2}
                    className={cn(
                      'input-aura w-full resize-none',
                      pollForm.formState.errors.content && 'border-danger-500 focus:ring-danger-500/50'
                    )}
                  />
                  {pollForm.formState.errors.content && (
                    <p className="mt-1 text-xs text-danger-500">{pollForm.formState.errors.content.message}</p>
                  )}
                </div>

                {/* Poll Options */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Options
                  </label>
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--text-muted)] w-6">{index + 1}.</span>
                        <input
                          {...pollForm.register(`pollOptions.${index}.value`)}
                          placeholder={`Option ${index + 1}`}
                          className={cn(
                            'input-aura flex-1',
                            pollForm.formState.errors.pollOptions?.[index]?.value && 'border-danger-500 focus:ring-danger-500/50'
                          )}
                        />
                        {fields.length > 2 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-950 rounded-lg transition-colors"
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
                      onClick={() => append({ value: '' })}
                      className="mt-2 flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Option
                    </button>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Controller
                      control={pollForm.control}
                      name="visibility"
                      render={({ field }) => (
                        <select
                          {...field}
                          className="input-aura text-sm py-1.5"
                        >
                          <option value="ORGANIZATION">Organization</option>
                          <option value="DEPARTMENT">Department</option>
                          <option value="TEAM">Team</option>
                        </select>
                      )}
                    />
                  </div>

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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <form onSubmit={praiseForm.handleSubmit(handlePraiseSubmit)} className="space-y-4 pt-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Praise for
                  </label>
                  <input
                    type="text"
                    placeholder="Search employee..."
                    {...praiseForm.register('praiseRecipientId')}
                    className={cn(
                      'input-aura w-full',
                      praiseForm.formState.errors.praiseRecipientId && 'border-danger-500 focus:ring-danger-500/50'
                    )}
                  />
                  {praiseForm.formState.errors.praiseRecipientId && (
                    <p className="mt-1 text-xs text-danger-500">{praiseForm.formState.errors.praiseRecipientId.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Your Message
                  </label>
                  <textarea
                    placeholder="Share your praise and appreciation..."
                    {...praiseForm.register('content')}
                    rows={4}
                    className={cn(
                      'input-aura w-full resize-none',
                      praiseForm.formState.errors.content && 'border-danger-500 focus:ring-danger-500/50'
                    )}
                  />
                  {praiseForm.formState.errors.content && (
                    <p className="mt-1 text-xs text-danger-500">{praiseForm.formState.errors.content.message}</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Controller
                      control={praiseForm.control}
                      name="visibility"
                      render={({ field }) => (
                        <select
                          {...field}
                          className="input-aura text-sm py-1.5"
                        >
                          <option value="ORGANIZATION">Organization</option>
                          <option value="DEPARTMENT">Department</option>
                          <option value="TEAM">Team</option>
                        </select>
                      )}
                    />
                  </div>

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
