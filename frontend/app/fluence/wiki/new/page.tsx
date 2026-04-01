'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { AppLayout } from '@/components/layout';
import { useCreateWikiPage, useWikiSpaces } from '@/lib/hooks/queries/useFluence';
import { notifications } from '@mantine/notifications';
import { Select, Drawer, LoadingOverlay } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronDown,
  Globe,
  Building2,
  Lock,
  Shield,
  Eye,
  FileText,
  Save,
  Send,
} from 'lucide-react';
import { isAxiosError } from '@/lib/utils/type-guards';
import AccessControlSection from '@/components/fluence/AccessControlSection';
import { motion as dsMotion } from '@/lib/design-system';

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

const createWikiPageSchema = z.object({
  title: z.string().min(1, 'Title is required').min(3, 'Title must be at least 3 characters'),
  spaceId: z.string().min(1, 'Space is required'),
  visibility: z.enum(['PUBLIC', 'ORGANIZATION', 'DEPARTMENT', 'PRIVATE', 'RESTRICTED'], {
    errorMap: () => ({ message: 'Invalid visibility option' }),
  }),
  parentId: z.string().optional(),
  content: z.record(z.unknown()).default({
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }),
});

type CreateWikiPageInput = z.infer<typeof createWikiPageSchema>;

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', icon: Globe, desc: 'Anyone can view' },
  { value: 'ORGANIZATION', label: 'Organization', icon: Building2, desc: 'All org members' },
  { value: 'DEPARTMENT', label: 'Department', icon: Building2, desc: 'Your department only' },
  { value: 'PRIVATE', label: 'Private', icon: Lock, desc: 'Only you' },
  { value: 'RESTRICTED', label: 'Restricted', icon: Shield, desc: 'Specific people' },
] as const;

