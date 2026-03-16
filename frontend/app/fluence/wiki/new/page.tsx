'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { AppLayout } from '@/components/layout';
import { useCreateWikiPage, useWikiSpaces } from '@/lib/hooks/queries/useFluence';
import { notifications } from '@mantine/notifications';
import { TextInput, Select, LoadingOverlay, Skeleton } from '@mantine/core';

// Dynamically import Tiptap editor to keep it out of the initial bundle
const RichTextEditor = dynamic(
  () => import('@/components/fluence/RichTextEditor'),
  { ssr: false, loading: () => <Skeleton height={400} radius="md" /> }
);
import { ArrowLeft } from 'lucide-react';
import { isAxiosError } from '@/lib/utils/type-guards';
import AccessControlSection from '@/components/fluence/AccessControlSection';

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

export default function CreateWikiPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate: createWikiPage } = useCreateWikiPage();
  const { data: spacesData, isLoading: spacesLoading } = useWikiSpaces(0, 100);

  const {
    control,
    register,
    handleSubmit,
    watch,
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

  const selectedSpaceId = watch('spaceId');
  const content = watch('content');
  const visibility = watch('visibility');
  const spaces = spacesData?.content || [];
  const [sharedDepartmentIds, setSharedDepartmentIds] = useState<string[]>([]);
  const [sharedEmployeeIds, setSharedEmployeeIds] = useState<string[]>([]);

  const onSubmit = async (data: CreateWikiPageInput) => {
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
            notifications.show({
              title: 'Success',
              message: 'Wiki page created successfully',
              color: 'green',
            });
            router.push(`/fluence/wiki/${page.id}`);
          },
          onError: (error: unknown) => {
            const message = isAxiosError(error) && typeof error.response?.data === 'object' && error.response?.data !== null && 'message' in error.response.data
              ? (error.response.data as { message?: string }).message ?? 'Failed to create wiki page'
              : 'Failed to create wiki page';
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
                className="p-2 hover:bg-[var(--bg-surface)] dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                Create Wiki Page
              </h1>
            </div>
            <p className="text-[var(--text-secondary)] ml-11">
              Create a new page in your knowledge base
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <TextInput
              placeholder="Enter page title"
              error={errors.title?.message}
              {...register('title')}
              disabled={isSubmitting}
              className="w-full"
            />
          </div>

          {/* Space Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    { value: 'PRIVATE', label: 'Private' },
                    { value: 'RESTRICTED', label: 'Restricted' },
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

          {/* Parent Page (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Parent Page (Optional)
            </label>
            <TextInput
              placeholder="Enter parent page ID (optional)"
              {...register('parentId')}
              disabled={isSubmitting}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Leave empty for a top-level page
            </p>
          </div>

          {/* Content Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content
            </label>
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <RichTextEditor
                  content={field.value}
                  onChange={field.onChange}
                  placeholder="Write your page content here..."
                  minHeight="400px"
                  maxHeight="800px"
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
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {isSubmitting ? 'Creating...' : 'Create Page'}
            </Button>
          </div>
        </form>

        <LoadingOverlay visible={isSubmitting} />
      </div>
    </AppLayout>
  );
}
