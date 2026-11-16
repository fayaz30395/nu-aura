'use client';
import {AppLayout} from '@/components/layout';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';

import {useParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {apiClient} from '@/lib/api/client';
import {Badge, Tooltip} from '@mantine/core';
import {Grid3x3} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {CalibrationEmployee, CalibrationResponse} from '@/lib/types/grow/performance';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {Bone, SkeletonRegion} from '@/components/ui/skeletons/SkeletonRegion';

// 9-box maps (performance axis = finalRating 1-5 → buckets Low/Med/High)
// potential axis = managerRating 1-5 → buckets Low/Med/High
const toBucket = (rating?: number): 'low' | 'med' | 'high' => {
  if (!rating) return 'low';
  if (rating <= 2) return 'low';
  if (rating === 3) return 'med';
  return 'high';
};

const BOX_LABELS: Record<string, string> = {
  'low-low': 'Underperformer',
  'low-med': 'Inconsistent Player',
  'low-high': 'Enigma',
  'med-low': 'Core Player',
  'med-med': 'Core Player',
  'med-high': 'High Potential',
  'high-low': 'Solid Performer',
  'high-med': 'High Performer',
  'high-high': 'Star',
};

const BOX_COLORS: Record<string, string> = {
  'low-low': 'bg-status-err-bg',
  'low-med': 'bg-status-warn-bg',
  'low-high': 'bg-status-warn-bg',
  'med-low': 'bg-status-warn-bg',
  'med-med': 'bg-status-ok-bg',
  'med-high': 'bg-status-ok-bd',
  'high-low': 'bg-status-ok-bg',
  'high-med': 'bg-status-ok-fg',
  'high-high': 'bg-status-ok-fg',
};

const STRONG_BOXES = new Set(['high-med', 'high-high']);

const POT_ROWS: Array<'high' | 'med' | 'low'> = ['high', 'med', 'low'];
const PERF_COLS: Array<'low' | 'med' | 'high'> = ['low', 'med', 'high'];
const BUCKET_LABEL = {low: 'Low', med: 'Medium', high: 'High'} as const;

async function fetchCalibration(cycleId: string): Promise<CalibrationResponse> {
  const res = await apiClient.get<CalibrationResponse>(`/review-cycles/${cycleId}/calibration`);
  return res.data;
}

function groupIntoBoxes(employees: CalibrationEmployee[]) {
  // Group employees into 9 boxes by (performance=finalRating, potential=managerRating)
  const boxes: Record<string, CalibrationEmployee[]> = {};
  for (const perf of PERF_COLS) {
    for (const pot of POT_ROWS) {
      boxes[`${perf}-${pot}`] = [];
    }
  }
  employees.forEach((emp) => {
    boxes[`${toBucket(emp.finalRating)}-${toBucket(emp.managerRating)}`].push(emp);
  });
  return boxes;
}

function NineBoxSkeleton() {
  return (
    <SkeletonRegion label="Loading 9-box grid">
      <div className="grid max-w-3xl grid-cols-3 gap-1">
        {Array.from({length: 9}).map((_, i) => <Bone key={i} height={112} radius="md"/>)}
      </div>
    </SkeletonRegion>
  );
}

function NineBoxGrid({employees}: {employees: CalibrationEmployee[]}) {
  const boxes = groupIntoBoxes(employees);
  return (
    <div className="flex max-w-3xl gap-2">
      <div className="flex w-4 shrink-0 items-center justify-center">
        <span className="rotate-180 whitespace-nowrap text-xs text-text-2 [writing-mode:vertical-rl]">
          Potential (Manager Rating) →
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex gap-1">
          <span className="w-14 shrink-0" aria-hidden="true"/>
          {PERF_COLS.map((perf) => (
            <span key={perf} className="flex-1 text-center text-xs text-text-2">
              {BUCKET_LABEL[perf]} Performance
            </span>
          ))}
        </div>

        {POT_ROWS.map((pot) => (
          <div key={pot} className="flex items-stretch gap-1">
            <span className="flex w-14 shrink-0 items-center justify-end pr-2 text-xs text-text-2">
              {BUCKET_LABEL[pot]}
            </span>
            {PERF_COLS.map((perf) => {
              const key = `${perf}-${pot}`;
              const boxEmployees = boxes[key] ?? [];
              return (
                <div
                  key={key}
                  className={cn('flex h-28 min-w-0 flex-1 flex-col gap-1 overflow-hidden rounded-md border border-border p-2', BOX_COLORS[key])}
                >
                  <span className={cn('truncate text-xs font-semibold',
                    STRONG_BOXES.has(key) ? 'text-white dark:text-surface-900' : 'text-text-1')}>
                    {BOX_LABELS[key]} ({boxEmployees.length})
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    {boxEmployees.slice(0, 4).map((emp) => (
                      <Tooltip key={emp.employeeId}
                               label={`Self: ${emp.selfRating ?? '?'} | Mgr: ${emp.managerRating ?? '?'} | Final: ${emp.finalRating ?? '?'}`}
                               withArrow>
                        <Badge variant="white" size="xs" radius="sm" className="max-w-full cursor-default">
                          {emp.employeeName}
                        </Badge>
                      </Tooltip>
                    ))}
                    {boxEmployees.length > 4 && (
                      <span className="text-xs text-text-2">+{boxEmployees.length - 4} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div className="flex gap-1">
          <span className="w-14 shrink-0" aria-hidden="true"/>
          <span className="flex-1 text-center text-xs text-text-2">Performance (Final Rating) →</span>
        </div>
      </div>
    </div>
  );
}

export default function NineBoxPage() {
  const {id: cycleId} = useParams<{ id: string }>();

  const calibrationQuery = useQuery({
    queryKey: ['calibration', cycleId],
    queryFn: () => fetchCalibration(cycleId),
  });

  return (
    <AppLayout
      activeMenuItem="performance"
      breadcrumbs={[
        {label: 'Performance', href: '/performance'},
        {label: 'Cycles', href: '/performance/cycles'},
        {label: '9-Box Grid'},
      ]}
    >
      <PermissionGate permission={Permissions.CALIBRATION_VIEW}>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <PageHeader
            title="9-Box Grid"
            description={calibrationQuery.data ? `${calibrationQuery.data.cycleName}: Performance vs Potential` : undefined}
          />

          <QueryState
            query={calibrationQuery}
            skeleton={<NineBoxSkeleton/>}
            isEmpty={(data) => !data?.employees?.length}
            empty={{
              icon: <Grid3x3 className="h-full w-full"/>,
              title: 'No reviews to plot',
              description: 'Employees appear here once their reviews have ratings.',
            }}
            errorTitle="Failed to load 9-box data"
          >
            {(data) => <NineBoxGrid employees={data.employees}/>}
          </QueryState>

          <section aria-label="Legend" className="grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(BOX_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <span className={cn('h-3 w-3 shrink-0 rounded-sm border border-border', BOX_COLORS[key])} aria-hidden="true"/>
                <span className="text-xs text-text-1">{label}</span>
              </div>
            ))}
          </section>
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
