'use client';

import {useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {Button} from '@mantine/core';
import {DollarSign, Plus} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {Stat} from '@/components/ui/Stat';
import {useEmployee} from '@/lib/hooks/queries/useEmployees';
import {useEmployeeRevisionHistory} from '@/lib/hooks/queries/useCompensation';
import {RevisionStatus} from '@/lib/types/hrms/compensation';
import type {SalaryRevision} from '@/lib/types/hrms/compensation';
// RBAC-NEW-01: guard compensation page so salary data is not visible before API auth check
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {formatCurrency} from './_components/compensation-format';
import {RevisionCard} from './_components/RevisionCard';
import {NewRevisionModal} from './_components/NewRevisionModal';

function sortByEffectiveDateDesc(revisions: SalaryRevision[]): SalaryRevision[] {
  return [...revisions].sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );
}

export default function EmployeeCompensationPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);

  // RBAC-NEW-01: require COMPENSATION_VIEW (or MANAGE/VIEW_ALL) — redirect to
  // employee profile if the user lacks the permission rather than briefly
  // rendering the salary skeleton before the API returns 403.
  const {hasPermission, isPermissionReady} = usePermissions();
  const canViewCompensation =
    hasPermission(Permissions.COMPENSATION_VIEW) ||
    hasPermission(Permissions.COMPENSATION_MANAGE) ||
    hasPermission(Permissions.COMPENSATION_VIEW_ALL);

  useEffect(() => {
    if (isPermissionReady && !canViewCompensation) {
      router.replace(`/employees/${employeeId}`);
    }
  }, [isPermissionReady, canViewCompensation, router, employeeId]);

  const {data: employee} = useEmployee(employeeId);
  const revisionsQuery = useEmployeeRevisionHistory(employeeId, !!employeeId);

  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : undefined;
  const employeeLabel = employee
    ? [employeeName, employee.employeeCode].filter(Boolean).join(' · ')
    : undefined;

  return (
    <AppLayout activeMenuItem="employees">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <PageHeader
          title="Compensation History"
          description={employeeLabel}
          breadcrumbs={[
            {label: 'Employees', href: '/employees'},
            {label: employeeName ?? 'Employee', href: `/employees/${employeeId}`},
            {label: 'Compensation'},
          ]}
          actions={
            <Button leftSection={<Plus className="h-4 w-4"/>} onClick={() => setIsRevisionModalOpen(true)}>
              New Revision
            </Button>
          }
        />

        <QueryState
          query={revisionsQuery}
          skeleton={<ListPageSkeleton rows={4} columns={4} showHeader={false} showFilters={false}/>}
          errorTitle="Couldn't load compensation history"
          isEmpty={(revisions) => revisions.length === 0}
          empty={{
            icon: <DollarSign className="h-6 w-6"/>,
            title: 'No compensation records',
            description: 'No salary revisions have been recorded for this employee yet.',
            actionLabel: 'New Revision',
            onAction: () => setIsRevisionModalOpen(true),
          }}
        >
          {(revisions) => {
            const sorted = sortByEffectiveDateDesc(revisions);
            const applied = sorted.filter((r) => r.status === RevisionStatus.APPLIED).length;
            return (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <Stat size="compact" label="Current CTC" value={formatCurrency(sorted[0]?.newSalary ?? null)}/>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <Stat size="compact" label="Total Revisions" value={sorted.length}/>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <Stat size="compact" label="Applied" value={applied}/>
                  </div>
                </div>
                <ol className="flex flex-col gap-4" aria-label="Salary revisions">
                  {sorted.map((revision, index) => (
                    <RevisionCard key={revision.id} revision={revision} isLatest={index === 0}/>
                  ))}
                </ol>
              </div>
            );
          }}
        </QueryState>
      </div>

      <NewRevisionModal
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        employeeId={employeeId}
        employeeLabel={employeeLabel}
      />
    </AppLayout>
  );
}
