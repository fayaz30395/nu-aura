'use client';

import React from 'react';
import {Calendar, Laptop, MapPin, Package} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {EmptyState} from '@/components/ui/EmptyState';
import {SkeletonTable} from '@/components/ui/Skeleton';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {useAuth} from '@/lib/hooks/useAuth';
import {useAssetsByEmployee} from '@/lib/hooks/queries/useAssets';
import {formatDate} from '@/lib/utils/format/date';

export default function MyAssetsPage() {
  const {user, hasHydrated} = useAuth();
  const employeeId = user?.employeeId ?? '';
  const assetsQuery = useAssetsByEmployee(employeeId);
  const assets = assetsQuery.data ?? [];

  return (
    <AppLayout activeMenuItem="my-assets">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">My Assets</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            View company assets currently assigned to you.
          </p>
        </div>

        {!hasHydrated || (!user && assetsQuery.fetchStatus !== 'idle') ? (
          <SkeletonTable rows={4} columns={4}/>
        ) : !employeeId ? (
          <Card className="card-aura">
            <CardContent className="py-12">
              <EmptyState
                icon={<Package className="h-8 w-8" aria-hidden="true"/>}
                title="No employee profile linked"
                description="Asset self-service will appear here once your account is linked to an employee profile."
              />
            </CardContent>
          </Card>
        ) : assetsQuery.isLoading ? (
          <SkeletonTable rows={4} columns={4}/>
        ) : assets.length === 0 ? (
          <Card className="card-aura">
            <CardContent className="py-12">
              <EmptyState
                icon={<Package className="h-8 w-8" aria-hidden="true"/>}
                title="No assets assigned"
                description="Assigned laptops, devices, access cards, and other company assets will appear here."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <Card key={asset.id} className="card-aura">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                        <Laptop className="h-5 w-5" aria-hidden="true"/>
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-semibold text-[var(--text-primary)] truncate">
                          {asset.assetName}
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)] truncate">
                          {asset.assetCode}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={asset.status}/>
                  </div>

                  <div className="mt-5 space-y-4 text-sm text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" aria-hidden="true"/>
                      <span>{asset.category.replace(/_/g, ' ')}</span>
                    </div>
                    {asset.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" aria-hidden="true"/>
                        <span>{asset.location}</span>
                      </div>
                    )}
                    {asset.purchaseDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" aria-hidden="true"/>
                        <span>Purchased {formatDate(asset.purchaseDate)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