export default function CreateWikiPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishDrawerOpen, setPublishDrawerOpen] = useState(false);
  const { hasAnyPermission, isReady } = usePermissions();

  const hasAccess = hasAnyPermission(
    Permissions.WIKI_CREATE,
    Permissions.KNOWLEDGE_WIKI_CREATE,
    Permissions.KNOWLEDGE_MANAGE,
  );

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAccess, router]);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const { mutate: createWikiPage } = useCreateWikiPage();
  const { data: spacesData, isLoading: spacesLoading } = useWikiSpaces(0, 100);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateWikiPageInput>({
    resolver: zodResolver(createWikiPageSchema),
    defaultValues: {
      title: '',
      spaceId: '',
      visibility: 'ORGANIZATION',
      parentId: '',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
    },
  });

  const visibility = watch('visibility');
  const title = watch('title');
  const spaces = spacesData?.content || [];
  const [sharedDepartmentIds, setSharedDepartmentIds] = useState<string[]>([]);
  const [sharedEmployeeIds, setSharedEmployeeIds] = useState<string[]>([]);

  // Auto-resize title textarea
  const handleTitleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
      setValue('title', el.value);
    },
    [setValue]
  );

  // Handle Enter in title → focus editor
  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const editorEl = document.querySelector('.fluence-editor-content .ProseMirror') as HTMLElement | null;
        editorEl?.focus();
      }
    },
    []
  );

  if (!isReady || !hasAccess) return null;

  const onSubmit = async (data: CreateWikiPageInput) => {
    if (!data.content || Object.keys(data.content).length === 0) {
      notifications.show({ title: 'Validation Error', message: 'Content cannot be empty', color: 'red' });
      return;
    }

    setIsSubmitting(true);
    try {
      createWikiPage(
        {
          title: data.title,
          spaceId: data.spaceId,
          visibility: data.visibility,
          parentId: data.parentId,
          content: data.content,
          status: 'DRAFT',
          sharedWithDepartmentIds: sharedDepartmentIds.length > 0 ? sharedDepartmentIds : undefined,
          sharedWithEmployeeIds: sharedEmployeeIds.length > 0 ? sharedEmployeeIds : undefined,
        },
        {
          onSuccess: (page) => {
            notifications.show({ title: 'Page Created', message: 'Your wiki page has been saved', color: 'green' });
            router.push(`/fluence/wiki/${page.id}`);
          },
          onError: (error: unknown) => {
            const message =
              isAxiosError(error) &&
              typeof error.response?.data === 'object' &&
              error.response?.data !== null &&
              'message' in error.response.data
                ? ((error.response.data as { message?: string }).message ?? 'Failed to create wiki page')
                : 'Failed to create wiki page';
            notifications.show({ title: 'Error', message, color: 'red' });
          },
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVisibility = VISIBILITY_OPTIONS.find((v) => v.value === visibility);
  const VisIcon = selectedVisibility?.icon ?? Globe;

  return (
    <AppLayout>
      <motion.div {...dsMotion.pageEnter} className="fluence-page-editor">
        {/* ── Top Action Bar (Confluence-like) ──────────────────── */}
        <div className="fluence-page-topbar">
          <div className="fluence-page-topbar-left">
            <button
              onClick={() => router.back()}
              aria-label="Go back"
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="h-5 w-px bg-[var(--border-subtle)]" />

            {/* Draft indicator */}
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-full">
              <FileText className="w-3 h-3" />
              Draft
            </span>

            {/* Visibility badge — click to open settings drawer */}
            <button
              onClick={() => setPublishDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] px-2.5 py-1 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
            >
              <VisIcon className="w-3 h-3" />
              {selectedVisibility?.label ?? 'Organization'}
              <ChevronDown className="w-3 h-3 opacity-50" />
            </button>
          </div>

          <div className="fluence-page-topbar-right">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-4 py-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] px-4 py-2 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>

            <button
              type="button"
              onClick={() => setPublishDrawerOpen(true)}
              className="inline-flex items-center gap-2 text-sm font-medium text-white bg-accent-700 hover:bg-accent-800 px-4 py-2 rounded-lg transition-colors shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
            >
              <Send className="w-4 h-4" />
              Publish
            </button>
          </div>
        </div>

        {/* ── Content Canvas (Confluence-like clean writing area) ── */}
        <div className="fluence-page-canvas">
          {/* Inline page title — big, borderless, like Confluence */}
          <div className="fluence-title-block">
            <textarea
              ref={titleRef}
              {...register('title')}
              onChange={handleTitleInput}
              onKeyDown={handleTitleKeyDown}
              placeholder="Untitled"
              className="fluence-title-input"
              rows={1}
              autoFocus
            />

            {errors.title && (
              <p className="text-xs text-danger-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* The Enhanced Editor — slash commands + floating toolbar */}
          <Controller
            control={control}
            name="content"
            render={({ field }) => (
              <FluenceEditor
                content={field.value}
                onChange={field.onChange}
                placeholder='Type "/" for commands, or just start writing...'
              />
            )}
          />
        </div>

        {/* ── Publish Settings Drawer (right side panel) ──────── */}
        <Drawer
          opened={publishDrawerOpen}
          onClose={() => setPublishDrawerOpen(false)}
          title={<span className="text-lg font-semibold text-[var(--text-primary)]">Page Settings</span>}
          position="right"
          size="md"
          padding="lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 h-full flex flex-col">
            <div className="flex-1 space-y-6">
              {/* Title preview */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Page Title
                </label>
                <p className="text-sm text-[var(--text-primary)] font-medium">
                  {title || <span className="text-[var(--text-muted)] italic">Untitled</span>}
                </p>
              </div>

              {/* Space */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Space
                </label>
                <Controller
                  control={control}
                  name="spaceId"
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="Select a space"
                      disabled={spacesLoading || isSubmitting}
                      error={errors.spaceId?.message}
                      data={spaces.map((space) => ({
                        value: space.id,
                        label: space.name,
                      }))}
                    />
                  )}
                />
              </div>

              {/* Visibility — visual radio cards */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Visibility
                </label>
                <Controller
                  control={control}
                  name="visibility"
                  render={({ field }) => (
                    <div className="space-y-1" role="radiogroup" aria-label="Visibility">
                      {VISIBILITY_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = field.value === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => field.onChange(opt.value)}
                            className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)] ${
                              isSelected
                                ? 'bg-accent-500/10 ring-1 ring-accent-500/30'
                                : 'hover:bg-[var(--bg-secondary)]'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-accent-500' : 'text-[var(--text-muted)]'}`} />
                            <div className="flex-1">
                              <div className={`text-sm font-medium ${isSelected ? 'text-accent-500' : 'text-[var(--text-primary)]'}`}>
                                {opt.label}
                              </div>
                              <div className="text-xs text-[var(--text-muted)]">{opt.desc}</div>
                            </div>
                            {isSelected && (
                              <motion.div layoutId="visibility-check" className="w-2 h-2 rounded-full bg-accent-500" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
              </div>

              {/* Access control — animated reveal */}
              <AnimatePresence>
                {(visibility === 'DEPARTMENT' || visibility === 'RESTRICTED') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <AccessControlSection
                      visibility={visibility}
                      sharedWithDepartmentIds={sharedDepartmentIds}
                      sharedWithEmployeeIds={sharedEmployeeIds}
                      onDepartmentIdsChange={setSharedDepartmentIds}
                      onEmployeeIdsChange={setSharedEmployeeIds}
                      disabled={isSubmitting}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Parent page */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Parent Page (Optional)
                </label>
                <input
                  {...register('parentId')}
                  placeholder="Search for a parent page..."
                  disabled={isSubmitting}
                  className="input-aura text-sm"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">Leave empty for a top-level page</p>
              </div>
            </div>

            {/* Publish actions */}
            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-accent-700 hover:bg-accent-800 disabled:opacity-50 px-4 py-2.5 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Publishing...' : 'Publish Page'}
              </button>
              <button
                type="button"
                onClick={() => setPublishDrawerOpen(false)}
                className="w-full text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
              >
                Continue Editing
              </button>
            </div>
          </form>
        </Drawer>

        <LoadingOverlay visible={isSubmitting} />
      </motion.div>
    </AppLayout>
  );
}
