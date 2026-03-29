'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTemplates, useDeleteTemplate } from '@/lib/hooks/queries/useContracts';
import { contractService } from '@/lib/services/contract.service';
import { Button, Card, Input, Badge } from '@mantine/core';
import { Plus, Search, Trash2 } from 'lucide-react';

export default function ContractTemplatesPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const { data: templatesData, isLoading } = useTemplates({ page, size: 20 });
  const deleteMutation = useDeleteTemplate();

  const templates = templatesData?.content || [];

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Contracts', href: '/contracts' },
    { label: 'Templates', href: '/contracts/templates' },
  ];

  const handleDelete = (id: string) => {
    setTemplateToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete);
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
            <h1 className="text-2xl font-bold skeuo-emboss">Contract Templates</h1>
            <p className="text-[var(--text-secondary)] mt-1">Manage reusable contract templates</p>
          </div>
          <Button
            onClick={() => router.push('/contracts/templates/new')}
            leftSection={<Plus className="w-4 h-4" />}
            size="md"
          >
            New Template
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Search templates..."
          leftSection={<Search className="w-4 h-4" />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />

        {/* Templates Grid */}
        {isLoading ? (
          <div className="text-center p-8 text-[var(--text-muted)]">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center p-8 text-[var(--text-muted)]">
            <p>No templates found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/contracts/templates/${template.id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  {template.isActive && <Badge>Active</Badge>}
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
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
                    leftSection={<Trash2 className="w-3 h-3" />}
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
