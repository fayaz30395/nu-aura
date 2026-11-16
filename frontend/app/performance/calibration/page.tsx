'use client';

import {useEffect, useMemo, useState} from 'react';
import {Card} from '@/components/ui/Card';
import {Badge, Button, NativeSelect, TextInput} from '@mantine/core';
import {Download, Info, Search, ShieldAlert, TrendingUp} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {EmptyState} from '@/components/ui/EmptyState';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {DashboardSkeleton, ListPageSkeleton} from '@/components/ui/skeletons';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useAllReviews} from '@/lib/hooks/queries/useReviews';
import {usePerformanceAllCycles} from '@/lib/hooks/queries/useReviewCycles';
import {
  buildEmployeeRows,
  countRatings,
  downloadCalibrationCsv,
  filterAndSortRows,
  getBellCurveWarning,
  type SortField,
  type SortOrder,
} from './_components/calibrationModel';
import {CalibrationSummary} from './_components/CalibrationSummary';
import {CalibrationTable} from './_components/CalibrationTable';
import {useCalibrationActions} from './_hooks/useCalibrationActions';

const CYCLE_BADGE_COLOR: Record<string, string> = {ACTIVE: 'green', CALIBRATION: 'aura'};

export default function CalibrationPage() {
  const cyclesQuery = usePerformanceAllCycles(0, 100);
  const allReviewsQuery = useAllReviews(0, 500);

  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [finalOverrides, setFinalOverrides] = useState<Record<string, number>>({});
  const [publishConfirm, setPublishConfirm] = useState(false);

  const cycles = useMemo(() => cyclesQuery.data?.content ?? [], [cyclesQuery.data]);

  useEffect(() => {
    if (selectedCycleId || cycles.length === 0) return;
    const active = cycles.find((c) => c.status === 'ACTIVE' || c.status === 'CALIBRATION');
    setSelectedCycleId((active ?? cycles[0]).id);
  }, [selectedCycleId, cycles]);

  const reviews = useMemo(() => {
    if (!selectedCycleId || !allReviewsQuery.data?.content) return [];
    return allReviewsQuery.data.content.filter((r) => (r.reviewCycleId || r.cycleId) === selectedCycleId);
  }, [selectedCycleId, allReviewsQuery.data]);

  const rows = useMemo(() => buildEmployeeRows(reviews), [reviews]);
  const visibleRows = useMemo(
    () => filterAndSortRows(rows, {
      search: searchQuery,
      department: departmentFilter,
      sortField,
      sortOrder,
      overrides: finalOverrides,
    }),
    [rows, searchQuery, departmentFilter, sortField, sortOrder, finalOverrides],
  );
  const ratingCounts = useMemo(() => countRatings(visibleRows, finalOverrides), [visibleRows, finalOverrides]);
  const totalRated = Object.values(ratingCounts).reduce((s, v) => s + v, 0);
  const departments = useMemo(
    () => Array.from(new Set(rows.map((r) => r.department).filter((d): d is string => !!d))),
    [rows],
  );

  const {saveFinalRating, publishRatings, savingEmployeeId, publishing} = useCalibrationActions({
    reviews,
    overrides: finalOverrides,
    refetchReviews: allReviewsQuery.refetch,
  });

  const handleRatingChange = (employeeId: string, value: number | string) => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num) || num < 1 || num > 5) return;
    setFinalOverrides((prev) => ({...prev, [employeeId]: Math.round(num * 10) / 10}));
  };

  const handleSort = (field: SortField) => {
    setSortOrder(sortOrder === 'asc' && sortField === field ? 'desc' : 'asc');
    setSortField(field);
  };

  const selectedCycle = cycles.find((c) => c.id === selectedCycleId);

  return (
    <AppLayout
      breadcrumbs={[{label: 'Performance', href: '/performance'}, {label: 'Calibration'}]}
    >
      <PermissionGate
        permission={Permissions.CALIBRATION_MANAGE}
        fallback={
          <EmptyState
            icon={<ShieldAlert className="h-8 w-8"/>}
            title="Access Denied"
            description="You do not have permission to view calibration data."
          />
        }
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6">
          <PageHeader
            title="Calibration & Distribution"
            description="Review and finalize employee performance ratings"
            actions={
              <>
                <Button
                  variant="default"
                  leftSection={<Download className="h-4 w-4"/>}
                  onClick={() => downloadCalibrationCsv(visibleRows, finalOverrides, selectedCycleId)}
                  disabled={visibleRows.length === 0}
                >
                  Export
                </Button>
                <Button
                  leftSection={<TrendingUp className="h-4 w-4"/>}
                  onClick={() => setPublishConfirm(true)}
                  loading={publishing}
                  disabled={!selectedCycleId}
                >
                  Publish
                </Button>
              </>
            }
          />

          <QueryState
            query={cyclesQuery}
            skeleton={<DashboardSkeleton showHeader={false} stats={3}/>}
            isEmpty={(data) => !data.content?.length}
            empty={{
              icon: <Info className="h-8 w-8"/>,
              title: 'No review cycles',
              description: 'Create a review cycle to start calibrating ratings.',
            }}
            errorTitle="Couldn't load review cycles"
          >
            {() => (
              <>
                <Card as="section" className="flex flex-col gap-4 p-4 md:flex-row md:items-end">
                  <NativeSelect
                    id="calibration-cycle"
                    label="Review Cycle"
                    value={selectedCycleId}
                    onChange={(e) => setSelectedCycleId(e.currentTarget.value)}
                    data={[
                      {value: '', label: 'Select a cycle'},
                      ...cycles.map((c) => ({value: c.id, label: `${c.name} (${c.status})`})),
                    ]}
                    className="flex-1"
                  />
                  {selectedCycle && (
                    <Badge size="lg" variant="light" color={CYCLE_BADGE_COLOR[selectedCycle.status] ?? 'gray'}>
                      {selectedCycle.status}
                    </Badge>
                  )}
                </Card>

                {!selectedCycleId ? (
                  <EmptyState
                    icon={<Info className="h-8 w-8"/>}
                    title="No review cycle selected"
                    description="Select a review cycle to see the calibration view"
                  />
                ) : (
                  <QueryState
                    query={allReviewsQuery}
                    skeleton={<ListPageSkeleton showHeader={false} showFilters={false} columns={6}/>}
                    errorTitle="Couldn't load reviews"
                  >
                    {() => (
                      <>
                        <CalibrationSummary
                          counts={ratingCounts}
                          totalRated={totalRated}
                          totalEmployees={visibleRows.length}
                          warning={getBellCurveWarning(ratingCounts, totalRated)}
                        />
                        <div className="flex flex-col gap-4 md:flex-row">
                          <TextInput
                            aria-label="Search employee..."
                            placeholder="Search employee..."
                            leftSection={<Search className="h-4 w-4" aria-hidden/>}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.currentTarget.value)}
                            className="flex-1"
                          />
                          {departments.length > 0 && (
                            <NativeSelect
                              aria-label="Filter by department"
                              value={departmentFilter}
                              onChange={(e) => setDepartmentFilter(e.currentTarget.value)}
                              data={[{value: '', label: 'All Departments'}, ...departments]}
                              className="md:w-56"
                            />
                          )}
                        </div>
                        <CalibrationTable
                          rows={visibleRows}
                          overrides={finalOverrides}
                          sortField={sortField}
                          sortOrder={sortOrder}
                          savingEmployeeId={savingEmployeeId}
                          onSort={handleSort}
                          onRatingChange={handleRatingChange}
                          onSave={saveFinalRating}
                        />
                      </>
                    )}
                  </QueryState>
                )}
              </>
            )}
          </QueryState>
        </div>

        <ConfirmDialog
          isOpen={publishConfirm}
          onClose={() => setPublishConfirm(false)}
          onConfirm={async () => {
            await publishRatings(visibleRows);
            setPublishConfirm(false);
          }}
          title="Publish Ratings"
          message="Publish calibrated ratings? This will notify all employees of their final performance ratings."
          confirmText="Publish"
          type="warning"
          loading={publishing}
        />
      </PermissionGate>
    </AppLayout>
  );
}
