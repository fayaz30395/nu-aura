'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { sanitizeHtml } from '@/lib/utils/sanitize';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FileText,
  Search,
  Plus,
  Copy,
  Pencil,
  Trash2,
  Eye,
  ChevronDown,
  Loader2,
  AlertCircle,
  Tag,
  Variable,
  FileCheck,
  X,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Card,
  CardContent,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Badge,
} from '@/components/ui';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  useLetterTemplates,
  useLetterTemplate,
  useCreateLetterTemplate,
  useUpdateLetterTemplate,
  useDeleteLetterTemplate,
  useCloneLetterTemplate,
  useLetterPlaceholders,
  usePreviewLetterTemplate,
} from '@/lib/hooks/queries/useLetter';
import {
  LetterTemplate,
  LetterCategory,
  CreateLetterTemplateRequest,
  PlaceholderItem,
} from '@/lib/types/letter';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('LetterTemplatesPage');

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const TemplateFormSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  code: z.string().min(1, 'Template code is required')
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric with underscores'),
  description: z.string().optional().or(z.literal('')),
  category: z.nativeEnum(LetterCategory, { errorMap: () => ({ message: 'Category is required' }) }),
  templateContent: z.string().min(1, 'Template content is required'),
  headerHtml: z.string().optional().or(z.literal('')),
  footerHtml: z.string().optional().or(z.literal('')),
  cssStyles: z.string().optional().or(z.literal('')),
  includeCompanyLogo: z.boolean(),
  includeSignature: z.boolean(),
  signatureTitle: z.string().optional().or(z.literal('')),
  signatoryName: z.string().optional().or(z.literal('')),
  signatoryDesignation: z.string().optional().or(z.literal('')),
  requiresApproval: z.boolean(),
  availablePlaceholders: z.string().optional().or(z.literal('')),
});

type TemplateFormData = z.infer<typeof TemplateFormSchema>;

// ─── Helper Functions ──────────────────────────────────────────────────────

const getCategoryLabel = (category: LetterCategory): string => {
  const labels: Record<LetterCategory, string> = {
    [LetterCategory.OFFER]: 'Offer Letter',
    [LetterCategory.APPOINTMENT]: 'Appointment Letter',
    [LetterCategory.CONFIRMATION]: 'Confirmation Letter',
    [LetterCategory.PROMOTION]: 'Promotion Letter',
    [LetterCategory.TRANSFER]: 'Transfer Letter',
    [LetterCategory.SALARY_REVISION]: 'Salary Revision',
    [LetterCategory.WARNING]: 'Warning Letter',
    [LetterCategory.TERMINATION]: 'Termination Letter',
    [LetterCategory.RESIGNATION_ACCEPTANCE]: 'Resignation Acceptance',
    [LetterCategory.EXPERIENCE]: 'Experience Letter',
    [LetterCategory.RELIEVING]: 'Relieving Letter',
    [LetterCategory.SALARY_CERTIFICATE]: 'Salary Certificate',
    [LetterCategory.EMPLOYMENT_CERTIFICATE]: 'Employment Certificate',
    [LetterCategory.BONAFIDE]: 'Bonafide Certificate',
    [LetterCategory.VISA_SUPPORT]: 'Visa Support Letter',
    [LetterCategory.BANK_LETTER]: 'Bank Letter',
    [LetterCategory.ADDRESS_PROOF]: 'Address Proof Letter',
    [LetterCategory.INTERNSHIP]: 'Internship Letter',
    [LetterCategory.TRAINING_COMPLETION]: 'Training Completion',
    [LetterCategory.APPRECIATION]: 'Appreciation Letter',
    [LetterCategory.CUSTOM]: 'Custom Letter',
  };
  return labels[category] || category;
};

const getCategoryColor = (category: LetterCategory): string => {
  const colors: Partial<Record<LetterCategory, string>> = {
    [LetterCategory.OFFER]: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    [LetterCategory.APPOINTMENT]: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    [LetterCategory.EXPERIENCE]: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    [LetterCategory.RELIEVING]: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    [LetterCategory.SALARY_REVISION]: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    [LetterCategory.WARNING]: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    [LetterCategory.TERMINATION]: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };
  return colors[category] || 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300';
};

