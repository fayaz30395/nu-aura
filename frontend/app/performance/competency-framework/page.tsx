'use client';

import {useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  BookOpen,
  Brain,
  ChevronDown,
  ChevronRight,
  Info,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Star,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {EmptyState} from '@/components/ui/EmptyState';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {Input} from '@/components/ui/Input';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {useAllReviews, useDeleteCompetency, usePerformanceAllCycles,} from '@/lib/hooks/queries/usePerformance';
import {useAddCompetency, useReviewCompetencies,} from '@/lib/hooks/useCompetency';
import type {CompetencyCategory, ReviewCompetency} from '@/lib/types/grow/performance';

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: CompetencyCategory; label: string; icon: React.ReactNode }[] = [
  {value: 'TECHNICAL', label: 'Technical', icon: <Target size={14}/>},
  {value: 'BEHAVIORAL', label: 'Behavioral', icon: <Brain size={14}/>},
  {value: 'LEADERSHIP', label: 'Leadership', icon: <TrendingUp size={14}/>},
  {value: 'DOMAIN', label: 'Domain', icon: <BookOpen size={14}/>},
  {value: 'PROBLEM_SOLVING', label: 'Problem Solving', icon: <Shield size={14}/>},
];

const CATEGORY_COLORS: Record<CompetencyCategory, string> = {
  TECHNICAL: 'bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-300',
  BEHAVIORAL: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300',
  LEADERSHIP: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300',
  DOMAIN: 'bg-accent-200 text-accent-900 dark:bg-accent-900/30 dark:text-accent-400',
  PROBLEM_SOLVING: 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-300',
};

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const competencySchema = z.object({
  reviewId: z.string().min(1, 'Review is required'),
  competencyName: z.string().min(1, 'Competency name is required').max(100),
  category: z.enum(['TECHNICAL', 'BEHAVIORAL', 'LEADERSHIP', 'DOMAIN', 'PROBLEM_SOLVING']),
  rating: z.coerce.number().min(1).max(5),
  comments: z.string().optional(),
});

type CompetencyFormData = z.infer<typeof competencySchema>;

// ─── Sub-components ────────────────────────────────────────────────────────────

function RatingStars({value}: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={12}
          className={
            star <= value
              ? 'text-warning-400 fill-warning-400'
              : 'text-[var(--border-main)] fill-[var(--border-main)]'
          }
        />
      ))}
      <span className="ml-1 text-caption">{value.toFixed(1)}</span>
    </span>
  );
}

