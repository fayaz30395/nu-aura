'use client';

import {useMemo, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {Button, Tabs, TextInput} from '@mantine/core';
import {Calendar, CheckCircle2, FileText, Plus, Search, TrendingUp} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {EmptyState} from '@/components/ui/EmptyState';
import {StatCard} from '@/components/ui/StatCard';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import type {PIPResponse} from '@/lib/types/grow/performance';
import {usePipsQuery} from './_hooks/usePips';
import {averageDurationDays, PIP_TABS, type PIPFilter, type PIPTab, TAB_STATUS} from './_components/pipConfig';
import {PIPCard} from './_components/PIPCard';
import {CreatePIPModal} from './_components/CreatePIPModal';
import {PIPDetailModal} from './_components/PIPDetailModal';

export default function PIPPage() {
  const queryClient = useQueryClient();
  const {hasPermission} = usePermissions();
  const [activeTab, setActiveTab] = useState<PIPTab>('ACTIVE');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPIP, setSelectedPIP] = useState<PIPResponse | null>(null);
  const [search, setSearch] = useState('');

  const filters: PIPFilter = useMemo(() => ({status: TAB_STATUS[activeTab], search}), [activeTab, search]);
  const pipsQuery = usePipsQuery(filters);

  const handleCreateSuccess = () => {
    setCreateOpen(false);
    queryClient.invalidateQueries({queryKey: ['pips']});
  };

  const handlePIPUpdated = () => {
    queryClient.invalidateQueries({queryKey: ['pips']});
    setSelectedPIP(null);
  };

  const pipList = useMemo(() => (Array.isArray(pipsQuery.data) ? pipsQuery.data : []), [pipsQuery.data]);
  const stats = useMemo(() => ({
    active: pipList.filter(p => p.status === 'ACTIVE').length,
    completed: pipList.filter(p => p.status === 'COMPLETED').length,
    avgDuration: averageDurationDays(pipList),
  }), [pipList]);

  return (
    <AppLayout
      breadcrumbs={[{label: 'Performance', href: '/performance'}, {label: 'Performance Improvement Plans'}]}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          title="Performance Improvement Plans"
          description="Manage and track employee PIPs"
          actions={
            <PermissionGate permission={Permissions.PIP_CREATE}>
              <Button leftSection={<Plus className="h-4 w-4" aria-hidden/>} onClick={() => setCreateOpen(true)}>
                Create PIP
              </Button>
            </PermissionGate>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard size="compact" variant="primary" title="Active PIPs" value={stats.active}
                    icon={<TrendingUp className="h-5 w-5" aria-hidden/>}/>
          <StatCard size="compact" variant="success" title="Completed" value={stats.completed}
                    icon={<CheckCircle2 className="h-5 w-5" aria-hidden/>}/>
          <StatCard size="compact" title="Avg Duration" value={`${stats.avgDuration} days`}
                    icon={<Calendar className="h-5 w-5" aria-hidden/>}/>
        </div>

        <div className="flex flex-col gap-4">
          <Tabs value={activeTab} onChange={(value) => value && setActiveTab(value as PIPTab)}>
            <Tabs.List>
              {PIP_TABS.map(tab => <Tabs.Tab key={tab.value} value={tab.value}>{tab.label}</Tabs.Tab>)}
            </Tabs.List>
          </Tabs>
          <TextInput
            className="w-full md:max-w-md"
            aria-label="Search by employee name..."
            placeholder="Search by employee name..."
            leftSection={<Search className="h-4 w-4" aria-hidden/>}
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
          />
        </div>

        <QueryState
          query={pipsQuery}
          skeleton={<ListPageSkeleton showHeader={false} showFilters={false} rows={4} columns={3}/>}
          errorTitle="Failed to load PIPs"
          errorMessage="Please try again later"
        >
          {() => pipList.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-full w-full"/>}
              title="No PIPs found"
              description={search ? 'No PIPs match your search.' : 'Create your first PIP to get started'}
              {...(search
                ? {actionLabel: 'Clear search', onAction: () => setSearch('')}
                : hasPermission(Permissions.PIP_CREATE) ? {actionLabel: 'Create your first PIP', onAction: () => setCreateOpen(true)} : {})}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pipList.map(pip => <PIPCard key={pip.id} pip={pip} onView={() => setSelectedPIP(pip)}/>)}
            </div>
          )}
        </QueryState>
      </div>

      <CreatePIPModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={handleCreateSuccess}/>
      <PIPDetailModal
        pip={selectedPIP}
        open={!!selectedPIP}
        onClose={() => setSelectedPIP(null)}
        onUpdated={handlePIPUpdated}
      />
    </AppLayout>
  );
}
