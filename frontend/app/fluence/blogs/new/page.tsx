'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { AppLayout } from '@/components/layout';
import { useCreateBlogPost, useBlogCategories } from '@/lib/hooks/queries/useFluence';
import { notifications } from '@mantine/notifications';
import { TextInput, Textarea, Select, MultiSelect, LoadingOverlay, Skeleton } from '@mantine/core';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

// Dynamically import the enhanced Fluence editor (no SSR — Tiptap requirement)
const FluenceEditor = dynamic(
  () => import('@/components/fluence/editor/FluenceEditor'),
  { ssr: false, loading: () => <Skeleton height={400} radius="md" /> }
);
import { ArrowLeft } from 'lucide-react';
import { isAxiosError } from '@/lib/utils/type-guards';
import AccessControlSection from '@/components/fluence/AccessControlSection';

const createBlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').min(3, 'Title must be at least 3 characters'),
  excerpt: z.string().min(1, 'Excerpt is required').min(10, 'Excerpt must be at least 10 characters'),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  coverImageUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  visibility: z.enum(['PUBLIC', 'ORGANIZATION', 'DEPARTMENT', 'PRIVATE', 'RESTRICTED'], {
    errorMap: () => ({ message: 'Invalid visibility option' }),
  }),
  content: z.record(z.unknown()).default({
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }),
});

type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;

export default function CreateBlogPost() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate: createBlogPost } = useCreateBlogPost();
  const { data: categoriesData, isLoading: categoriesLoading } = useBlogCategories();

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateBlogPostInput>({
    resolver: zodResolver(createBlogPostSchema),
    defaultValues: {
      title: '',
      excerpt: '',
      categoryId: '',
      tags: [],
      coverImageUrl: '',
      visibility: 'ORGANIZATION',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
    },
  });

  const _content = watch('content');
  const visibility = watch('visibility');
  const categories = categoriesData || [];
  const [sharedDepartmentIds, setSharedDepartmentIds] = useState<string[]>([]);
  const [sharedEmployeeIds, setSharedEmployeeIds] = useState<string[]>([]);

  const onSubmit = async (data: CreateBlogPostInput) => {
    if (!data.content || Object.keys(data.content).length === 0) {
      notifications.show({
        title: 'Validation Error',
        message: 'Content cannot be empty',
        color: 'red',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      createBlogPost(
        {
          title: data.title,
          excerpt: data.excerpt,
          content: data.content,
          categoryId: data.categoryId,
          tags: data.tags,
          coverImageUrl: data.coverImageUrl,
          visibility: data.visibility,
          status: 'DRAFT',
          sharedWithDepartmentIds: sharedDepartmentIds.length > 0 ? sharedDepartmentIds : undefined,
          sharedWithEmployeeIds: sharedEmployeeIds.length > 0 ? sharedEmployeeIds : undefined,
        },
        {
          onSuccess: (post) => {
            notifications.show({
              title: 'Success',
              message: 'Blog post created successfully',
              color: 'green',
            });
            router.push(`/fluence/blogs/${post.id}`);
          },
          onError: (error: unknown) => {
            const message = isAxiosError(error) && typeof error.response?.data === 'object' && error.response?.data !== null && 'message' in error.response.data
              ? (error.response.data as { message?: string }).message ?? 'Failed to create blog post'
              : 'Failed to create blog post';
            notifications.show({
              title: 'Error',
              message,
              color: 'red',
            });
          },
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-bold text-[var(--text-primary)] skeuo-emboss">
                Create Blog Post
              </h1>
            </div>
            <p className="text-[var(--text-secondary)] ml-11">
              Write and publish a new blog post
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Title
            </label>
            <TextInput
              placeholder="Enter post title"
              error={errors.title?.message}
              {...register('title')}
              disabled={isSubmitting}
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Excerpt
            </label>
            <Textarea
              placeholder="Enter a brief excerpt for your blog post"
              error={errors.excerpt?.message}
              {...register('excerpt')}
              disabled={isSubmitting}
              minRows={3}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Category
            </label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  {...field}
                  placeholder="Select a category (optional)"
                  disabled={categoriesLoading || isSubmitting}
                  clearable
                  data={categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                />
              )}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Tags
            </label>
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <MultiSelect
                  {...field}
                  placeholder="Add tags (optional)"
                  disabled={isSubmitting}
                  searchable
                  clearable
                />
              )}
            />
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Cover Image URL
            </label>
            <TextInput
              placeholder="https://example.com/image.jpg"
              error={errors.coverImageUrl?.message}
              {...register('coverImageUrl')}
              disabled={isSubmitting}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Optional. Image URL for the blog post cover
            </p>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Visibility
            </label>
            <Controller
              control={control}
              name="visibility"
              render={({ field }) => (
                <Select
                  {...field}
                  placeholder="Select visibility"
                  disabled={isSubmitting}
                  data={[
                    { value: 'PUBLIC', label: 'Public' },
                    { value: 'ORGANIZATION', label: 'Organization' },
                    { value: 'DEPARTMENT', label: 'My Department Only' },
                    { value: 'RESTRICTED', label: 'Specific People' },
                    { value: 'PRIVATE', label: 'Private' },
                  ]}
                />
              )}
            />
          </div>

          {/* Access Control (shown for DEPARTMENT and RESTRICTED visibility) */}
          <AccessControlSection
            visibility={visibility}
            sharedWithDepartmentIds={sharedDepartmentIds}
            sharedWithEmployeeIds={sharedEmployeeIds}
            onDepartmentIdsChange={setSharedDepartmentIds}
            onEmployeeIdsChange={setSharedEmployeeIds}
            disabled={isSubmitting}
          />

          {/* Content Editor */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Content
            </label>
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

          {/* Actions */}
          <div className="flex gap-4 justify-end pt-6 border-t border-[var(--border-main)] dark:border-[var(--border-main)]">
            <Button
              onClick={() => router.back()}
              variant="secondary"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <PermissionGate permission={Permissions.KNOWLEDGE_BLOG_CREATE}>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isSubmitting ? 'Creating...' : 'Create Post'}
              </Button>
            </PermissionGate>
          </div>
        </form>

        <LoadingOverlay visible={isSubmitting} />
      </div>
    </AppLayout>
  );
}
