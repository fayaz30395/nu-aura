'use client';

import {useCallback, useEffect, useState} from 'react';
import {notFound, useParams, useRouter} from 'next/navigation';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {motion} from 'framer-motion';
import {ArrowLeft, Calendar, Copy, Edit, Eye, RefreshCw, Star, Tag, Trash2, User,} from 'lucide-react';
import dynamic from 'next/dynamic';
import {Modal, Select, Skeleton, Switch, TagsInput, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {instantiateTemplateSchema} from '@/lib/validations/fluence';
import {z} from 'zod';

import {AppLayout} from '@/components/layout';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {
  useDeleteFluenceTemplate,
  useFluenceTemplate,
  useInstantiateTemplate,
  useToggleTemplateActive,
  useToggleTemplateFeatured,
  useUpdateFluenceTemplate,
  useWikiSpaces,
} from '@/lib/hooks/queries/useFluence';

import type {InstantiateTemplateRequest} from '@/lib/types/platform/fluence';
import {formatDate} from '@/lib/utils/format/date';

/** Form-level schema — excludes templateId which is injected at submit time */
const instantiateFormSchema = instantiateTemplateSchema.pick({
  documentTitle: true,
  spaceId: true,
});

type InstantiateFormData = z.infer<typeof instantiateFormSchema>;

const editTemplateFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(255),
  description: z.string().max(500).optional().or(z.literal('')),
  tags: z.array(z.string().min(1).max(50)).optional().default([]),
});

type EditTemplateFormData = z.infer<typeof editTemplateFormSchema>;

const ContentViewer = dynamic(
  () => import('@/components/fluence/ContentViewer'),
  {ssr: false, loading: () => <Skeleton height={300} radius="md"/>}
);

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  const [showInstantiateModal, setShowInstantiateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const {hasAnyPermission, isReady} = usePermissions();

  const hasAccess = hasAnyPermission(
    Permissions.KNOWLEDGE_TEMPLATE_READ,
  );

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard?denied=1');
    }
  }, [isReady, hasAccess, router]);

  const {data: template, isLoading} = useFluenceTemplate(templateId, !!templateId);
  const {data: spacesData} = useWikiSpaces(0, 100);
  const instantiate = useInstantiateTemplate();
  const deleteTemplate = useDeleteFluenceTemplate();
  const updateTemplate = useUpdateFluenceTemplate();
  const toggleActive = useToggleTemplateActive();
  const toggleFeatured = useToggleTemplateFeatured();

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

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    control: editControl,
    formState: {errors: editErrors},
    reset: resetEdit,
  } = useForm<EditTemplateFormData>({
    resolver: zodResolver(editTemplateFormSchema),
    defaultValues: {name: '', description: '', tags: []},
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

  const handleOpenEdit = useCallback(() => {
    if (!template) return;
    resetEdit({
      name: template.name,
      description: template.description || '',
      tags: template.tags || [],
    });
    setShowEditModal(true);
  }, [template, resetEdit]);

  const handleEdit = useCallback(
    (data: EditTemplateFormData) => {
      if (!template) return;
      updateTemplate.mutate(
        {
          id: template.id,
          data: {
            name: data.name,
            description: data.description || undefined,
            tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
          },
        },
        {
          onSuccess: () => {
            setShowEditModal(false);
            notifications.show({title: 'Template updated', message: '', color: 'green'});
          },
          onError: () => {
            notifications.show({title: 'Error', message: 'Failed to update template', color: 'red'});
          },
        }
      );
    },
    [template, updateTemplate]
  );

  const handleToggleActive = useCallback(() => {
    if (!template) return;
    toggleActive.mutate(template.id, {
      onError: () => notifications.show({title: 'Error', message: 'Failed to toggle active state', color: 'red'}),
    });
  }, [template, toggleActive]);

  const handleToggleFeatured = useCallback(() => {
    if (!template) return;
    toggleFeatured.mutate(template.id, {
      onError: () => notifications.show({title: 'Error', message: 'Failed to toggle featured state', color: 'red'}),
    });
  }, [template, toggleFeatured]);

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

  if (!template) {
    return null;
  }

  return (
    <AppLayout
      activeMenuItem="fluence-templates"
      breadcrumbs={[
        {label: 'NU-Fluence', href: '/fluence'},
        {label: 'Templates', href: '/fluence/templates'},
        {label: 'Template Detail'},
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <button
              onClick={() => router.back()}
              aria-label="Go back"
              className="mb-4 flex items-center gap-2 text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-700)]"
            >
              <ArrowLeft className="w-4 h-4"/>
              Back to Templates
            </button>
            <h1 className="text-xl font-bold flex items-center gap-4 mb-2">
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
                {formatDate(template.updatedAt)}
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
              className="gap-2 bg-accent-600 hover:bg-accent-700"
            >
              <Copy className="w-4 h-4"/>
              Use Template
            </Button>
            <PermissionGate permission={Permissions.KNOWLEDGE_TEMPLATE_UPDATE}>
              <Button
                variant="secondary"
                className="gap-2"
                onClick={handleOpenEdit}
                aria-label="Edit template"
              >
                <Edit className="w-4 h-4"/>
              </Button>
            </PermissionGate>
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
                  <span className="text-sm">{formatDate(template.createdAt)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Status toggles */}
            <PermissionGate permission={Permissions.KNOWLEDGE_TEMPLATE_UPDATE}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="row-between">
                    <span className="text-body-secondary">Active</span>
                    <Switch
                      checked={template.isActive ?? true}
                      onChange={handleToggleActive}
                      disabled={toggleActive.isPending}
                      aria-label="Toggle template active"
                    />
                  </div>
                  <div className="row-between">
                    <span className="text-body-secondary flex items-center gap-1">
                      <Star className="w-4 h-4"/>
                      Featured
                    </span>
                    <Switch
                      checked={template.isFeatured ?? false}
                      onChange={handleToggleFeatured}
                      disabled={toggleFeatured.isPending}
                      aria-label="Toggle template featured"
                    />
                  </div>
                </CardContent>
              </Card>
            </PermissionGate>

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
              className="gap-2 bg-accent-600 hover:bg-accent-700"
            >
              <Copy className="w-4 h-4"/>
              {instantiate.isPending ? 'Creating...' : 'Create Page'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Template"
        size="md"
      >
        <form onSubmit={handleEditSubmit(handleEdit)} className="space-y-4">
          <TextInput
            label="Name"
            required
            {...registerEdit('name')}
            error={editErrors.name?.message}
          />
          <TextInput
            label="Description"
            {...registerEdit('description')}
            error={editErrors.description?.message}
          />
          <Controller
            control={editControl}
            name="tags"
            render={({field}) => (
              <TagsInput
                {...field}
                label="Tags"
                value={field.value ?? []}
                clearable
              />
            )}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateTemplate.isPending}>
              {updateTemplate.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Template?"
        message="This action cannot be undone. The template will be permanently deleted."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleteTemplate.isPending}
      />
    </AppLayout>
  );
}
