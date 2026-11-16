'use client';

import React from 'react';
import {Card, CardContent, EmptyState} from '@/components/ui';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {Badge} from '@/components/ui/Badge';
import {useMyPsaAllocations} from '@/lib/hooks/queries/usePsa';
import type {MyProjectAllocation} from '@/lib/services/hrms/psa.service';
import {formatDateShort} from '@/lib/utils/format/date';

export function ProjectsAllocatedTab() {
  const query = useMyPsaAllocations();

  const columns: Column<MyProjectAllocation>[] = [
    {key: 'project', header: 'Project', accessor: (r) => r.projectName ?? 'Unknown project', mobilePriority: 'primary'},
    {key: 'role', header: 'Role', accessor: (r) => r.roleName ?? '-'},
    {key: 'alloc', header: 'Allocation', numeric: true, accessor: (r) => `${r.allocationPercentage ?? 0}%`},
    {key: 'start', header: 'Start', accessor: (r) => formatDateShort(r.startDate)},
    {key: 'end', header: 'End', accessor: (r) => (r.endDate ? formatDateShort(r.endDate) : 'Ongoing')},
    {key: 'active', header: 'Status', accessor: (r) => <Badge variant={r.isActive ? 'success' : 'secondary'}>{r.isActive ? 'Active' : 'Ended'}</Badge>},
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <ResponsiveTable
          columns={columns}
          data={query.data ?? []}
          keyExtractor={(r) => r.projectId}
          isLoading={query.isPending}
          error={query.isError}
          onRetry={() => void query.refetch()}
          emptyState={<EmptyState title="No project allocations" description="Projects you are allocated to will appear here."/>}
          density="compact"
        />
      </CardContent>
    </Card>
  );
}
