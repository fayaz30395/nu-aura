'use client';

import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {AppLayout} from '@/components/layout/AppLayout';
import {useDeleteTemplate, useTemplates} from '@/lib/hooks/queries/useContracts';
import {contractService} from '@/lib/services/hrms/contract.service';
import {Badge, Button, Card, Input} from '@mantine/core';
import {Loader2, Plus, Search, Trash2} from 'lucide-react';
import {notifications} from '@mantine/notifications';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';

export default function ContractTemplatesPage() {
  const router = useRouter();
  const {hasPermission, isReady} = usePermissions();

  const hasAccess = hasPermission(Permissions.CONTRACT_VIEW);

  useEffect(() => {
    if (isReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [isReady, hasAccess, router]);

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const {data: templatesData, isLoading, isError} = useTemplates({page, size: 20});
  const deleteMutation = useDeleteTemplate();

  if (!isReady || !hasAccess) return null;

  const templates = templatesData?.content || [];

  const breadcrumbs = [
    {label: 'Dashboard', href: '/dashboard'},
    {label: 'Contracts', href: '/contracts'},
    {label: 'Templates', href: '/contracts/templates'},
  ];

  const handleDelete = (id: string) => {
    setTemplateToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete, {
        onSuccess: () => {
          notifications.show({title: 'Deleted', message: 'Template deleted successfully', color: 'green'});
        },
        onError: () => {
          notifications.show({title: 'Error', message: 'Failed to delete template. Please try again.', color: 'red'});
        },
      });
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold skeuo-emboss">Contract Templates</h1>
            <p className="text-[var(--text-secondary)] mt-1">Manage reusable contract templates</p>
          </div>
          <Button
            onClick={() => router.push('/contracts/templates/new')}
            leftSection={<Plus className="w-4 h-4"/>}
            size="md"
          >
            New Template
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Search templates..."
          leftSection={<Search className="w-4 h-4"/>}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />

        {/* Templates Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className='h-8 w-8 animate-spin text-accent'/>
          </div>
        ) : isError ? (
          <div className='text-center p-8 text-status-danger-text'>
            Failed to load templates. Please try refreshing the page.
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center p-8 text-[var(--text-muted)]">
            <p>No templates found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-[var(--shadow-dropdown)] transition-shadow"
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/contracts/templates/${template.id}`)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/contracts/templates/${template.id}`);
                  }
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  {template.isActive && <Badge>Active</Badge>}
                </div>
                <p className="text-body-secondary mb-4">
                  {contractService.getTypeLabel(template.type)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="light"
                    size="xs"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      router.push(`/contracts/templates/${template.id}`);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="light"
                    color="red"
                    size="xs"
                    leftSection={<Trash2 className="w-3 h-3"/>}
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      handleDelete(template.id);
                    }}
                    loading={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {templatesData && templatesData.totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              variant="light"
            >
              Previous
            </Button>
            <div className="flex items-center px-4">
              Page {page + 1} of {templatesData.totalPages}
            </div>
            <Button
              disabled={page >= templatesData.totalPages - 1}
              onClick={() => setPage(page + 1)}
              variant="light"
            >
              Next
            </Button>
          </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Template"
        message="Are you sure you want to delete this template? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleteMutation.isPending}
      />
    </AppLayout>
  );
}
