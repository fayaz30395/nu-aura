'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { AppLayout } from '@/components/layout';
import { useCreateFluenceTemplate } from '@/lib/hooks/queries/useFluence';
import { notifications } from '@mantine/notifications';
import { Drawer, LoadingOverlay, TagsInput } from '@mantine/core';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Save,
  Send,
  Tag,
  Smile,
  Info,
} from 'lucide-react';
import { motion as dsMotion } from '@/lib/design-system';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

// Dynamically import the enhanced Fluence editor (no SSR — Tiptap requirement)
const FluenceEditor = dynamic(
  () => import('@/components/fluence/editor/FluenceEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[400px] animate-pulse">
        <div className="space-y-4 pt-4">
          <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4" />
          <div className="h-4 bg-[var(--bg-secondary)] rounded w-1/2" />
          <div className="h-4 bg-[var(--bg-secondary)] rounded w-5/6" />
        </div>
      </div>
    ),
  }
);

const createTemplateFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Template name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(255, 'Name must not exceed 255 characters'),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .or(z.literal('')),
  content: z.record(z.unknown()).default({
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }),
  tags: z.array(z.string().min(1).max(50)).optional().default([]),
  icon: z.string().optional().or(z.literal('')),
});

type CreateTemplateFormInput = z.infer<typeof createTemplateFormSchema>;

const TEMPLATE_ICONS = [
  '📄', '📋', '📝', '📊', '📈', '📉', '📅', '🗂️',
  '💼', '🎯', '🔧', '⚙️', '🚀', '💡', '📢', '🏷️',
  '✅', '📌', '🗒️', '📑', '🧾', '📎', '🔗', '🛠️',
];

