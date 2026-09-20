'use client';

import React from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft, CheckCircle, Clock, LogOut, ShieldCheck, UserMinus} from 'lucide-react';
import {AppLayout} from '@/components/layout/AppLayout';
import {Button} from '@/components/ui';
import {StatCard} from '@/components/ui/StatCard';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useExitDashboard} from '@/lib/hooks/queries/useExit';

export default function ExitDashboardPage() {
  const router = useRouter();
  const {data, isLoading} = useExitDashboard();

  return (
    <AppLayout>
      <PermissionGate anyOf={[Permissions.EXIT_VIEW, Permissions.EXIT_MANAGE]}>
        <div className="space-y-6 p-4 md:p-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/offboarding')}>
              <ArrowLeft className="h-4 w-4 mr-1"/>
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Exit Dashboard</h1>
              <p className="text-sm text-[var(--text-secondary)]">Company-wide offboarding overview</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              icon={<LogOut className="h-5 w-5"/>}
              title="Total Exits"
              value={isLoading ? '—' : data?.totalExits ?? 0}
              variant="default"
            />
            <StatCard
              icon={<UserMinus className="h-5 w-5"/>}
              title="Initiated"
              value={isLoading ? '—' : data?.initiated ?? 0}
              variant="primary"
            />
            <StatCard
              icon={<Clock className="h-5 w-5"/>}
              title="In Progress"
              value={isLoading ? '—' : data?.inProgress ?? 0}
              variant="warning"
            />
            <StatCard
              icon={<ShieldCheck className="h-5 w-5"/>}
              title="Clearance Pending"
              value={isLoading ? '—' : data?.clearancePending ?? 0}
              variant="warning"
            />
            <StatCard
              icon={<CheckCircle className="h-5 w-5"/>}
              title="Completed"
              value={isLoading ? '—' : data?.completed ?? 0}
              variant="success"
            />
          </div>
        </div>
      </PermissionGate>
    </AppLayout>
  );
}