function CategoryBadge({category}: { category: CompetencyCategory }) {
  const label = CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLORS[category]}`}
    >
      {label}
    </span>
  );
}

// ─── Review Competency Panel ───────────────────────────────────────────────────

function ReviewCompetencyPanel({
                                 reviewId,
                                 employeeName,
                                 onAddClick,
                               }: {
  reviewId: string;
  employeeName: string;
  onAddClick: (reviewId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const {data: competencies = [], isLoading, refetch} = useReviewCompetencies(reviewId, expanded);
  const deleteCompetencyMutation = useDeleteCompetency();
  const [deleteTarget, setDeleteTarget] = useState<ReviewCompetency | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, ReviewCompetency[]> = {};
    for (const c of competencies) {
      if (!map[c.category]) map[c.category] = [];
      map[c.category].push(c);
    }
    return map;
  }, [competencies]);

  const avgRating =
    competencies.length > 0
      ? competencies.reduce((sum, c) => sum + c.rating, 0) / competencies.length
      : null;

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteCompetencyMutation.mutate({id: deleteTarget.id, reviewId});
    setDeleteTarget(null);
  };

  return (
    <div className="border border-[var(--border-main)] rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full row-between px-6 py-4 bg-[var(--bg-input)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
      >
        <div className="flex items-center gap-4">
          {expanded ? (
            <ChevronDown size={16} className="text-[var(--text-muted)]"/>
          ) : (
            <ChevronRight size={16} className="text-[var(--text-muted)]"/>
          )}
          <span className="font-medium text-[var(--text-primary)]">{employeeName}</span>
          <span className="text-caption">
            {competencies.length} competenc{competencies.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {avgRating != null && (
            <span className="text-xs text-[var(--text-secondary)]">
              Avg: {avgRating.toFixed(1)}
            </span>
          )}
          <PermissionGate permission={Permissions.REVIEW_CREATE}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddClick(reviewId);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent-700 text-white text-xs font-medium hover:bg-accent-800 transition-colors cursor-pointer"
            >
              <Plus size={12}/>
              Add
            </button>
          </PermissionGate>
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="bg-[var(--bg-surface)] px-6 py-4">
          {isLoading ? (
            <div className="flex items-center gap-2 py-4 text-[var(--text-muted)]">
              <RefreshCw size={14} className="animate-spin"/>
              <span className="text-sm">Loading competencies…</span>
            </div>
          ) : competencies.length === 0 ? (
            <EmptyState
              icon={<Info className="w-full h-full"/>}
              title="No competencies added yet"
              actionLabel="Refresh"
              onAction={() => refetch()}
              size="compact"
            />
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                    {category}
                  </p>
                  <div className="space-y-2">
                    {items.map((comp) => (
                      <div
                        key={comp.id}
                        className="flex items-start justify-between gap-4 p-4 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)]"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-[var(--text-primary)]">
                              {comp.competencyName}
                            </span>
                            <CategoryBadge category={comp.category}/>
                          </div>
                          {comp.comments && (
                            <p className="text-caption mt-1 line-clamp-2">
                              {comp.comments}
                            </p>
                          )}
                          <div className="mt-2">
                            <RatingStars value={comp.rating}/>
                          </div>
                        </div>
                        <PermissionGate permission={Permissions.REVIEW_DELETE}>
                          <button
                            onClick={() => setDeleteTarget(comp)}
                            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-danger-600 hover:bg-danger-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500"
                          >
                            <Trash2 size={14}/>
                          </button>
                        </PermissionGate>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Competency"
        message={`Remove "${deleteTarget?.competencyName}" from this review?`}
        confirmText="Remove"
        type="danger"
      />
    </div>
  );
}

// ─── Add Competency Modal ─────────────────────────────────────────────────────

function AddCompetencyModal({
                              reviewId,
                              isOpen,
                              onClose,
                            }: {
  reviewId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const addMutation = useAddCompetency();

  const {
    register,
    handleSubmit,
    reset,
    formState: {errors, isSubmitting},
  } = useForm<CompetencyFormData>({
    resolver: zodResolver(competencySchema),
    defaultValues: {
      reviewId: reviewId ?? '',
      competencyName: '',
      category: 'TECHNICAL',
      rating: 3,
      comments: '',
    },
  });

  const onSubmit = async (data: CompetencyFormData) => {
    await addMutation.mutateAsync({
      reviewId: data.reviewId,
      competencyName: data.competencyName,
      category: data.category,
      rating: data.rating,
      comments: data.comments,
    });
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>Add Competency</ModalHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody className="space-y-4">
          {/* Hidden reviewId */}
          <Input type="hidden" {...register('reviewId')} value={reviewId ?? ''}/>

          {/* Competency Name */}
          <div>
            <label htmlFor="competency-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Competency Name <span aria-hidden="true" className="text-danger-500">*</span>
            </label>
            <Input
              id="competency-name"
              {...register('competencyName')}
              type="text"
              aria-required="true"
              placeholder="e.g. System Design, Communication"
            />
            {errors.competencyName && (
              <p className="text-xs text-danger-500 mt-1">{errors.competencyName.message}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="competency-category" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Category <span aria-hidden="true" className="text-danger-500">*</span>
            </label>
            <select
              id="competency-category"
              aria-label="Category"
              {...register('category')}
              aria-required="true"
              className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-xs text-danger-500 mt-1">{errors.category.message}</p>
            )}
          </div>

          {/* Rating */}
          <div>
            <label htmlFor="competency-rating" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Rating (1–5) <span aria-hidden="true" className="text-danger-500">*</span>
            </label>
            <Input
              id="competency-rating"
              {...register('rating')}
              type="number"
              min={1}
              max={5}
              step={0.5}
              aria-required="true"
            />
            {errors.rating && (
              <p className="text-xs text-danger-500 mt-1">{errors.rating.message}</p>
            )}
          </div>

          {/* Comments */}
          <div>
            <label htmlFor="competency-comments" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Comments (Optional)
            </label>
            <textarea
              id="competency-comments"
              {...register('comments')}
              rows={3}
              placeholder="Add observations or development notes…"
              className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 resize-none"
            />
          </div>

        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--border-main)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || addMutation.isPending}
            className="px-4 py-2 rounded-lg bg-accent-700 text-white text-sm font-medium hover:bg-accent-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {addMutation.isPending ? 'Adding…' : 'Add Competency'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompetencyFrameworkPage() {
  const cyclesQuery = usePerformanceAllCycles(0, 100);
  const allReviewsQuery = useAllReviews(0, 500);

  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CompetencyCategory | ''>('');
  const [addModalReviewId, setAddModalReviewId] = useState<string | null>(null);

  const cycles = cyclesQuery.data?.content ?? [];
  const allReviews = useMemo(() => allReviewsQuery.data?.content ?? [], [allReviewsQuery.data?.content]);

  // Filter reviews by selected cycle
  const cycleReviews = useMemo(() => {
    if (!selectedCycleId) return [];
    return allReviews.filter(
      (r) => (r.reviewCycleId || r.cycleId) === selectedCycleId
    );
  }, [selectedCycleId, allReviews]);

  // Filter by search
  const filteredReviews = useMemo(() => {
    if (!searchQuery) return cycleReviews;
    const q = searchQuery.toLowerCase();
    return cycleReviews.filter(
      (r) =>
        (r.employeeName ?? '').toLowerCase().includes(q) ||
        (r.department ?? '').toLowerCase().includes(q)
    );
  }, [cycleReviews, searchQuery]);

  // Aggregate competencies across all visible reviews (for summary)
  // We don't fetch all at once — we just count what's visible in expanded panels

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);

  return (
    <AppLayout>
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
        <div className="page-shell-centered fade-slide-up auth-delay-20">
          <div className="max-w-5xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">Competency Framework</h1>
                <p className="text-[var(--text-muted)] mt-1 text-sm">
                  Manage competency ratings for employees within a review cycle
                </p>
              </div>
              <PermissionGate permission={Permissions.REVIEW_CREATE}>
                <button
                  onClick={() =>
                    filteredReviews[0] && setAddModalReviewId(filteredReviews[0].id)
                  }
                  disabled={filteredReviews.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-700 text-white text-sm font-medium hover:bg-accent-800 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Plus size={16}/>
                  Add Competency
                </button>
              </PermissionGate>
            </div>

            {/* Category Legend */}
            <div className="bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-6 py-4">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">
                Categories
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setCategoryFilter(categoryFilter === opt.value ? '' : opt.value)
                    }
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                      categoryFilter === opt.value
                        ? `${CATEGORY_COLORS[opt.value]} ring-2 ring-accent-500`
                        : `${CATEGORY_COLORS[opt.value]} opacity-70 hover:opacity-100`
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cycle Selector + Search */}
            <div className="bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="review-cycle-select" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Review Cycle
                  </label>
                  {cyclesQuery.isLoading ? (
                    <div className="h-10 bg-[var(--bg-secondary)] rounded-lg animate-pulse"/>
                  ) : (
                    <select
                      id="review-cycle-select"
                      aria-label="Cycle"
                      value={selectedCycleId}
                      onChange={(e) => setSelectedCycleId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                    >
                      <option value="">Select a cycle…</option>
                      {cycles.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.status})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedCycleId && (
                  <div className="flex-1">
                    <label htmlFor="competency-search-employee" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Search Employee
                    </label>
                    <Input
                      id="competency-search-employee"
                      type="text"
                      placeholder="Filter by name or department..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      icon={<Search size={14}/>}
                    />
                  </div>
                )}
              </div>

              {selectedCycle && (
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                  <span
                    className={`px-4 py-1 rounded-full text-xs font-semibold ${
                      selectedCycle.status === 'ACTIVE'
                        ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }`}
                  >
                    {selectedCycle.status}
                  </span>
                  <span className="text-caption">
                    {filteredReviews.length} review{filteredReviews.length !== 1 ? 's' : ''} in this cycle
                  </span>
                </div>
              )}
            </div>

            {/* Review List */}
            {!selectedCycleId ? (
              <div className="bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)]">
                <EmptyState
                  icon={<Info className="h-8 w-8"/>}
                  title="Select a review cycle"
                  description="Choose a cycle above to manage competencies for its reviews."
                />
              </div>
            ) : allReviewsQuery.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw size={20} className="animate-spin text-accent-500 mr-4"/>
                <span className="text-[var(--text-muted)]">Loading reviews…</span>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)]">
                <EmptyState
                  icon={<Info className="h-8 w-8"/>}
                  title="No reviews found"
                  description={searchQuery ? 'Try a different search term' : 'No reviews exist for this cycle yet.'}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-caption font-medium uppercase tracking-wide">
                  {filteredReviews.length} Review{filteredReviews.length !== 1 ? 's' : ''}. Click to expand & manage
                  competencies.
                </p>
                {filteredReviews.map((review) => (
                  <ReviewCompetencyPanel
                    key={review.id}
                    reviewId={review.id}
                    employeeName={
                      review.employeeName
                        ? `${review.employeeName} (${review.reviewType ?? 'REVIEW'})`
                        : `Review ${review.id.slice(0, 8)}`
                    }
                    onAddClick={(rid) => setAddModalReviewId(rid)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Competency Modal */}
        <AddCompetencyModal
          reviewId={addModalReviewId}
          isOpen={addModalReviewId !== null}
          onClose={() => setAddModalReviewId(null)}
        />
      </PermissionGate>
    </AppLayout>
  );
}
