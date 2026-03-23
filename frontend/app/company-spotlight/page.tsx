'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/layout';
import {
  Lightbulb,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  X,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { isAdmin } from '@/lib/utils';
import { Spotlight, CreateSpotlightRequest, UpdateSpotlightRequest } from '@/lib/types/spotlight';
import { useToast } from '@/components/notifications/ToastProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAllSpotlights, useDeleteSpotlight, useCreateSpotlight, useUpdateSpotlight } from '@/lib/hooks/queries/useSpotlight';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CompanySpotlight');

// Zod schema for spotlight form
const spotlightFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  ctaUrl: z.string().optional(),
  ctaLabel: z.string().optional(),
  bgGradient: z.string().optional(),
  displayOrder: z.number().min(0, 'Display order must be at least 0').optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type SpotlightFormData = z.infer<typeof spotlightFormSchema>;

const GRADIENT_PRESETS: Record<string, { name: string; value: string }> = {
  'indigo-purple': {
    name: 'Indigo Purple',
    value: 'from-indigo-600 to-purple-700',
  },
  'emerald-teal': {
    name: 'Emerald Teal',
    value: 'from-primary-600 to-primary-800',
  },
  'blue-cyan': {
    name: 'Blue Cyan',
    value: 'from-blue-600 to-cyan-700',
  },
  'amber-orange': {
    name: 'Amber Orange',
    value: 'from-amber-600 to-orange-700',
  },
  'rose-pink': {
    name: 'Rose Pink',
    value: 'from-rose-600 to-pink-700',
  },
  'slate-dark': {
    name: 'Slate Dark',
    value: 'from-slate-700 to-slate-900',
  },
};

