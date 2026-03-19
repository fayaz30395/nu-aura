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
  useWikiPage,
  useUpdateWikiPage,
  useWikiSpaces,
  useEditLock,
} from '@/lib/hooks/queries/useFluence';
import { notifications } from '@mantine/notifications';
import { TextInput, Select, LoadingOverlay, Skeleton, MultiSelect } from '@mantine/core';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';
import { isAxiosError } from '@/lib/utils/type-guards';
import AccessControlSection from '@/components/fluence/AccessControlSection';
import EditLockWarning from '@/components/fluence/EditLockWarning';
import { useEmployeeSearch } from '@/lib/hooks/queries/useEmployees';

const FluenceEditor = dynamic(
  () => import('@/components/fluence/editor/FluenceEditor'),
  { ssr: false, loading: () => <Skeleton height={400} radius="md" /> }
);

const editWikiPageSchema = z.object({
  title: z.string().min(1, 'Title is required').min(3, 'Title must be at least 3 characters'),
  visibility: z.enum(['PUBLIC', 'ORGANIZATION', 'DEPARTMENT', 'PRIVATE', 'RESTRICTED'], {
    errorMap: () => ({ message: 'Invalid visibility option' }),
  }),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  content: z.record(z.unknown()).default({
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }),
});

type EditWikiPageInput = z.infer<typeof editWikiPageSchema>;

export default function EditWikiPage() {
  const router = useRouter();
  const params = useParams();
  const pageId = params.slug as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorSearchQuery, setEditorSearchQuery] = useState('');

  const { data: page, isLoading } = useWikiPage(pageId, !!pageId);
  const { mutate: updateWikiPage } = useUpdateWikiPage();
  const { data: _spacesData } = useWikiSpaces(0, 100);
  const { isLockedByOther, lockedByName, forceAcquireLock } = useEditLock('WIKI', pageId, !!pageId);
  const { data: editorSearchData } = useEmployeeSearch(editorSearchQuery, 0, 20, editorSearchQuery.length > 1);

  const [sharedDepartmentIds, setSharedDepartmentIds] = useState<string[]>([]);
  const [sharedEmployeeIds, setSharedEmployeeIds] = useState<string[]>([]);
  const [editorIds, setEditorIds] = useState<string[]>([]);

  const searchedEmployees = editorSearchData?.content || [];

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditWikiPageInput>({
    resolver: zodResolver(editWikiPageSchema),
    defaultValues: {
      title: '',
      visibility: 'ORGANIZATION',
      status: 'DRAFT',
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
  });

  // Populate form when page loads
  useEffect(() => {
    if (page) {
      reset({
        title: page.title,
        visibility: page.visibility,
        status: page.status,
        content: page.content,
      });
      setSharedDepartmentIds(page.sharedWithDepartmentIds || []);
      setSharedEmployeeIds(page.sharedWithEmployeeIds || []);
      setEditorIds(page.editorIds || []);
    }
  }, [page, reset]);

  const visibility = watch('visibility');

  const editorOptions = searchedEmployees.map((emp) => ({
    value: emp.id,
    label: `${emp.fullName || `${emp.firstName} ${emp.lastName || ''}`}${emp.workEmail ? ` (${emp.workEmail})` : ''}`,
  }));

  const onSubmit = async (data: EditWikiPageInput) => {
    if (!page) return;
    setIsSubmitting(true);
    try {
      updateWikiPage(
        {
          id: page.id,
          data: {
            title: data.title,
            visibility: data.visibility,
            status: data.status,
            content: data.content,
            sharedWithDepartmentIds: sharedDepartmentIds.length > 0 ? sharedDepartmentIds : undefined,
            sharedWithEmployeeIds: sharedEmployeeIds.length > 0 ? sharedEmployeeIds : undefined,
            editorIds: editorIds.length > 0 ? editorIds : undefined,
          },
        },
        {
          onSuccess: () => {
            notifications.show({
              title: 'Success',
              message: 'Wiki page updated successfully',
              color: 'green',
            });
            router.push(`/fluence/wiki/${page.id}`);
          },
          onError: (error: unknown) => {
            const message = isAxiosError(error) && typeof error.response?.data === 'object' && error.response?.data !== null && 'message' in error.response.data
              ? (error.response.data as { message?: string }).message ?? 'Failed to update wiki page'
              : 'Failed to update wiki page';
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

  if (!page) {
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
                Edit Wiki Page
              </h1>
            </div>
            <p className="text-[var(--text-secondary)] ml-12">
              Update your wiki page content and settings
            </p>
          </div>
        </div>

        {/* Edit Lock Warning */}
        {isLockedByOther && lockedByName && (
          <EditLockWarning
            lockedByName={lockedByName}
            onForceEdit={forceAcquireLock}
          />
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
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
                    { value: 'PRIVATE', label: 'Private' },
                    { value: 'RESTRICTED', label: 'Restricted' },
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
              Post Editors (who can edit this page)
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
              Selected people can edit this page in addition to you
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
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 bg-violet-600 hover:bg-violet-700"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>

        <LoadingOverlay visible={isSubmitting} />
      </div>
    </AppLayout>
  );
}
