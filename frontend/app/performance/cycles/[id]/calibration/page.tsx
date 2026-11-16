'use client';

import {useState} from 'react';
import {useParams} from 'next/navigation';
import {AppLayout} from '@/components/layout';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '@/lib/api/client';
import {Badge, Button, NumberInput, Progress} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconCheck} from '@tabler/icons-react';
import {Scale} from 'lucide-react';
import type {CalibrationEmployee, CalibrationResponse} from '@/lib/types/grow/performance';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {EmptyState} from '@/components/ui/EmptyState';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {type Column, ResponsiveTable} from '@/components/ui/ResponsiveTable';

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  1: {label: 'Needs Improvement', color: 'red'},
  2: {label: 'Below Expectations', color: 'orange'},
  3: {label: 'Meets Expectations', color: 'yellow'},
  4: {label: 'Exceeds Expectations', color: 'teal'},
  5: {label: 'Outstanding', color: 'green'},
};

async function fetchCalibration(cycleId: string): Promise<CalibrationResponse> {
  const res = await apiClient.get<CalibrationResponse>(`/review-cycles/${cycleId}/calibration`);
  return res.data;
}

async function saveCalibrationRating(reviewId: string, finalRating: number) {
  await apiClient.put(`/review-cycles/reviews/${reviewId}/calibration-rating?finalRating=${finalRating}`);
}

function RatingBadge({rating, variant = 'light'}: {rating?: number; variant?: 'light' | 'filled'}) {
  if (!rating) return <span className="text-sm text-text-2">—</span>;
  return (
    <Badge color={RATING_LABELS[rating]?.color ?? 'gray'} variant={variant} radius="sm"
           title={RATING_LABELS[rating]?.label}>
      {rating}
    </Badge>
  );
}

export default function CalibrationPage() {
  const {id: cycleId} = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [draftRatings, setDraftRatings] = useState<Record<string, number>>({});

  const calibrationQuery = useQuery({
    queryKey: ['calibration', cycleId],
    queryFn: () => fetchCalibration(cycleId),
  });

  const saveMutation = useMutation({
    mutationFn: ({reviewId, rating}: { reviewId: string; rating: number }) =>
      saveCalibrationRating(reviewId, rating),
    onSuccess: (_, {reviewId}) => {
      notifications.show({
        title: 'Saved',
        message: 'Calibration rating updated',
        color: 'green',
        icon: <IconCheck size={16}/>
      });
      setDraftRatings((prev) => {
        const next = {...prev};
        delete next[reviewId];
        return next;
      });
      queryClient.invalidateQueries({queryKey: ['calibration', cycleId]});
    },
    meta: {skipGlobalError: true},
    onError: () => {
      notifications.show({title: 'Error', message: 'Failed to save rating', color: 'red'});
    },
  });

  const data = calibrationQuery.data;
  const totalEmployees = data?.totalEmployees || 0;

  const buildColumns = (employees: CalibrationEmployee[]): Column<CalibrationEmployee>[] => {
    const columns: Column<CalibrationEmployee>[] = [
      {
        key: 'employee',
        header: 'Employee',
        mobilePriority: 'primary',
        accessor: (emp) => <span className="font-medium text-text-1">{emp.employeeName}</span>,
      },
      {key: 'self', header: 'Self Rating', align: 'center', accessor: (emp) => <RatingBadge rating={emp.selfRating}/>},
      {
        key: 'manager',
        header: 'Manager Rating',
        align: 'center',
        accessor: (emp) => <RatingBadge rating={emp.managerRating}/>,
      },
      {
        key: 'final',
        header: 'Final Rating',
        align: 'center',
        accessor: (emp) => {
          const displayRating = draftRatings[emp.reviewId] ?? emp.finalRating;
          return emp.editable ? (
            <NumberInput
              aria-label="Rating (1-5)"
              min={1}
              max={5}
              value={displayRating ?? ''}
              onChange={(val) => setDraftRatings((prev) => ({...prev, [emp.reviewId]: Number(val)}))}
              w={96}
              className="mx-auto"
            />
          ) : (
            <RatingBadge rating={displayRating} variant="filled"/>
          );
        },
      },
    ];
    if (employees.some((e) => e.editable)) {
      columns.push({
        key: 'actions',
        header: 'Actions',
        align: 'center',
        accessor: (emp) => {
          if (!emp.editable) return null;
          const draftVal = draftRatings[emp.reviewId];
          return (
            <PermissionGate permission={Permissions.CALIBRATION_MANAGE}>
              <Button
                disabled={draftVal == null || draftVal === emp.finalRating}
                loading={saveMutation.isPending && saveMutation.variables?.reviewId === emp.reviewId}
                onClick={() => saveMutation.mutate({reviewId: emp.reviewId, rating: draftVal!})}
              >
                Save
              </Button>
            </PermissionGate>
          );
        },
      });
    }
    return columns;
  };

  return (
    <AppLayout
      activeMenuItem="performance"
      breadcrumbs={[
        {label: 'Performance', href: '/performance'},
        {label: 'Cycles', href: '/performance/cycles'},
        {label: 'Calibration'},
      ]}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          title="Calibration"
          description={data ? `${data.cycleName} (${totalEmployees} employees)` : undefined}
        />

        <QueryState
          query={calibrationQuery}
          skeleton={<ListPageSkeleton showHeader={false} showFilters={false} rows={6} columns={5}/>}
          errorTitle="Failed to load calibration data"
        >
          {(calibration) => (
            <>
              <section aria-label="Rating distribution" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {[1, 2, 3, 4, 5].map((rating) => {
                  const count = calibration.distribution[rating] ?? 0;
                  const pct = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0;
                  const meta = RATING_LABELS[rating];
                  return (
                    <div key={rating} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <Badge color={meta.color} variant="light" radius="sm" size="sm">{rating}</Badge>
                        <span className="text-lg font-semibold tabular-nums text-text-1">{count}</span>
                      </div>
                      <span className="text-xs text-text-2">{meta.label}</span>
                      <Progress value={pct} color={meta.color} size="xs" aria-label={`${meta.label}: ${pct}%`}/>
                      <span className="text-right text-xs tabular-nums text-text-2">{pct}%</span>
                    </div>
                  );
                })}
              </section>

              <ResponsiveTable
                columns={buildColumns(calibration.employees)}
                data={calibration.employees}
                keyExtractor={(emp) => emp.reviewId}
                emptyState={
                  <EmptyState
                    icon={<Scale className="h-full w-full"/>}
                    title="No reviews found"
                    description="Activate the cycle to generate reviews for employees."
                  />
                }
              />
            </>
          )}
        </QueryState>
      </div>
    </AppLayout>
  );
}