export default function CompanySpotlightPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSpotlight, setEditingSpotlight] = useState<Spotlight | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // React Query - fetch spotlights
  const { data: spotlightResponse, isLoading: loading } = useAllSpotlights(0, 100);
  const deleteSpotlightMutation = useDeleteSpotlight();

  // Sort by displayOrder
  const spotlights = (spotlightResponse?.content || []).sort(
    (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
  );

  const handleEditSpotlight = (spotlight: Spotlight) => {
    setEditingSpotlight(spotlight);
    setShowCreateModal(true);
  };

  const handleDeleteSpotlight = async () => {
    if (!showDeleteConfirm) return;

    try {
      await deleteSpotlightMutation.mutateAsync(showDeleteConfirm);
      setShowDeleteConfirm(null);
      toast.success('Spotlight Deleted', 'The spotlight slide has been deleted.');
    } catch (error) {
      logger.error('Failed to delete spotlight:', error);
      toast.error('Delete Failed', 'Unable to delete the spotlight. Please try again.');
    }
  };

  // Only admins can access this page
  if (!isAdmin(user?.roles)) {
    return (
      <AppLayout activeMenuItem="company-spotlight">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <EmptyState
              icon={<Lightbulb className="h-12 w-12" />}
              title="Access Denied"
              description="Only administrators can manage company spotlights."
            />
          </div>
        </div>
      </AppLayout>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getGradientClass = (gradient?: string) => {
    if (!gradient) return 'from-slate-600 to-slate-700';
    // Check if it's a preset key
    if (GRADIENT_PRESETS[gradient]) {
      return GRADIENT_PRESETS[gradient].value;
    }
    // Return as-is if it's a full tailwind class
    return gradient;
  };

  return (
    <AppLayout activeMenuItem="company-spotlight">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-4 skeuo-emboss">
                  <Lightbulb className="w-8 h-8 text-amber-500" />
                  Company Spotlight
                </h1>
                <p className="text-[var(--text-secondary)] mt-2 skeuo-deboss">
                  Create carousel slides to highlight company news and culture
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingSpotlight(null);
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Add Slide
              </button>
            </div>
          </motion.div>

          {/* Spotlights List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            ) : spotlights.length === 0 ? (
              <EmptyState
                icon={<Lightbulb className="h-12 w-12" />}
                title="No Spotlights"
                description="No spotlight slides yet. Create one to get started."
              />
            ) : (
              <div className="space-y-4">
                {spotlights.map((spotlight, index) => {
                  const gradientClass = getGradientClass(spotlight.bgGradient);
                  const isDateRestricted = spotlight.startDate || spotlight.endDate;
                  const now = new Date();
                  const isActive =
                    spotlight.isActive &&
                    (!spotlight.startDate || new Date(spotlight.startDate) <= now) &&
                    (!spotlight.endDate || new Date(spotlight.endDate) >= now);

                  return (
                    <motion.div
                      key={spotlight.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-[var(--bg-card)] rounded-xl shadow-sm hover:shadow-md transition-all border border-[var(--border-main)] overflow-hidden group"
                    >
                      <div className="flex gap-6 p-5">
                        {/* Preview */}
                        <div className="w-40 h-32 flex-shrink-0 rounded-lg overflow-hidden">
                          <div
                            className={`w-full h-full bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center p-4 text-center`}
                          >
                            <div className="text-white">
                              <h3 className="font-bold text-sm mb-1 line-clamp-2">
                                {spotlight.title}
                              </h3>
                              {spotlight.description && (
                                <p className="text-xs line-clamp-2 opacity-80">
                                  {spotlight.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-[var(--text-primary)] text-lg truncate">
                                {spotlight.title}
                              </h3>
                              {spotlight.description && (
                                <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                                  {spotlight.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!spotlight.isActive && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                                  Inactive
                                </span>
                              )}
                              {isDateRestricted && !isActive && spotlight.isActive && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                                  Scheduled
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
                            <span>Order: {spotlight.displayOrder}</span>
                            {spotlight.startDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                From {formatDate(spotlight.startDate)}
                              </span>
                            )}
                            {spotlight.endDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Until {formatDate(spotlight.endDate)}
                              </span>
                            )}
                            {spotlight.ctaUrl && (
                              <a
                                href={spotlight.ctaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                CTA Link
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditSpotlight(spotlight)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(spotlight.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateSpotlightModal
            spotlight={editingSpotlight}
            onClose={() => {
              setShowCreateModal(false);
              setEditingSpotlight(null);
            }}
            onSuccess={() => {
              setShowCreateModal(false);
              setEditingSpotlight(null);
              // React Query automatically refetches on mutation success
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={handleDeleteSpotlight}
        title="Delete Spotlight Slide"
        message="Are you sure you want to delete this slide? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleteSpotlightMutation.isPending}
      />
    </AppLayout>
  );
}

interface CreateSpotlightModalProps {
  spotlight?: Spotlight | null;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateSpotlightModal({ spotlight, onClose, onSuccess }: CreateSpotlightModalProps) {
  const toast = useToast();
  const isEditing = !!spotlight;
  const [error, setError] = useState('');
  const createMutation = useCreateSpotlight();
  const updateMutation = useUpdateSpotlight();

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<SpotlightFormData>({
    resolver: zodResolver(spotlightFormSchema),
    defaultValues: {
      title: spotlight?.title || '',
      description: spotlight?.description || '',
      imageUrl: spotlight?.imageUrl || '',
      ctaUrl: spotlight?.ctaUrl || '',
      ctaLabel: spotlight?.ctaLabel || '',
      bgGradient: spotlight?.bgGradient || 'indigo-purple',
      displayOrder: spotlight?.displayOrder || 0,
      startDate: spotlight?.startDate || '',
      endDate: spotlight?.endDate || '',
    },
  });

  const bgGradient = watch('bgGradient');
  const title = watch('title');
  const description = watch('description');
  const ctaLabel = watch('ctaLabel');

  const selectedGradient = GRADIENT_PRESETS[bgGradient || 'indigo-purple'];
  const gradientClass = selectedGradient
    ? selectedGradient.value
    : 'from-indigo-600 to-purple-700';

  const onSubmit = async (data: SpotlightFormData) => {
    setError('');

    try {
      if (isEditing && spotlight) {
        const updatePayload: UpdateSpotlightRequest = {
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
          ctaUrl: data.ctaUrl,
          ctaLabel: data.ctaLabel,
          bgGradient: data.bgGradient || 'indigo-purple',
          displayOrder: data.displayOrder,
          startDate: data.startDate,
          endDate: data.endDate,
        };
        await updateMutation.mutateAsync({ id: spotlight.id, data: updatePayload });
        toast.success('Spotlight Updated', 'The spotlight slide has been updated.');
      } else {
        const createPayload: CreateSpotlightRequest = {
          title: data.title as string, // Zod validation ensures this is non-empty
          description: data.description,
          imageUrl: data.imageUrl,
          ctaUrl: data.ctaUrl,
          ctaLabel: data.ctaLabel,
          bgGradient: data.bgGradient || 'indigo-purple',
          displayOrder: data.displayOrder || 0,
          startDate: data.startDate,
          endDate: data.endDate,
        };
        await createMutation.mutateAsync(createPayload);
        toast.success('Spotlight Created', 'The spotlight slide has been created.');
      }
      onSuccess();
    } catch (err: unknown) {
      logger.error(`Failed to ${isEditing ? 'update' : 'create'} spotlight:`, err);
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} spotlight`;
      setError(errorMessage);
      toast.error(isEditing ? 'Update Failed' : 'Create Failed', errorMessage);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[var(--bg-card)] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {isEditing ? 'Edit Spotlight Slide' : 'Create Spotlight Slide'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Form */}
            <div className="col-span-2 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('title')}
                  className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white"
                  placeholder="Enter slide title"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white resize-none"
                  placeholder="Optional description"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  {...register('imageUrl')}
                  className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white"
                  placeholder="https://..."
                />
              </div>

              {/* CTA Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    CTA URL
                  </label>
                  <input
                    type="url"
                    {...register('ctaUrl')}
                    className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    CTA Label
                  </label>
                  <input
                    type="text"
                    {...register('ctaLabel')}
                    className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white"
                    placeholder="Learn More"
                  />
                </div>
              </div>

              {/* Background Gradient */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Background Gradient
                </label>
                <select
                  {...register('bgGradient')}
                  className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white"
                >
                  {Object.entries(GRADIENT_PRESETS).map(([key, { name }]) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  {...register('displayOrder', { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Lower numbers appear first
                </p>
              </div>

              {/* Date Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    {...register('startDate')}
                    className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    {...register('endDate')}
                    className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-[var(--bg-secondary)] dark:text-white"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>

            {/* Right: Preview */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                Live Preview
              </label>
              <div
                className={`w-full aspect-video rounded-lg bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center p-4 text-center shadow-lg overflow-hidden`}
              >
                <div className="text-white max-w-full">
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">
                    {title || 'Your Slide Title'}
                  </h3>
                  {description && (
                    <p className="text-sm line-clamp-2 opacity-90 mb-4">
                      {description}
                    </p>
                  )}
                  {ctaLabel && (
                    <button className="mt-4 px-4 py-2 bg-white text-sm font-semibold rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors truncate">
                      {ctaLabel}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-main)] flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-[var(--border-main)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-surface)] transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Lightbulb className="w-4 h-4" />
                {isEditing ? 'Update' : 'Create Slide'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
