'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { AppLayout } from '@/components/layout';
import {
  useBlogPost,
  useUpdateBlogPost,
  useBlogCategories,
} from '@/lib/hooks/queries/useFluence';
import { notifications } from '@mantine/notifications';
import { TextInput, Textarea, Select, MultiSelect, LoadingOverlay, Skeleton } from '@mantine/core';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';
import { isAxiosError } from '@/lib/utils/type-guards';
import AccessControlSection from '@/components/fluence/AccessControlSection';
import { useEmployeeSearch } from '@/lib/hooks/queries/useEmployees';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

const FluenceEditor = dynamic(
  () => import('@/components/fluence/editor/FluenceEditor'),
  { ssr: false, loading: () => <Skeleton height={400} radius="md" /> }
);

const editBlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').min(3, 'Title must be at least 3 characters'),
  excerpt: z.string().min(1, 'Excerpt is required').min(10, 'Excerpt must be at least 10 characters'),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  coverImageUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  visibility: z.enum(['PUBLIC', 'ORGANIZATION', 'DEPARTMENT', 'PRIVATE', 'RESTRICTED'], {
    errorMap: () => ({ message: 'Invalid visibility option' }),
  }),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  content: z.record(z.unknown()).default({
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }),
});

type EditBlogPostInput = z.infer<typeof editBlogPostSchema>;

export default function EditBlogPost() {
  const router = useRouter();
  const params = useParams();
  const postId = params.slug as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorSearchQuery, setEditorSearchQuery] = useState('');

  const { data: post, isLoading } = useBlogPost(postId, !!postId);
  const { mutate: updateBlogPost } = useUpdateBlogPost();
  const { data: categoriesData, isLoading: categoriesLoading } = useBlogCategories();
  const { data: editorSearchData } = useEmployeeSearch(editorSearchQuery, 0, 20, editorSearchQuery.length > 1);

  const [sharedDepartmentIds, setSharedDepartmentIds] = useState<string[]>([]);
  const [sharedEmployeeIds, setSharedEmployeeIds] = useState<string[]>([]);
  const [editorIds, setEditorIds] = useState<string[]>([]);

  const categories = categoriesData || [];
  const searchedEmployees = editorSearchData?.content || [];

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditBlogPostInput>({
    resolver: zodResolver(editBlogPostSchema),
    defaultValues: {
      title: '',
      excerpt: '',
      categoryId: '',
      tags: [],
      coverImageUrl: '',
      visibility: 'ORGANIZATION',
      status: 'DRAFT',
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
  });

  // Populate form when post loads
  useEffect(() => {
    if (post) {
      reset({
        title: post.title,
        excerpt: post.excerpt,
        categoryId: post.categoryId || '',
        tags: post.tags || [],
        coverImageUrl: post.coverImageUrl || '',
        visibility: post.visibility,
        status: post.status,
        content: post.content,
      });
      setSharedDepartmentIds(post.sharedWithDepartmentIds || []);
      setSharedEmployeeIds(post.sharedWithEmployeeIds || []);
      setEditorIds(post.editorIds || []);
    }
  }, [post, reset]);

  const visibility = watch('visibility');

  const editorOptions = searchedEmployees.map((emp) => ({
    value: emp.id,
    label: `${emp.fullName || `${emp.firstName} ${emp.lastName || ''}`}${emp.workEmail ? ` (${emp.workEmail})` : ''}`,
  }));

  const onSubmit = async (data: EditBlogPostInput) => {
    if (!post) return;
    setIsSubmitting(true);
    try {
      updateBlogPost(
        {
          id: post.id,
          data: {
            title: data.title,
            excerpt: data.excerpt,
            content: data.content,
            categoryId: data.categoryId,
            tags: data.tags,
            coverImageUrl: data.coverImageUrl || undefined,
            visibility: data.visibility,
            status: data.status,
            sharedWithDepartmentIds: sharedDepartmentIds.length > 0 ? sharedDepartmentIds : undefined,
            sharedWithEmployeeIds: sharedEmployeeIds.length > 0 ? sharedEmployeeIds : undefined,
            editorIds: editorIds.length > 0 ? editorIds : undefined,
          },
        },
        {
          onSuccess: () => {
            notifications.show({
              title: 'Success',
              message: 'Blog post updated successfully',
              color: 'green',
            });
            router.push(`/fluence/blogs/${post.id}`);
          },
          onError: (error: unknown) => {
            const message = isAxiosError(error) && typeof error.response?.data === 'object' && error.response?.data !== null && 'message' in error.response.data
              ? (error.response.data as { message?: string }).message ?? 'Failed to update blog post'
              : 'Failed to update blog post';
            notifications.show({ title: 'Error', message, color: 'red' });
          },
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="w-8 h-8 text-[var(--text-muted)] animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!post) {
    notFound();
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-[var(--bg-surface)] dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Edit Blog Post
              </h1>
            </div>
            <p className="text-[var(--text-secondary)] ml-12">
              Update your blog post content and settings
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
              placeholder="Enter a brief excerpt"
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
                  data={categories.map((cat) => ({
                    value: cat.id,
                    label: cat.name,
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

          {/* Cover Image */}
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
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Status
            </label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  {...field}
                  placeholder="Select status"
                  disabled={isSubmitting}
                  data={[
                    { value: 'DRAFT', label: 'Draft' },
                    { value: 'PUBLISHED', label: 'Published' },
                    { value: 'ARCHIVED', label: 'Archived' },
                  ]}
                />
              )}
            />
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

          {/* Access Control */}
          <AccessControlSection
            visibility={visibility}
            sharedWithDepartmentIds={sharedDepartmentIds}
            sharedWithEmployeeIds={sharedEmployeeIds}
            onDepartmentIdsChange={setSharedDepartmentIds}
            onEmployeeIdsChange={setSharedEmployeeIds}
            disabled={isSubmitting}
          />

          {/* Post Editors */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Post Editors (who can edit this post)
            </label>
            <MultiSelect
              data={editorOptions}
              value={editorIds}
              onChange={setEditorIds}
              placeholder="Search employees who can edit..."
              searchable
              clearable
              disabled={isSubmitting}
              onSearchChange={setEditorSearchQuery}
              nothingFoundMessage={editorSearchQuery.length > 1 ? 'No employees found' : 'Type to search...'}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Selected people can edit this post in addition to you
            </p>
          </div>

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
          <div className="flex gap-4 justify-end pt-6 border-t border-[var(--border-main)]">
            <Button
              onClick={() => router.back()}
              variant="secondary"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <PermissionGate permission={Permissions.KNOWLEDGE_BLOG_UPDATE}>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2 bg-amber-600 hover:bg-amber-700"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </PermissionGate>
          </div>
        </form>

        <LoadingOverlay visible={isSubmitting} />
      </div>
    </AppLayout>
  );
}
