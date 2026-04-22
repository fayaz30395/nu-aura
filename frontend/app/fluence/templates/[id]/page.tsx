'use client';

import {useCallback, useEffect, useState} from 'react';
import {notFound, useParams, useRouter} from 'next/navigation';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {motion} from 'framer-motion';
import {ArrowLeft, Calendar, Copy, Eye, RefreshCw, Tag, Trash2, User,} from 'lucide-react';
import dynamic from 'next/dynamic';
import {Modal, Select, Skeleton, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {instantiateTemplateSchema} from '@/lib/validations/fluence';
import {z} from 'zod';

import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {
  useDeleteFluenceTemplate,
  useFluenceTemplate,
  useInstantiateTemplate,
  useWikiSpaces,
} from '@/lib/hooks/queries/useFluence';

import type {InstantiateTemplateRequest} from '@/lib/types/platform/fluence';

/** Form-level schema — excludes templateId which is injected at submit time */
const instantiateFormSchema = instantiateTemplateSchema.pick({
  documentTitle: true,
  spaceId: true,
});

type InstantiateFormData = z.infer<typeof instantiateFormSchema>;

const ContentViewer = dynamic(
  () => import('@/components/fluence/ContentViewer'),
  {ssr: false, loading: () => <Skeleton height={300} radius="md"/>}
);

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  const [showInstantiateModal, setShowInstantiateModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const {hasAnyPermission, isReady} = usePermissions();

  const hasAccess = hasAnyPermission(
    Permissions.KNOWLEDGE_TEMPLATE_READ,
    Permissions.KNOWLEDGE_VIEW,
  );

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAccess, router]);

  const {data: template, isLoading} = useFluenceTemplate(templateId, !!templateId);
  const {data: spacesData} = useWikiSpaces(0, 100);
  const instantiate = useInstantiateTemplate();
  const deleteTemplate = useDeleteFluenceTemplate();

  const spaces = spacesData?.content || [];

  const {
    register,
    handleSubmit,
    control,
    formState: {errors},
    reset,
  } = useForm<InstantiateFormData>({
    resolver: zodResolver(instantiateFormSchema),
    defaultValues: {documentTitle: '', spaceId: ''},
  });

  const handleInstantiate = useCallback(
    (data: InstantiateFormData) => {
      if (!template) return;
      const request: InstantiateTemplateRequest = {
        templateId: template.id,
        documentTitle: data.documentTitle,
        spaceId: data.spaceId || undefined,
      };
      instantiate.mutate(request, {
        onSuccess: (page) => {
          setShowInstantiateModal(false);
          reset();
          notifications.show({
            title: 'Page created from template',
            message: `"${data.documentTitle}" has been created`,
            color: 'green',
          });
          router.push(`/fluence/wiki/${page.id}`);
        },
        onError: () => {
          notifications.show({
            title: 'Error',
            message: 'Failed to create page from template',
            color: 'red',
          });
        },
      });
    },
    [template, instantiate, reset, router]
  );

  const handleDelete = useCallback(() => {
    if (!template) return;
    deleteTemplate.mutate(template.id, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        notifications.show({title: 'Template deleted', message: '', color: 'green'});
        router.push('/fluence/templates');
      },
    });
  }, [template, deleteTemplate, router]);

  if (!isReady || !hasAccess) return null;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="w-8 h-8 text-[var(--text-muted)] animate-spin"/>
        </div>
      </AppLayout>
    );
  }

  if (!isLoading && !template) {
    notFound();
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <button
              onClick={() => router.back()}
              aria-label="Go back"
              className='mb-4 flex items-center gap-2 text-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]'
            >
              <ArrowLeft className="w-4 h-4"/>
              Back to Templates
            </button>
            <h1 className="text-xl font-bold skeuo-emboss flex items-center gap-4 mb-2">
              {template.icon && <span className="text-2xl">{template.icon}</span>}
              {template.name}
            </h1>
            {template.description && (
              <p className="text-[var(--text-secondary)]">{template.description}</p>
            )}
            <div className="flex items-center gap-4 text-body-muted mt-2">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4"/>
                {template.authorName || 'Unknown'}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4"/>
                {new Date(template.updatedAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <Copy className="w-4 h-4"/>
                {template.usageCount} uses
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowInstantiateModal(true)}
              className='gap-2 bg-accent hover:bg-accent'
            >
              <Copy className="w-4 h-4"/>
              Use Template
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleteTemplate.isPending}
              aria-label="Delete template"
            >
              <Trash2 className="w-4 h-4"/>
            </Button>
          </div>
        </div>

        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={{opacity: 1, y: 0}}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Template Content Preview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5"/>
                Template Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContentViewer content={template.content}/>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="row-between">
                  <span className="text-body-secondary">Uses</span>
                  <span className="font-semibold">{template.usageCount}</span>
                </div>
                {template.categoryName && (
                  <div className="row-between">
                    <span className="text-body-secondary">Category</span>
                    <span className="text-sm">{template.categoryName}</span>
                  </div>
                )}
                <div className="row-between">
                  <span className="text-body-secondary">Created</span>
                  <span className="text-sm">{new Date(template.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-4 py-1 rounded-full text-sm"
                      >
                        <Tag className="w-3 h-3"/>
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
      {/* Instantiate Modal */}
      <Modal
        opened={showInstantiateModal}
        onClose={() => setShowInstantiateModal(false)}
        title="Create Page from Template"
        size="md"
      >
        <form onSubmit={handleSubmit(handleInstantiate)} className="space-y-4">
          <TextInput
            label="Page Title"
            placeholder="Enter a title for the new page"
            required
            {...register('documentTitle')}
            error={errors.documentTitle?.message}
          />
          <Controller
            control={control}
            name="spaceId"
            render={({field}) => (
              <Select
                {...field}
                label="Wiki Space"
                placeholder="Select a space"
                data={spaces.map((space) => ({
                  value: space.id,
                  label: space.name,
                }))}
                error={errors.spaceId?.message}
                clearable
              />
            )}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowInstantiateModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={instantiate.isPending}
              className='gap-2 bg-accent hover:bg-accent'
            >
              <Copy className="w-4 h-4"/>
              {instantiate.isPending ? 'Creating...' : 'Create Page'}
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Template"
        message="Are you sure you want to delete this template? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleteTemplate.isPending}
      />
    </AppLayout>
  );
}
