'use client';

import React from 'react';
import {Calendar, Laptop, MapPin, Package} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {EmptyState} from '@/components/ui/EmptyState';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {useAuth} from '@/lib/hooks/useAuth';
import {useAssetsByEmployee} from '@/lib/hooks/queries/useAssets';
import {formatDate} from '@/lib/utils/format/date';

const BREADCRUMBS = [{label: 'My Space', href: '/me/dashboard'}, {label: 'My Assets'}];

export default function MyAssetsPage() {
  const {user, hasHydrated} = useAuth();
  const employeeId = user?.employeeId ?? '';
  const assetsQuery = useAssetsByEmployee(employeeId);
  const skeleton = <ListPageSkeleton rows={4} columns={3} showHeader={false} showFilters={false}/>;

  return (
    <AppLayout activeMenuItem="my-assets">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="My Assets"
          description="View company assets currently assigned to you."
          breadcrumbs={BREADCRUMBS}
        />

        {!hasHydrated || (!user && assetsQuery.fetchStatus !== 'idle') ? (
          skeleton
        ) : !employeeId ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <EmptyState
              icon={<Package className="h-8 w-8" aria-hidden="true"/>}
              title="No employee profile linked"
              description="Asset self-service will appear here once your account is linked to an employee profile."
            />
          </div>
        ) : (
          <QueryState
            query={assetsQuery}
            skeleton={skeleton}
            errorTitle="Couldn't load assets"
            errorMessage="Something went wrong while loading your assets. Please try again."
            isEmpty={(assets) => assets.length === 0}
            empty={{
              icon: <Package className="h-8 w-8" aria-hidden="true"/>,
              title: 'No assets assigned',
              description: 'Assigned laptops, devices, access cards, and other company assets will appear here.',
            }}
          >
            {(assets) => (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {assets.map((asset) => (
                  <article key={asset.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
                          <Laptop className="h-4 w-4" aria-hidden="true"/>
                        </div>
                        <div className="min-w-0">
                          <h2 className="truncate text-sm font-semibold text-text-1">{asset.assetName}</h2>
                          <p className="truncate text-xs text-text-2">{asset.assetCode}</p>
                        </div>
                      </div>
                      <StatusBadge status={asset.status}/>
                    </div>

                    <dl className="mt-4 flex flex-col gap-2 text-sm text-text-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" aria-hidden="true"/>
                        <dt className="sr-only">Category</dt>
                        <dd>{asset.category.replace(/_/g, ' ')}</dd>
                      </div>
                      {asset.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" aria-hidden="true"/>
                          <dt className="sr-only">Location</dt>
                          <dd>{asset.location}</dd>
                        </div>
                      )}
                      {asset.purchaseDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" aria-hidden="true"/>
                          <dt className="sr-only">Purchase date</dt>
                          <dd>Purchased {formatDate(asset.purchaseDate)}</dd>
                        </div>
                      )}
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </QueryState>
        )}
      </div>
    </AppLayout>
  );
}
