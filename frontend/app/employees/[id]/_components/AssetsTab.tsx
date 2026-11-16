'use client';

import {useMemo} from 'react';
import {SegmentedControl, Skeleton} from '@mantine/core';
import {AlertTriangle, Laptop, Package} from 'lucide-react';
import {EmptyState} from '@/components/ui/EmptyState';
import {QueryState} from '@/components/ui/QueryState';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {useAssetsByEmployee} from '@/lib/hooks/queries/useAssets';
import {ASSET_STATUS} from '@/lib/status/vocabulary';
import type {Asset} from '@/lib/types/hrms/asset';
import {ASSET_SUB_TABS, type AssetSubTab} from '../_hooks/useEmployeeTabs';
import {formatDate, formatEnumValue, SectionCard} from './DetailPrimitives';

const ASSETS_SKELETON = (
  <div className="space-y-2" aria-hidden="true">
    {[1, 2, 3].map((i) => <Skeleton key={i} height={40} radius="sm"/>)}
  </div>
);

function AssignedAssets({employeeId}: {employeeId: string}) {
  const assetsQuery = useAssetsByEmployee(employeeId);

  const columns = useMemo<Column<Asset>[]>(() => [
    {
      key: 'name',
      header: 'Asset Name',
      mobilePriority: 'primary',
      accessor: (a) => (
        <div className="flex items-center gap-2">
          <Laptop className="h-4 w-4 shrink-0 text-text-3" aria-hidden="true"/>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-1">{a.assetName}</p>
            <p className="truncate text-xs text-text-3">{a.assetCode}</p>
          </div>
        </div>
      ),
    },
    {key: 'category', header: 'Category', mobilePriority: 'secondary', accessor: (a) => formatEnumValue(a.category)},
    {key: 'serial', header: 'Serial Number', accessor: (a) => a.serialNumber || '-'},
    {
      key: 'status',
      header: 'Status',
      mobilePriority: 'secondary',
      accessor: (a) => <StatusBadge status={a.status} domain={ASSET_STATUS} compact/>,
    },
    {
      key: 'purchaseDate',
      header: 'Purchase Date',
      accessor: (a) => <span className="whitespace-nowrap tabular-nums">{formatDate(a.purchaseDate)}</span>,
    },
    {key: 'location', header: 'Location', accessor: (a) => a.location || '-'},
  ], []);

  return (
    <QueryState
      query={assetsQuery}
      skeleton={ASSETS_SKELETON}
      isEmpty={(assets) => assets.length === 0}
      empty={{
        icon: <Package className="h-full w-full"/>,
        title: 'No Assets Assigned',
        description: 'No assets are currently assigned to this employee.',
      }}
      errorTitle="Couldn't load assets"
      errorMessage="Failed to load assigned assets. Please try again."
    >
      {(assets) => (
        <ResponsiveTable data={assets} columns={columns} keyExtractor={(a) => a.id} stickyHeader/>
      )}
    </QueryState>
  );
}

export function AssetsTab({
  employeeId,
  firstName,
  subTab,
  onSubTabChange,
}: {
  employeeId: string;
  firstName: string;
  subTab: AssetSubTab;
  onSubTabChange: (sub: AssetSubTab) => void;
}) {
  const title = ASSET_SUB_TABS.find((t) => t.key === subTab)?.label ?? 'Assets';

  return (
    <div className="space-y-4">
      <SegmentedControl
        size="xs"
        value={subTab}
        onChange={(v) => onSubTabChange(v as AssetSubTab)}
        data={ASSET_SUB_TABS.map((t) => ({value: t.key, label: t.label}))}
        aria-label="Asset sections"
      />
      <SectionCard title={title}>
        {subTab === 'assigned' && <AssignedAssets employeeId={employeeId}/>}
        {subTab === 'requests' && (
          <EmptyState
            icon={<Package className="h-full w-full"/>}
            title="Asset Requests"
            description={`Asset requests made by ${firstName} will appear here.`}
          />
        )}
        {subTab === 'damages' && (
          <EmptyState
            icon={<AlertTriangle className="h-full w-full"/>}
            title="Asset Damage Charges"
            description={`Any damage charges for assets assigned to ${firstName} will appear here.`}
          />
        )}
      </SectionCard>
    </div>
  );
}
