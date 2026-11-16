'use client';

import {useState} from 'react';
import {Button, NativeSelect} from '@mantine/core';
import {ClipboardList, Plus, UserCheck} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {EmptyState} from '@/components/ui/EmptyState';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useEmployeeReviews} from '@/lib/hooks/queries/useReviews';
import {useAuth} from '@/lib/hooks/useAuth';
import type {PerformanceReview, ReviewStatus, ReviewType} from '@/lib/types/grow/performance';
import {ReviewCard} from './_components/ReviewCard';
import {ReviewFormModal} from './_components/ReviewFormModal';
import {REVIEW_STATUS_OPTIONS, REVIEW_TYPE_OPTIONS, type ReviewFormData} from './_components/reviewForm';
import {useReviewActions} from './_hooks/useReviewActions';

const TYPE_FILTER_OPTIONS = [{value: 'ALL', label: 'All Types'}, ...REVIEW_TYPE_OPTIONS];
const STATUS_FILTER_OPTIONS = [{value: 'ALL', label: 'All Status'}, ...REVIEW_STATUS_OPTIONS];
const BREADCRUMBS = [{label: 'Performance', href: '/performance'}, {label: 'Reviews'}];

export default function PerformanceReviewsPage() {
  const {user} = useAuth();
  const {hasPermission} = usePermissions();
  const reviewsQuery = useEmployeeReviews(user?.employeeId || '');
  const {saveReview, deleteReview, isSaving, isDeleting} = useReviewActions(user?.employeeId);

  const [showModal, setShowModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [deletingReview, setDeletingReview] = useState<PerformanceReview | null>(null);
  const [filterType, setFilterType] = useState<ReviewType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<ReviewStatus | 'ALL'>('ALL');

  const openCreateModal = () => {
    setSelectedReview(null);
    setShowModal(true);
  };

  const openEditModal = (review: PerformanceReview) => {
    setSelectedReview(review);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedReview(null);
  };

  const handleFormSubmit = async (formData: ReviewFormData, competencyRatings: Record<string, number>) => {
    if (await saveReview(formData, selectedReview, competencyRatings)) closeModal();
  };

  const handleDelete = async () => {
    if (!deletingReview) return;
    if (await deleteReview(deletingReview)) setDeletingReview(null);
  };

  if (!user?.employeeId) {
    return (
      <AppLayout activeMenuItem="performance" breadcrumbs={BREADCRUMBS}>
        <EmptyState
          icon={<UserCheck className="h-8 w-8"/>}
          title="No Employee Profile Linked"
          description="Performance reviews require an employee profile. Use the admin panels to manage employee reviews."
          actionLabel="Go Back"
          onAction={() => window.history.back()}
        />
      </AppLayout>
    );
  }

  const filtersActive = filterType !== 'ALL' || filterStatus !== 'ALL';
  const canCreate = hasPermission(Permissions.REVIEW_CREATE);

  return (
    <AppLayout activeMenuItem="performance" breadcrumbs={BREADCRUMBS}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          title="Performance Reviews"
          description="Track self, manager and peer reviews across review periods."
          actions={
            <PermissionGate permission={Permissions.REVIEW_CREATE}>
              <Button leftSection={<Plus className="h-4 w-4" aria-hidden/>} onClick={openCreateModal}>
                Create Review
              </Button>
            </PermissionGate>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
          <NativeSelect
            id="review-filter-type"
            label="Filter by Type"
            data={TYPE_FILTER_OPTIONS}
            value={filterType}
            onChange={(e) => setFilterType(e.currentTarget.value as ReviewType | 'ALL')}
          />
          <NativeSelect
            id="review-filter-status"
            label="Filter by Status"
            data={STATUS_FILTER_OPTIONS}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.currentTarget.value as ReviewStatus | 'ALL')}
          />
        </div>

        <QueryState
          query={reviewsQuery}
          skeleton={<ListPageSkeleton showHeader={false} showFilters={false} rows={4} columns={3}/>}
          errorTitle="Couldn't load reviews"
        >
          {(data) => {
            const reviews = (data ?? []).filter((review) =>
              (filterType === 'ALL' || review.reviewType === filterType) &&
              (filterStatus === 'ALL' || review.status === filterStatus));

            if (reviews.length === 0) {
              return filtersActive ? (
                <EmptyState
                  icon={<ClipboardList className="h-8 w-8"/>}
                  title="No reviews found"
                  description="No reviews match the selected filters."
                  actionLabel="Clear filters"
                  onAction={() => {
                    setFilterType('ALL');
                    setFilterStatus('ALL');
                  }}
                />
              ) : (
                <EmptyState
                  icon={<ClipboardList className="h-8 w-8"/>}
                  title="No reviews found"
                  description="Adjust your filters or create a new performance review to get started."
                  {...(canCreate ? {actionLabel: 'Create Your First Review', onAction: openCreateModal} : {})}
                />
              );
            }

            return (
              <div className="flex flex-col gap-4">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} onEdit={openEditModal} onDelete={setDeletingReview}/>
                ))}
              </div>
            );
          }}
        </QueryState>
      </div>

      <ReviewFormModal
        isOpen={showModal}
        review={selectedReview}
        isSaving={isSaving}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDialog
        isOpen={!!deletingReview}
        onClose={() => setDeletingReview(null)}
        onConfirm={handleDelete}
        title="Delete Review?"
        message="This action cannot be undone. The review will be permanently deleted."
        confirmText="Delete"
        type="danger"
        loading={isDeleting}
      />
    </AppLayout>
  );
}
