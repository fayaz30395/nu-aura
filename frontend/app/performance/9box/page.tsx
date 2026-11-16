'use client';

import {useEffect, useMemo, useState} from 'react';
import {Card} from '@/components/ui/Card';
import {Button, NativeSelect} from '@mantine/core';
import {Download, Grid3x3, Info, Shield} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Callout} from '@/components/ui/Callout';
import {EmptyState} from '@/components/ui/EmptyState';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {ListPageSkeleton, SkeletonRegion} from '@/components/ui/skeletons';
import {Bone} from '@/components/ui/skeletons/SkeletonRegion';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useAllReviews} from '@/lib/hooks/queries/useReviews';
import {usePerformanceAllCycles} from '@/lib/hooks/queries/useReviewCycles';
import {
  buildPoints,
  computeStats,
  downloadNineBoxCsv,
  filterAndSortPoints,
  groupByBox,
  type SortField,
} from './_components/nineBoxModel';
import {NineBoxGrid} from './_components/NineBoxGrid';
import {NineBoxStats} from './_components/NineBoxStats';
import {AllEmployeesTable, SelectedBoxPanel} from './_components/NineBoxTables';

export default function NineBoxPage() {
  const cyclesQuery = usePerformanceAllCycles(0, 100);
  const allReviewsQuery = useAllReviews(0, 500);

  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [potentialOverrides, setPotentialOverrides] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');

  const cycles = useMemo(() => cyclesQuery.data?.content ?? [], [cyclesQuery.data]);

  useEffect(() => {
    if (selectedCycleId || cycles.length === 0) return;
    const active = cycles.find(c => c.status === 'ACTIVE' || c.status === 'CALIBRATION');
    setSelectedCycleId((active ?? cycles[0]).id);
  }, [selectedCycleId, cycles]);

  const reviews = useMemo(() => {
    if (!selectedCycleId || !allReviewsQuery.data?.content) return [];
    return allReviewsQuery.data.content.filter(r => (r.reviewCycleId || r.cycleId) === selectedCycleId);
  }, [selectedCycleId, allReviewsQuery.data]);

  const points = useMemo(() => buildPoints(reviews, potentialOverrides), [reviews, potentialOverrides]);
  const filteredAndSorted = useMemo(
    () => filterAndSortPoints(points, searchQuery, sortField),
    [points, searchQuery, sortField],
  );
  const byBox = useMemo(() => groupByBox(points), [points]);
  const stats = useMemo(() => computeStats(points), [points]);
  const selectedBoxPoints = selectedBox ? (byBox[selectedBox] || []) : null;

  const handlePotentialChange = (employeeId: string, value: number | string) => {
    const v = typeof value === 'number' ? value : parseFloat(value);
    if (!isNaN(v) && v >= 1 && v <= 5) {
      setPotentialOverrides(prev => ({...prev, [employeeId]: v}));
    }
  };

  return (
    <AppLayout
      breadcrumbs={[{label: 'Performance', href: '/performance'}, {label: '9-Box Talent Grid'}]}
    >
      <PermissionGate permission={Permissions.REVIEW_VIEW} fallback={
        <EmptyState
          icon={<Shield className="h-8 w-8"/>}
          title="Access Denied"
          description="You do not have permission to view the 9-Box talent grid."
        />
      }>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <PageHeader
            title="9-Box Talent Grid"
            description="Segment talent by performance and potential"
            actions={
              <Button
                variant="default"
                leftSection={<Download className="h-4 w-4" aria-hidden/>}
                onClick={() => downloadNineBoxCsv(points, selectedCycleId)}
                disabled={points.length === 0}
              >
                Export CSV
              </Button>
            }
          />

          <Card as="section" className="flex flex-col gap-4 p-4 md:flex-row md:items-end">
            <QueryState
              query={cyclesQuery}
              skeleton={<SkeletonRegion label="Loading review cycles" className="flex-1"><Bone height={36} radius="md"/></SkeletonRegion>}
              errorTitle="Couldn't load review cycles"
            >
              {() => (
                <NativeSelect
                  id="ninebox-review-cycle"
                  label="Review Cycle"
                  value={selectedCycleId}
                  onChange={e => setSelectedCycleId(e.currentTarget.value)}
                  data={[
                    {value: '', label: 'Select a cycle'},
                    ...cycles.map(c => ({value: c.id, label: `${c.name} (${c.status})`})),
                  ]}
                  className="flex-1"
                />
              )}
            </QueryState>
            <span className="shrink-0 text-xs text-text-2 md:pb-2">{points.length} employees plotted</span>
          </Card>

          <Callout tone="info" icon={<Info className="h-4 w-4"/>}>
            <strong>X-axis:</strong> Performance = manager review rating.
            <strong className="ml-4">Y-axis:</strong> Potential = derived from self vs manager gap. Click cells to
            view employees and override potential scores.
          </Callout>

          <NineBoxStats
            total={points.length}
            stars={stats.stars}
            highPerformers={stats.highPerformers}
            highPotential={stats.highPotential}
          />

          {selectedCycleId ? (
            <QueryState
              query={allReviewsQuery}
              skeleton={<ListPageSkeleton showHeader={false} showFilters={false} columns={3} rows={3}/>}
              errorTitle="Couldn't load reviews"
            >
              {() => points.length === 0 ? (
                <EmptyState
                  icon={<Grid3x3 className="h-8 w-8"/>}
                  title="No rated reviews found"
                  description="Complete reviews with overall ratings to populate the 9-Box grid."
                />
              ) : (
                <div className="flex flex-col gap-6">
                  <NineBoxGrid byBox={byBox} selectedBox={selectedBox} onSelectBox={setSelectedBox}/>
                  {selectedBox && selectedBoxPoints && (
                    <SelectedBoxPanel
                      boxKey={selectedBox}
                      points={selectedBoxPoints}
                      overrides={potentialOverrides}
                      onPotentialChange={handlePotentialChange}
                    />
                  )}
                  <AllEmployeesTable
                    points={filteredAndSorted}
                    overrides={potentialOverrides}
                    searchQuery={searchQuery}
                    sortField={sortField}
                    onSearchChange={setSearchQuery}
                    onSort={setSortField}
                    onPotentialChange={handlePotentialChange}
                  />
                </div>
              )}
            </QueryState>
          ) : null}
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
