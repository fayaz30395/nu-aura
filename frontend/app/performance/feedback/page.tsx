'use client';

import {useState} from 'react';
import {Button, NativeSelect} from '@mantine/core';
import {MessageSquare, Plus} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {Card} from '@/components/ui/Card';
import {EmptyState} from '@/components/ui/EmptyState';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  useCreateFeedback,
  useDeleteFeedback,
  useGivenFeedback,
  useReceivedFeedback,
  useUpdateFeedback
} from '@/lib/hooks/queries/useFeedback';
import {Feedback, FeedbackRequest, FeedbackType} from '@/lib/types/grow/performance';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {FeedbackCard} from './_components/FeedbackCard';
import {type FeedbackFormData, FeedbackFormModal} from './_components/FeedbackFormModal';
import {FEEDBACK_TYPE_OPTIONS} from './_components/feedbackOptions';

type FeedbackTab = 'received' | 'given';

const FILTER_OPTIONS = [{value: 'ALL', label: 'All Types'}, ...FEEDBACK_TYPE_OPTIONS];
const BREADCRUMBS = [{label: 'Performance', href: '/performance'}, {label: 'Feedback'}];

export default function FeedbackPage() {
  const {user} = useAuth();
  const currentUserId = user?.employeeId || '';
  const {hasPermission} = usePermissions();

  // React Query hooks
  const receivedQuery = useReceivedFeedback(currentUserId);
  const givenQuery = useGivenFeedback(currentUserId);
  const createMutation = useCreateFeedback();
  const updateMutation = useUpdateFeedback();
  const deleteMutation = useDeleteFeedback();

  // Local state
  const [showModal, setShowModal] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [deletingFeedback, setDeletingFeedback] = useState<Feedback | null>(null);
  const [activeTab, setActiveTab] = useState<FeedbackTab>('received');
  const [filterType, setFilterType] = useState<FeedbackType | 'ALL'>('ALL');

  const openCreateModal = () => {
    setEditingFeedback(null);
    setShowModal(true);
  };

  const openEditModal = (feedback: Feedback) => {
    setEditingFeedback(feedback);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingFeedback(null);
  };

  // Failures are reported by the global MutationCache toast; the modal stays open so the user can retry.
  const handleFormSubmit = async (formData: FeedbackFormData) => {
    const feedbackData = {
      ...formData,
      giverId: currentUserId,
      category: formData.category || '',
      relatedReviewId: formData.relatedReviewId || undefined,
    };

    try {
      if (editingFeedback) {
        await updateMutation.mutateAsync({id: editingFeedback.id, data: feedbackData as FeedbackRequest});
      } else {
        await createMutation.mutateAsync(feedbackData as FeedbackRequest);
      }
    } catch {
      return;
    }
    closeModal();
  };

  const handleDelete = async () => {
    if (!deletingFeedback) return;
    try {
      await deleteMutation.mutateAsync(deletingFeedback.id);
    } catch {
      return;
    }
    setDeletingFeedback(null);
  };

  if (!currentUserId) {
    return (
      <AppLayout activeMenuItem="performance" breadcrumbs={BREADCRUMBS}>
        <div className="mx-auto w-full max-w-7xl">
          <ListPageSkeleton rows={4} columns={3}/>
        </div>
      </AppLayout>
    );
  }

  const activeQuery = activeTab === 'received' ? receivedQuery : givenQuery;
  const canCreate = hasPermission(Permissions.REVIEW_CREATE);
  const tabs: {value: FeedbackTab; label: string; count: number}[] = [
    {value: 'received', label: 'Received Feedback', count: receivedQuery.data?.length ?? 0},
    {value: 'given', label: 'Given Feedback', count: givenQuery.data?.length ?? 0},
  ];

  return (
    <AppLayout activeMenuItem="performance" breadcrumbs={BREADCRUMBS}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          title="Feedback"
          description="Give and receive ongoing feedback all year."
          actions={
            <PermissionGate permission={Permissions.REVIEW_CREATE}>
              <Button leftSection={<Plus className="h-4 w-4" aria-hidden/>} onClick={openCreateModal}>
                Give Feedback
              </Button>
            </PermissionGate>
          }
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div role="group" aria-label="Feedback view" className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Button
                key={tab.value}
                variant={activeTab === tab.value ? 'light' : 'subtle'}
                color={activeTab === tab.value ? undefined : 'gray'}
                aria-pressed={activeTab === tab.value}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label} ({tab.count})
              </Button>
            ))}
          </div>
          <NativeSelect
            id="feedback-filter-type"
            label="Filter by Type"
            data={FILTER_OPTIONS}
            value={filterType}
            onChange={(e) => setFilterType(e.currentTarget.value as FeedbackType | 'ALL')}
            className="w-full sm:w-56"
          />
        </div>

        <QueryState
          query={activeQuery}
          skeleton={<ListPageSkeleton showHeader={false} showFilters={false} rows={4} columns={2}/>}
          errorTitle="Couldn't load feedback"
        >
          {(list) => {
            const filtered = (list ?? []).filter(
              (feedback) => filterType === 'ALL' || feedback.feedbackType === filterType);

            if (filtered.length === 0) {
              const emptyAction = filterType !== 'ALL'
                ? {actionLabel: 'Clear filters', onAction: () => setFilterType('ALL')}
                : activeTab === 'given' && canCreate
                  ? {actionLabel: 'Give Your First Feedback', onAction: openCreateModal}
                  : {};
              return (
                <Card className="rounded-lg">
                  <EmptyState
                    icon={<MessageSquare className="h-full w-full"/>}
                    title={`No ${activeTab} feedback found`}
                    description={filterType !== 'ALL'
                      ? 'No feedback matches the selected type.'
                      : activeTab === 'given'
                        ? 'Feedback you give to colleagues will appear here.'
                        : 'Feedback colleagues share with you will appear here.'}
                    {...emptyAction}
                  />
                </Card>
              );
            }

            return (
              <div className="flex flex-col gap-4">
                {filtered.map((feedback) => (
                  <FeedbackCard
                    key={feedback.id}
                    feedback={feedback}
                    editable={activeTab === 'given'}
                    onEdit={openEditModal}
                    onDelete={setDeletingFeedback}
                  />
                ))}
              </div>
            );
          }}
        </QueryState>
      </div>

      <FeedbackFormModal
        isOpen={showModal}
        feedback={editingFeedback}
        currentUserId={currentUserId}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDialog
        isOpen={!!deletingFeedback}
        onClose={() => setDeletingFeedback(null)}
        onConfirm={handleDelete}
        title="Delete Feedback"
        message="Are you sure you want to delete this feedback? This action cannot be undone."
        confirmText="Delete"
        type="danger"
        loading={deleteMutation.isPending}
      />
    </AppLayout>
  );
}
