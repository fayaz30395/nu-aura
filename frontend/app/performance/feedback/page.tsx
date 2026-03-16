'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout';
import { useReceivedFeedback, useGivenFeedback, useCreateFeedback, useUpdateFeedback, useDeleteFeedback } from '@/lib/hooks/queries/usePerformance';
import { Feedback, FeedbackRequest, FeedbackType } from '@/lib/types/performance';
import { useToast } from '@/components/notifications/ToastProvider';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const feedbackFormSchema = z.object({
  recipientId: z.string().min(1, 'Recipient is required'),
  giverId: z.string().min(1, 'Giver ID is required'),
  feedbackType: z.enum(['PRAISE', 'CONSTRUCTIVE', 'GENERAL', 'REQUEST'] as const) as z.ZodType<FeedbackType>,
  category: z.string().optional().or(z.literal('')),
  feedbackText: z.string().min(1, 'Feedback is required').max(5000),
  isAnonymous: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  relatedReviewId: z.string().optional().or(z.literal('')),
});

type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

export default function FeedbackPage() {
  const toast = useToast();

  // Get current user ID from localStorage
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && !currentUserId) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.employeeId) {
        setCurrentUserId(user.employeeId);
      }
    }
  }, [currentUserId]);

  // React Query hooks
  const receivedQuery = useReceivedFeedback(currentUserId);
  const givenQuery = useGivenFeedback(currentUserId);
  const createMutation = useCreateFeedback();
  const updateMutation = useUpdateFeedback();
  const deleteMutation = useDeleteFeedback();

  // Local state
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');
  const [filterType, setFilterType] = useState<FeedbackType | 'ALL'>('ALL');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      recipientId: '',
      giverId: '',
      feedbackType: 'GENERAL',
      category: '',
      feedbackText: '',
      isAnonymous: false,
      isPublic: false,
      relatedReviewId: '',
    },
  });

  const receivedFeedback = receivedQuery.data || [];
  const givenFeedback = givenQuery.data || [];
  const isLoading = receivedQuery.isLoading || givenQuery.isLoading;

  const handleFormSubmit = async (formData: FeedbackFormData) => {
    const feedbackData = {
      ...formData,
      giverId: currentUserId,
      category: formData.category || '',
      relatedReviewId: formData.relatedReviewId || undefined,
    };

    if (selectedFeedback) {
      await updateMutation.mutateAsync({ id: selectedFeedback.id, data: feedbackData as FeedbackRequest });
    } else {
      await createMutation.mutateAsync(feedbackData as FeedbackRequest);
    }

    setShowModal(false);
    resetFormHandler();
  };

  const handleDelete = async () => {
    if (!selectedFeedback) return;
    await deleteMutation.mutateAsync(selectedFeedback.id);
    setShowDeleteConfirm(false);
    setSelectedFeedback(null);
  };

  const openEditModal = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    reset({
      recipientId: feedback.recipientId,
      giverId: feedback.giverId,
      feedbackType: feedback.feedbackType,
      category: feedback.category || '',
      feedbackText: feedback.feedbackText,
      isAnonymous: feedback.isAnonymous,
      isPublic: feedback.isPublic,
      relatedReviewId: feedback.relatedReviewId || '',
    });
    setShowModal(true);
  };

  const openDeleteConfirm = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setShowDeleteConfirm(true);
  };

  const resetFormHandler = () => {
    setSelectedFeedback(null);
    reset({
      recipientId: '',
      giverId: '',
      feedbackType: 'GENERAL',
      category: '',
      feedbackText: '',
      isAnonymous: false,
      isPublic: false,
      relatedReviewId: '',
    });
  };

  const getTypeColor = (type: FeedbackType) => {
    switch (type) {
      case 'PRAISE': return 'bg-green-100 text-green-800';
      case 'CONSTRUCTIVE': return 'bg-yellow-100 text-yellow-800';
      case 'GENERAL': return 'bg-primary-50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-400';
      case 'REQUEST': return 'bg-purple-100 text-purple-800';
      default: return 'bg-[var(--bg-secondary)] text-[var(--text-primary)]';
    }
  };

  const currentFeedbackList = activeTab === 'received' ? receivedFeedback : givenFeedback;
  const filteredFeedback = currentFeedbackList.filter(feedback => {
    if (filterType !== 'ALL' && feedback.feedbackType !== filterType) return false;
    return true;
  });

  if (!currentUserId) {
    return (
      <AppLayout activeMenuItem="performance">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="performance">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Feedback</h1>
          <button
            onClick={() => {
              resetFormHandler();
              setShowModal(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Give Feedback
          </button>
        </div>

        <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('received')}
              className={'flex-1 px-6 py-4 font-semibold transition-colors ' + (activeTab === 'received' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-secondary)]')}
            >
              Received Feedback ({receivedFeedback.length})
            </button>
            <button
              onClick={() => setActiveTab('given')}
              className={'flex-1 px-6 py-4 font-semibold transition-colors ' + (activeTab === 'given' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-secondary)]')}
            >
              Given Feedback ({givenFeedback.length})
            </button>
          </div>

          <div className="p-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Filter by Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FeedbackType | 'ALL')}
                className="w-full md:w-1/2 px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">All Types</option>
                <option value="PRAISE">Praise</option>
                <option value="CONSTRUCTIVE">Constructive</option>
                <option value="GENERAL">General</option>
                <option value="REQUEST">Request</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-[var(--text-secondary)]">Loading feedback...</div>
          </div>
        ) : filteredFeedback.length === 0 ? (
          <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg shadow-md p-12 text-center">
            <div className="text-[var(--text-secondary)] mb-4">
              No {activeTab === 'received' ? 'received' : 'given'} feedback found
            </div>
            {activeTab === 'given' && (
              <button
                onClick={() => {
                  resetFormHandler();
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Give Your First Feedback
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFeedback.map((feedback) => (
              <div key={feedback.id} className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <span className={'px-2 py-1 rounded text-xs font-medium ' + getTypeColor(feedback.feedbackType)}>
                        {feedback.feedbackType}
                      </span>
                      {feedback.category && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                          {feedback.category}
                        </span>
                      )}
                      {feedback.isAnonymous && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          Anonymous
                        </span>
                      )}
                      {feedback.isPublic && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          Public
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)] mb-2">
                      {feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-[var(--text-primary)] whitespace-pre-wrap">{feedback.feedbackText}</p>
                </div>

                {activeTab === 'given' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(feedback)}
                      className="flex-1 px-3 py-2 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded hover:bg-primary-100 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(feedback)}
                      className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">
                  {selectedFeedback ? 'Edit Feedback' : 'Give Feedback'}
                </h2>
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Recipient Employee ID *
                      </label>
                      <input
                        type="text"
                        placeholder="Enter employee ID"
                        {...register('recipientId')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {errors.recipientId && (
                        <p className="text-red-500 text-sm mt-1">{errors.recipientId.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Feedback Type *
                      </label>
                      <select
                        {...register('feedbackType')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="PRAISE">Praise</option>
                        <option value="CONSTRUCTIVE">Constructive</option>
                        <option value="GENERAL">General</option>
                        <option value="REQUEST">Request</option>
                      </select>
                      {errors.feedbackType && (
                        <p className="text-red-500 text-sm mt-1">{errors.feedbackType.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Category
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Communication, Leadership, Technical Skills"
                        {...register('category')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {errors.category && (
                        <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Feedback *
                      </label>
                      <textarea
                        rows={6}
                        placeholder="Provide detailed feedback..."
                        {...register('feedbackText')}
                        className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {errors.feedbackText && (
                        <p className="text-red-500 text-sm mt-1">{errors.feedbackText.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('isAnonymous')}
                          className="w-4 h-4 text-primary-600 border-[var(--border-main)] dark:border-[var(--border-main)] rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-[var(--text-secondary)]">
                          Submit as anonymous
                        </span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          {...register('isPublic')}
                          className="w-4 h-4 text-primary-600 border-[var(--border-main)] dark:border-[var(--border-main)] rounded focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-[var(--text-secondary)]">
                          Make this feedback public
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetFormHandler();
                      }}
                      className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : selectedFeedback ? 'Update' : 'Submit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && selectedFeedback && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Delete Feedback</h2>
              <p className="text-[var(--text-secondary)] mb-6">
                Are you sure you want to delete this feedback? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedFeedback(null);
                  }}
                  className="flex-1 px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