export default function CreateTemplatePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const { mutate: createTemplate } = useCreateFluenceTemplate();

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTemplateFormInput>({
    resolver: zodResolver(createTemplateFormSchema),
    defaultValues: {
      name: '',
      description: '',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
      tags: [],
      icon: '',
    },
  });

  const name = watch('name');
  const selectedIcon = watch('icon');

  // Extract RHF register for name — we need to merge its ref + onChange
  const nameRegistration = register('name');

  // Auto-resize title textarea + chain RHF's onChange
  const handleTitleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
      // Call RHF's onChange so validation & dirty tracking work
      nameRegistration.onChange(e);
    },
    [nameRegistration]
  );

  // Handle Enter in title → focus editor
  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const editorEl = document.querySelector(
          '.fluence-editor-content .ProseMirror'
        ) as HTMLElement | null;
        editorEl?.focus();
      }
    },
    []
  );

  const onSubmit = (data: CreateTemplateFormInput) => {
    if (!data.content || Object.keys(data.content).length === 0) {
      notifications.show({
        title: 'Validation Error',
        message: 'Template content cannot be empty',
        color: 'red',
      });
      return;
    }

    setIsSubmitting(true);
    setSettingsDrawerOpen(false);
    createTemplate(
      {
        name: data.name,
        description: data.description || undefined,
        content: data.content,
        tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
        icon: data.icon || undefined,
      },
      {
        onSuccess: () => {
          notifications.show({
            title: 'Template Created',
            message: `"${data.name}" has been saved`,
            color: 'green',
          });
          router.push('/fluence/templates');
        },
        onError: () => {
          notifications.show({
            title: 'Error',
            message: 'Failed to create template. Please try again.',
            color: 'red',
          });
        },
        onSettled: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  // Validation error handler — shows toast so user knows what went wrong
  const onValidationError = () => {
    const firstError = errors.name?.message || errors.description?.message || 'Please check your input';
    notifications.show({
      title: 'Validation Error',
      message: firstError,
      color: 'orange',
    });
  };

  // Direct save handler — callable from any button without needing a <form>
  const handleSave = () => {
    handleSubmit(onSubmit, onValidationError)();
  };

  return (
    <AppLayout>
      <motion.div {...dsMotion.pageEnter} className="fluence-page-editor">
        {/* ── Top Action Bar ──────────────────────────────────────── */}
        <div className="fluence-page-topbar">
          <div className="fluence-page-topbar-left">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-secondary)]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="h-5 w-px bg-[var(--border-subtle)]" />

            {/* Template indicator */}
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-full">
              <FileText className="w-3 h-3" />
              New Template
            </span>
          </div>

          <div className="fluence-page-topbar-right">
            <button
              type="button"
              onClick={() => setSettingsDrawerOpen(true)}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-4 py-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <Tag className="w-4 h-4" />
              Settings
            </button>

            <PermissionGate permission={Permissions.KNOWLEDGE_TEMPLATE_CREATE}>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 text-sm font-medium text-white bg-accent-700 hover:bg-accent-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : 'Save Template'}
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* ── Content Canvas ───────────────────────────────────────── */}
        <div className="fluence-page-canvas">
          {/* Inline template name — big, borderless */}
          <div className="fluence-title-block">
            <textarea
              ref={nameRegistration.ref}
              name={nameRegistration.name}
              onBlur={nameRegistration.onBlur}
              onChange={handleTitleInput}
              onKeyDown={handleTitleKeyDown}
              placeholder="Template name"
              className="fluence-title-input"
              rows={1}
              autoFocus
            />
            {errors.name && (
              <p className="text-xs text-danger-500 mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* The Enhanced Editor */}
          <Controller
            control={control}
            name="content"
            render={({ field }) => (
              <FluenceEditor
                content={field.value}
                onChange={field.onChange}
                placeholder='Type "/" for commands, or just start writing your template content...'
              />
            )}
          />
        </div>

        {/* ── Template Settings Drawer (right side panel) ─────────── */}
        <Drawer
          opened={settingsDrawerOpen}
          onClose={() => setSettingsDrawerOpen(false)}
          title={
            <span className="text-lg font-semibold text-[var(--text-primary)]">
              Template Settings
            </span>
          }
          position="right"
          size="md"
          padding="lg"
        >
          <div className="space-y-6 h-full flex flex-col">
            <div className="flex-1 space-y-6">
              {/* Template name preview */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Template Name
                </label>
                <p className="text-sm text-[var(--text-primary)] font-medium">
                  {name || (
                    <span className="text-[var(--text-muted)] italic">
                      Untitled Template
                    </span>
                  )}
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  placeholder="Brief description of what this template is for..."
                  disabled={isSubmitting}
                  className="input-aura text-sm w-full min-h-[80px] resize-y"
                  rows={3}
                />
                {errors.description && (
                  <p className="text-xs text-danger-500 mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Icon picker */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  <Smile className="w-3 h-3 inline mr-1" />
                  Icon
                </label>
                <div className="grid grid-cols-8 gap-1">
                  {TEMPLATE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() =>
                        setValue('icon', selectedIcon === icon ? '' : icon)
                      }
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                        selectedIcon === icon
                          ? 'bg-accent-500/10 ring-1 ring-accent-500/30 scale-110'
                          : 'hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  <Tag className="w-3 h-3 inline mr-1" />
                  Tags
                </label>
                <Controller
                  control={control}
                  name="tags"
                  render={({ field }) => (
                    <TagsInput
                      {...field}
                      value={field.value ?? []}
                      placeholder="Type and press Enter to add tags"
                      disabled={isSubmitting}
                      maxTags={10}
                      clearable
                    />
                  )}
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Add up to 10 tags to help organize your template
                </p>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-4 rounded-lg bg-[var(--bg-secondary)]">
                <Info className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[var(--text-muted)]">
                  Templates are reusable document structures that your team can
                  use to quickly create new wiki pages with consistent
                  formatting.
                </p>
              </div>
            </div>

            {/* Save actions */}
            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
              <PermissionGate permission={Permissions.KNOWLEDGE_TEMPLATE_CREATE}>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-accent-700 hover:bg-accent-700 disabled:opacity-50 px-4 py-2.5 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Saving...' : 'Save Template'}
                </button>
              </PermissionGate>
              <button
                type="button"
                onClick={() => setSettingsDrawerOpen(false)}
                className="w-full text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2 transition-colors"
              >
                Continue Editing
              </button>
            </div>
          </div>
        </Drawer>

        <LoadingOverlay visible={isSubmitting} />
      </motion.div>
    </AppLayout>
  );
}
