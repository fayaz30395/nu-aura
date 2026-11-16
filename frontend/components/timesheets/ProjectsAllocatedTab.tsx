'use client';

import React from 'react';
import {Card, CardContent, EmptyState} from '@/components/ui';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {Badge} from '@/components/ui/Badge';
import {useEmployeeProjects} from '@/lib/hooks/queries/useProjects';
import type {ProjectEmployee} from '@/lib/types/hrms/project';
import {formatDateShort} from '@/lib/utils/format/date';

export function ProjectsAllocatedTab({employeeId}: {employeeId: string}) {
  const query = useEmployeeProjects(employeeId);

  const columns: Column<ProjectEmployee>[] = [
    {key: 'project', header: 'Project', accessor: (r) => r.projectName ?? 'Unknown project', mobilePriority: 'primary'},
    {key: 'role', header: 'Role', accessor: (r) => r.role ?? '-'},
    {key: 'alloc', header: 'Allocation', numeric: true, accessor: (r) => `${r.allocationPercentage}%`},
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
          keyExtractor={(r) => r.id}
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
