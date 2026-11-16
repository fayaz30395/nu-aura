'use client';

import {useMemo, useState} from 'react';
import {Card} from '@/components/ui/Card';
import {Badge, Button, NativeSelect, Skeleton, TextInput} from '@mantine/core';
import {Info, Plus, Search, Shield} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {EmptyState} from '@/components/ui/EmptyState';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useAllReviews} from '@/lib/hooks/queries/useReviews';
import {usePerformanceAllCycles} from '@/lib/hooks/queries/useReviewCycles';
import type {CompetencyCategory} from '@/lib/types/grow/performance';
import {AddCompetencyModal} from './_components/AddCompetencyModal';
import {CategoryLegend} from './_components/CategoryLegend';
import {ReviewCompetencyPanel} from './_components/ReviewCompetencyPanel';

export default function CompetencyFrameworkPage() {
  const cyclesQuery = usePerformanceAllCycles(0, 100);
  const allReviewsQuery = useAllReviews(0, 500);

  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CompetencyCategory | ''>('');
  const [addModal, setAddModal] = useState<{open: boolean; reviewId: string | null}>({open: false, reviewId: null});

  const cycles = cyclesQuery.data?.content ?? [];
  const allReviews = useMemo(() => allReviewsQuery.data?.content ?? [], [allReviewsQuery.data?.content]);

  const cycleReviews = useMemo(() => {
    if (!selectedCycleId) return [];
    return allReviews.filter((r) => (r.reviewCycleId || r.cycleId) === selectedCycleId);
  }, [selectedCycleId, allReviews]);

  const filteredReviews = useMemo(() => {
    if (!searchQuery) return cycleReviews;
    const q = searchQuery.toLowerCase();
    return cycleReviews.filter(
      (r) =>
        (r.employeeName ?? '').toLowerCase().includes(q) ||
        (r.department ?? '').toLowerCase().includes(q)
    );
  }, [cycleReviews, searchQuery]);

  const reviewLabels = useMemo(
    () => filteredReviews.map((review) => ({
      value: review.id,
      label: review.employeeName
        ? `${review.employeeName} (${review.reviewType ?? 'REVIEW'})`
        : `Review ${review.id.slice(0, 8)}`,
    })),
    [filteredReviews]
  );

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);

  return (
    <AppLayout
      breadcrumbs={[{label: 'Performance', href: '/performance'}, {label: 'Competency Framework'}]}
    >
      <PermissionGate
        permission={Permissions.REVIEW_VIEW}
        fallback={
          <EmptyState
            icon={<Shield className="h-8 w-8"/>}
            title="Access Denied"
            description="You do not have permission to view competency frameworks."
          />
        }
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6">
          <PageHeader
            title="Competency Framework"
            description="Manage competency ratings for employees within a review cycle."
            actions={
              <PermissionGate permission={Permissions.REVIEW_CREATE}>
                <Button
                  leftSection={<Plus className="h-4 w-4"/>}
                  onClick={() => setAddModal({open: true, reviewId: null})}
                  disabled={reviewLabels.length === 0}
                >
                  Add Competency
                </Button>
              </PermissionGate>
            }
          />

          <CategoryLegend value={categoryFilter} onChange={setCategoryFilter}/>

          <Card as="section" className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <QueryState
                query={cyclesQuery}
                skeleton={<Skeleton height={60} radius="md" className="flex-1" aria-label="Loading review cycles"/>}
                errorTitle="Couldn't load review cycles"
              >
                {() => (
                  <NativeSelect
                    id="review-cycle-select"
                    label="Review Cycle"
                    aria-label="Cycle"
                    value={selectedCycleId}
                    onChange={(e) => setSelectedCycleId(e.currentTarget.value)}
                    data={[
                      {value: '', label: 'Select a cycle…'},
                      ...cycles.map((c) => ({value: c.id, label: `${c.name} (${c.status})`})),
                    ]}
                    className="flex-1"
                  />
                )}
              </QueryState>
              {selectedCycleId && (
                <TextInput
                  id="competency-search-employee"
                  label="Search Employee"
                  placeholder="Filter by name or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  leftSection={<Search size={14} aria-hidden/>}
                  className="flex-1"
                />
              )}
            </div>

            {selectedCycle && (
              <div className="flex items-center gap-4 border-t border-border pt-4">
                <Badge variant="light" color={selectedCycle.status === 'ACTIVE' ? 'green' : 'gray'}>
                  {selectedCycle.status}
                </Badge>
                <span className="text-xs text-text-2">
                  {filteredReviews.length} review{filteredReviews.length !== 1 ? 's' : ''} in this cycle
                </span>
              </div>
            )}
          </Card>

          {!selectedCycleId ? (
            <EmptyState
              icon={<Info className="h-8 w-8"/>}
              title="Select a review cycle"
              description="Choose a cycle above to manage competencies for its reviews."
            />
          ) : (
            <QueryState
              query={allReviewsQuery}
              skeleton={<ListPageSkeleton showHeader={false} showFilters={false} rows={5} columns={3}/>}
              errorTitle="Couldn't load reviews"
            >
              {() => filteredReviews.length === 0 ? (
                <EmptyState
                  icon={<Info className="h-8 w-8"/>}
                  title="No reviews found"
                  description={searchQuery ? 'Try a different search term' : 'No reviews exist for this cycle yet.'}
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-text-2">
                    {filteredReviews.length} Review{filteredReviews.length !== 1 ? 's' : ''}. Click to expand & manage
                    competencies.
                  </p>
                  {reviewLabels.map((review) => (
                    <ReviewCompetencyPanel
                      key={review.value}
                      reviewId={review.value}
                      employeeName={review.label}
                      onAddClick={(rid) => setAddModal({open: true, reviewId: rid})}
                      categoryFilter={categoryFilter}
                    />
                  ))}
                </div>
              )}
            </QueryState>
          )}
        </div>

        <AddCompetencyModal
          reviewId={addModal.reviewId}
          reviewOptions={reviewLabels}
          isOpen={addModal.open}
          onClose={() => setAddModal((prev) => ({...prev, open: false}))}
        />
      </PermissionGate>
    </AppLayout>
  );
}