const formatDate = (date: string | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// ─── Placeholder Toolbar Component ────────────────────────────────────────

interface PlaceholderToolbarProps {
  placeholders: Record<string, PlaceholderItem[]>;
  onInsert: (placeholder: string) => void;
}

function PlaceholderToolbar({ placeholders, onInsert }: PlaceholderToolbarProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  return (
    <div className="border border-[var(--border-main)] rounded-lg bg-[var(--bg-surface)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Variable className="h-4 w-4 text-sky-600" />
        <span className="text-sm font-medium text-[var(--text-primary)]">
          Insert Placeholder
        </span>
      </div>
      <div className="space-y-1">
        {Object.entries(placeholders).map(([group, items]) => (
          <div key={group}>
            <button
              type="button"
              onClick={() => setExpandedGroup(expandedGroup === group ? null : group)}
              className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded transition-colors"
            >
              <span>{group}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${expandedGroup === group ? 'rotate-180' : ''}`}
              />
            </button>
            {expandedGroup === group && (
              <div className="pl-2 pb-1 flex flex-wrap gap-1">
                {items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onInsert(`{{${item.key}}}`)}
                    title={`${item.label} — e.g. ${item.example}`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-sky-50 text-sky-700 border border-sky-200 rounded-md hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800 dark:hover:bg-sky-900/50 transition-colors"
                  >
                    <Tag className="h-3 w-3" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Template Preview Modal ───────────────────────────────────────────────

interface PreviewModalProps {
  templateId: string;
  templateName: string;
  isOpen: boolean;
  onClose: () => void;
}

function TemplatePreviewModal({ templateId, templateName, isOpen, onClose }: PreviewModalProps) {
  const { data: previewHtml, isLoading } = usePreviewLetterTemplate(templateId, isOpen);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        Preview: {templateName}
      </ModalHeader>
      <ModalBody>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
            <span className="ml-2 text-[var(--text-secondary)]">Generating preview...</span>
          </div>
        ) : previewHtml ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert p-6 border border-[var(--border-main)] rounded-lg bg-white dark:bg-surface-900"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }}
          />
        ) : (
          <div className="text-center text-[var(--text-muted)] py-8">
            No preview available
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────

export default function LetterTemplatesPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();

  // State
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LetterTemplate | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [previewTemplateName, setPreviewTemplateName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Queries
  const {
    data: templatesData,
    isLoading,
    error,
    refetch,
  } = useLetterTemplates(currentPage, 20, isAuthenticated && hasHydrated);
  const { data: placeholders } = useLetterPlaceholders(isAuthenticated && hasHydrated);

  // Mutations
  const createMutation = useCreateLetterTemplate();
  const updateMutation = useUpdateLetterTemplate();
  const deleteMutation = useDeleteLetterTemplate();
  const cloneMutation = useCloneLetterTemplate();

  // Derived data
  const templates = templatesData?.content ?? [];
  const totalPages = templatesData?.totalPages ?? 0;

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      result = result.filter((t) => t.category === categoryFilter);
    }
    return result;
  }, [templates, searchQuery, categoryFilter]);

  // Form
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(TemplateFormSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      category: LetterCategory.CUSTOM,
      templateContent: '',
      headerHtml: '',
      footerHtml: '',
      cssStyles: '',
      includeCompanyLogo: true,
      includeSignature: true,
      signatureTitle: '',
      signatoryName: '',
      signatoryDesignation: '',
      requiresApproval: true,
      availablePlaceholders: '',
    },
  });

  // Auth redirect
  React.useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      try {
        router.push('/auth/login');
      } catch (err) {
        log.error('Navigation error:', err);
        window.location.href = '/auth/login';
      }
    }
  }, [isAuthenticated, hasHydrated, router]);

  const resetForm = useCallback(() => {
    form.reset({
      name: '',
      code: '',
      description: '',
      category: LetterCategory.CUSTOM,
      templateContent: '',
      headerHtml: '',
      footerHtml: '',
      cssStyles: '',
      includeCompanyLogo: true,
      includeSignature: true,
      signatureTitle: '',
      signatoryName: '',
      signatoryDesignation: '',
      requiresApproval: true,
      availablePlaceholders: '',
    });
    setEditingTemplate(null);
  }, [form]);

  const handleCreateNew = useCallback(() => {
    resetForm();
    setShowEditorModal(true);
  }, [resetForm]);

  const handleEdit = useCallback((template: LetterTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      code: template.code,
      description: template.description || '',
      category: template.category,
      templateContent: template.templateContent,
      headerHtml: template.headerHtml || '',
      footerHtml: template.footerHtml || '',
      cssStyles: template.cssStyles || '',
      includeCompanyLogo: template.includeCompanyLogo ?? true,
      includeSignature: template.includeSignature ?? true,
      signatureTitle: template.signatureTitle || '',
      signatoryName: template.signatoryName || '',
      signatoryDesignation: template.signatoryDesignation || '',
      requiresApproval: template.requiresApproval ?? true,
      availablePlaceholders: template.availablePlaceholders || '',
    });
    setShowEditorModal(true);
  }, [form]);

  const handleClone = useCallback((templateId: string) => {
    cloneMutation.mutate(templateId, {
      onSuccess: () => {
        refetch();
      },
      onError: (err) => {
        log.error('Error cloning template:', err);
      },
    });
  }, [cloneMutation, refetch]);

  const handleDelete = useCallback((templateId: string) => {
    deleteMutation.mutate(templateId, {
      onSuccess: () => {
        setShowDeleteConfirm(null);
        refetch();
      },
      onError: (err) => {
        log.error('Error deleting template:', err);
      },
    });
  }, [deleteMutation, refetch]);

  const handlePreview = useCallback((template: LetterTemplate) => {
    setPreviewTemplateId(template.id);
    setPreviewTemplateName(template.name);
  }, []);

  const handleInsertPlaceholder = useCallback((placeholder: string) => {
    const current = form.getValues('templateContent');
    // Insert placeholder at the end (since we have no cursor tracking for textarea)
    form.setValue('templateContent', current + placeholder, { shouldValidate: true });
  }, [form]);

  const onSubmit = useCallback((data: TemplateFormData) => {
    const payload: CreateLetterTemplateRequest = {
      name: data.name,
      code: data.code,
      description: data.description || undefined,
      category: data.category,
      templateContent: data.templateContent,
      headerHtml: data.headerHtml || undefined,
      footerHtml: data.footerHtml || undefined,
      cssStyles: data.cssStyles || undefined,
      includeCompanyLogo: data.includeCompanyLogo,
      includeSignature: data.includeSignature,
      signatureTitle: data.signatureTitle || undefined,
      signatoryName: data.signatoryName || undefined,
      signatoryDesignation: data.signatoryDesignation || undefined,
      requiresApproval: data.requiresApproval,
      availablePlaceholders: data.availablePlaceholders || undefined,
    };

    if (editingTemplate) {
      updateMutation.mutate(
        { id: editingTemplate.id, data: payload },
        {
          onSuccess: () => {
            setShowEditorModal(false);
            resetForm();
            refetch();
          },
          onError: (err) => log.error('Error updating template:', err),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setShowEditorModal(false);
          resetForm();
          refetch();
        },
        onError: (err) => log.error('Error creating template:', err),
      });
    }
  }, [editingTemplate, updateMutation, createMutation, resetForm, refetch]);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Letters', href: '/letters' },
    { label: 'Letter Templates' },
  ];

  if (isLoading && templates.length === 0) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="letter-templates">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <span className="ml-2 text-[var(--text-secondary)]">Loading templates...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="letter-templates">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Letter Templates
            </h1>
            <p className="text-[var(--text-secondary)] skeuo-deboss">
              Manage reusable templates for employee letters and certificates
            </p>
          </div>
          <PermissionGate permission={Permissions.LETTER_TEMPLATE_CREATE}>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </PermissionGate>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{error instanceof Error ? error.message : 'Failed to load templates'}</span>
                <Button size="sm" variant="outline" onClick={() => refetch()} className="ml-auto">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search templates by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Categories</option>
            {Object.values(LetterCategory).map((cat) => (
              <option key={cat} value={cat}>
                {getCategoryLabel(cat)}
              </option>
            ))}
          </select>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-sky-100 p-2 dark:bg-sky-900/30">
                        <FileText className="h-5 w-5 text-sky-700 dark:text-sky-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)] line-clamp-1">
                          {template.name}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] font-mono">
                          {template.code}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {template.isSystemTemplate && (
                        <Badge variant="outline" className="text-xs">System</Badge>
                      )}
                      {!template.isActive && (
                        <Badge variant="destructive" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                  </div>

                  {/* Category badge */}
                  <div className="mb-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                      {getCategoryLabel(template.category)}
                    </span>
                  </div>

                  {/* Description */}
                  {template.description && (
                    <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-4">
                    <span>v{template.version || 1}</span>
                    <span>{formatDate(template.updatedAt)}</span>
                  </div>

                  {/* Quick preview snippet */}
                  <div className="border border-[var(--border-main)] rounded-md p-2 mb-4 bg-[var(--bg-secondary)] max-h-20 overflow-hidden">
                    <p className="text-xs text-[var(--text-muted)] line-clamp-3 font-mono">
                      {template.templateContent?.replace(/<[^>]*>/g, '').substring(0, 150)}...
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreview(template)}
                      className="flex-1"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Preview
                    </Button>
                    <PermissionGate permission={Permissions.LETTER_TEMPLATE_MANAGE}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(template)}
                        disabled={!!template.isSystemTemplate}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission={Permissions.LETTER_TEMPLATE_CREATE}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClone(template.id)}
                        disabled={cloneMutation.isPending}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission={Permissions.LETTER_TEMPLATE_MANAGE}>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setShowDeleteConfirm(template.id)}
                        disabled={!!template.isSystemTemplate}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </PermissionGate>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                {searchQuery || categoryFilter ? 'No templates match your filters' : 'No templates yet'}
              </h3>
              <p className="text-[var(--text-secondary)] mb-4">
                {searchQuery || categoryFilter
                  ? 'Try adjusting your search or filters.'
                  : 'Create your first letter template to get started.'}
              </p>
              {!searchQuery && !categoryFilter && (
                <PermissionGate permission={Permissions.LETTER_TEMPLATE_CREATE}>
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </PermissionGate>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-[var(--text-secondary)]">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}

        {/* ── Template Editor Modal ─────────────────────────────────────── */}
        <Modal
          isOpen={showEditorModal}
          onClose={() => {
            setShowEditorModal(false);
            resetForm();
          }}
          size="xl"
        >
          <ModalHeader
            onClose={() => {
              setShowEditorModal(false);
              resetForm();
            }}
          >
            {editingTemplate ? `Edit Template: ${editingTemplate.name}` : 'Create New Template'}
          </ModalHeader>
          <ModalBody>
            <form id="template-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Template Name *
                  </label>
                  <input
                    {...form.register('name')}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="e.g., Standard Offer Letter"
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Template Code *
                  </label>
                  <input
                    {...form.register('code')}
                    disabled={!!editingTemplate}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 font-mono"
                    placeholder="e.g., OFFER_STANDARD"
                  />
                  {form.formState.errors.code && (
                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.code.message}</p>
                  )}
                </div>
              </div>

              {/* Category & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Category *
                  </label>
                  <select
                    {...form.register('category')}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {Object.values(LetterCategory).map((cat) => (
                      <option key={cat} value={cat}>
                        {getCategoryLabel(cat)}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.category && (
                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.category.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Description
                  </label>
                  <input
                    {...form.register('description')}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Brief description of this template"
                  />
                </div>
              </div>

              {/* Template Content Editor with Placeholder Toolbar */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Placeholder Toolbar (side panel) */}
                <div className="lg:col-span-1 order-2 lg:order-1">
                  {placeholders && (
                    <PlaceholderToolbar
                      placeholders={placeholders}
                      onInsert={handleInsertPlaceholder}
                    />
                  )}
                </div>

                {/* Main Editor */}
                <div className="lg:col-span-3 order-1 lg:order-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Template Content (HTML) *
                  </label>
                  <p className="text-xs text-[var(--text-muted)] mb-2">
                    Use HTML markup with {'{{placeholder}}'} syntax. Click placeholders on the left to insert them.
                  </p>
                  <Controller
                    name="templateContent"
                    control={form.control}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={18}
                        className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-sm resize-y"
                        placeholder={'<p>Dear {{employee.name}},</p>\n<p>This is to certify that...</p>'}
                      />
                    )}
                  />
                  {form.formState.errors.templateContent && (
                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.templateContent.message}</p>
                  )}
                </div>
              </div>

              {/* Signature Settings */}
              <div className="border border-[var(--border-main)] rounded-lg p-4">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Signature Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      {...form.register('includeSignature')}
                      className="h-4 w-4 rounded border-surface-300 text-sky-600 focus:ring-sky-500"
                    />
                    <label className="text-sm text-[var(--text-primary)]">Include Signature Block</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      {...form.register('includeCompanyLogo')}
                      className="h-4 w-4 rounded border-surface-300 text-sky-600 focus:ring-sky-500"
                    />
                    <label className="text-sm text-[var(--text-primary)]">Include Company Logo</label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Signatory Name
                    </label>
                    <input
                      {...form.register('signatoryName')}
                      className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      placeholder="e.g., Rajesh Kumar"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Signatory Designation
                    </label>
                    <input
                      {...form.register('signatoryDesignation')}
                      className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      placeholder="e.g., Head of HR"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Signature Title
                    </label>
                    <input
                      {...form.register('signatureTitle')}
                      className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                      placeholder="e.g., For and on behalf of"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      {...form.register('requiresApproval')}
                      className="h-4 w-4 rounded border-surface-300 text-sky-600 focus:ring-sky-500"
                    />
                    <label className="text-sm text-[var(--text-primary)]">Requires Approval Before Issuing</label>
                  </div>
                </div>
              </div>

              {/* Advanced: Header/Footer/CSS (collapsible) */}
              <details className="border border-[var(--border-main)] rounded-lg">
                <summary className="p-4 cursor-pointer text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
                  Advanced Options (Header HTML, Footer HTML, CSS)
                </summary>
                <div className="px-4 pb-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Header HTML
                    </label>
                    <textarea
                      {...form.register('headerHtml')}
                      rows={3}
                      className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="Custom header HTML..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Footer HTML
                    </label>
                    <textarea
                      {...form.register('footerHtml')}
                      rows={3}
                      className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="Custom footer HTML..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Custom CSS Styles
                    </label>
                    <textarea
                      {...form.register('cssStyles')}
                      rows={3}
                      className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder=".letter-body { font-family: 'Times New Roman'; }"
                    />
                  </div>
                </div>
              </details>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowEditorModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="template-form"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </ModalFooter>
        </Modal>

        {/* ── Preview Modal ─────────────────────────────────────────────── */}
        {previewTemplateId && (
          <TemplatePreviewModal
            templateId={previewTemplateId}
            templateName={previewTemplateName}
            isOpen={!!previewTemplateId}
            onClose={() => {
              setPreviewTemplateId(null);
              setPreviewTemplateName('');
            }}
          />
        )}

        {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
        <Modal
          isOpen={!!showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(null)}
          size="sm"
        >
          <ModalHeader onClose={() => setShowDeleteConfirm(null)}>
            Confirm Delete
          </ModalHeader>
          <ModalBody>
            <p className="text-[var(--text-secondary)]">
              Are you sure you want to deactivate this template? It will no longer be available for letter generation.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}
