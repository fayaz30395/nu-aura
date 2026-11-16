'use client';

import {useMemo, useState} from 'react';
import {ActionIcon, Button} from '@mantine/core';
import {ChevronDown, ChevronRight, Info, Plus, Star, Trash2} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Card} from '@/components/ui/Card';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {QueryState} from '@/components/ui/QueryState';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useDeleteCompetency} from '@/lib/hooks/queries/useReviews';
import {useReviewCompetencies} from '@/lib/hooks/useCompetency';
import type {CompetencyCategory, ReviewCompetency} from '@/lib/types/grow/performance';
import {CATEGORY_COLORS, CATEGORY_OPTIONS} from './competencyFrameworkConfig';

function RatingStars({value}: {value: number}) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={12}
          aria-hidden
          className={star <= value ? 'fill-warning-400 text-warning-400' : 'fill-border text-border'}
        />
      ))}
      <span className="ml-1 text-xs tabular-nums text-text-2">{value.toFixed(1)}</span>
    </span>
  );
}

function CategoryBadge({category}: {category: CompetencyCategory}) {
  const label = CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[category]}`}>
      {label}
    </span>
  );
}

function filterByCategory(items: ReviewCompetency[], categoryFilter: CompetencyCategory | '') {
  return categoryFilter ? items.filter((c) => c.category === categoryFilter) : items;
}

function CompetencyGroups({competencies, onDelete}: {
  competencies: ReviewCompetency[];
  onDelete: (comp: ReviewCompetency) => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<string, ReviewCompetency[]> = {};
    for (const c of competencies) {
      if (!map[c.category]) map[c.category] = [];
      map[c.category].push(c);
    }
    return map;
  }, [competencies]);

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-3">{category}</p>
          {items.map((comp) => (
            <div
              key={comp.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-aura-sunken p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-text-1">{comp.competencyName}</span>
                  <CategoryBadge category={comp.category}/>
                </div>
                {comp.comments && <p className="mt-1 line-clamp-2 text-xs text-text-2">{comp.comments}</p>}
                <div className="mt-2">
                  <RatingStars value={comp.rating}/>
                </div>
              </div>
              <PermissionGate permission={Permissions.REVIEW_DELETE}>
                <ActionIcon variant="subtle" color="red" aria-label="Delete competency" onClick={() => onDelete(comp)}>
                  <Trash2 size={16}/>
                </ActionIcon>
              </PermissionGate>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

interface ReviewCompetencyPanelProps {
  reviewId: string;
  employeeName: string;
  onAddClick: (reviewId: string) => void;
  categoryFilter: CompetencyCategory | '';
}

export function ReviewCompetencyPanel({reviewId, employeeName, onAddClick, categoryFilter}: ReviewCompetencyPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const competenciesQuery = useReviewCompetencies(reviewId, expanded);
  const deleteCompetencyMutation = useDeleteCompetency();
  const [deleteTarget, setDeleteTarget] = useState<ReviewCompetency | null>(null);

  const competencies = useMemo(
    () => filterByCategory(competenciesQuery.data ?? [], categoryFilter),
    [competenciesQuery.data, categoryFilter]
  );

  const avgRating =
    competencies.length > 0
      ? competencies.reduce((sum, c) => sum + c.rating, 0) / competencies.length
      : null;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCompetencyMutation.mutateAsync({id: deleteTarget.id, reviewId});
      setDeleteTarget(null);
    } catch {
      // The mutation's onError toast reports the failure; keep the dialog open.
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-4 bg-surface-aura-sunken pr-4">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="flex min-h-11 flex-1 items-center justify-between gap-4 px-4 py-2 text-left transition-colors hover:bg-surface-aura-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
        >
          <span className="flex min-w-0 items-center gap-4">
            {expanded ? (
              <ChevronDown size={16} className="shrink-0 text-text-3" aria-hidden/>
            ) : (
              <ChevronRight size={16} className="shrink-0 text-text-3" aria-hidden/>
            )}
            <span className="truncate font-medium text-text-1">{employeeName}</span>
            <span className="shrink-0 text-xs text-text-2">
              {competencies.length} competenc{competencies.length !== 1 ? 'ies' : 'y'}
            </span>
          </span>
          {avgRating != null && (
            <span className="shrink-0 text-xs tabular-nums text-text-2">Avg: {avgRating.toFixed(1)}</span>
          )}
        </button>
        <PermissionGate permission={Permissions.REVIEW_CREATE}>
          <Button size="sm" leftSection={<Plus size={14}/>} onClick={() => onAddClick(reviewId)}>
            Add
          </Button>
        </PermissionGate>
      </div>

      {expanded && (
        <div className="px-4 py-4 sm:px-6">
          <QueryState
            query={competenciesQuery}
            skeleton={<ListPageSkeleton showHeader={false} showFilters={false} rows={3} columns={2}/>}
            isEmpty={(data) => filterByCategory(data, categoryFilter).length === 0}
            empty={{
              icon: <Info className="h-full w-full"/>,
              title: 'No competencies added yet',
              actionLabel: 'Refresh',
              onAction: () => competenciesQuery.refetch(),
              size: 'compact',
            }}
            errorTitle="Couldn't load competencies"
          >
            {() => <CompetencyGroups competencies={competencies} onDelete={setDeleteTarget}/>}
          </QueryState>
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
        loading={deleteCompetencyMutation.isPending}
      />
    </Card>
  );
}
