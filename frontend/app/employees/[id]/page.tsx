'use client';

import {useState} from 'react';
import {notFound, useParams, useRouter} from 'next/navigation';
import {Button, Tabs} from '@mantine/core';
import {Pencil, Trash2} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {PageTransition} from '@/components/motion';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {useToast} from '@/components/notifications/ToastProvider';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryErrorCard} from '@/components/ui/QueryState';
import {DetailPageSkeleton} from '@/components/ui/skeletons';
import {useDeleteEmployee, useDottedLineReports, useEmployee, useSubordinates} from '@/lib/hooks/queries/useEmployees';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {createLogger} from '@/lib/utils/logger';
import {AboutTab} from './_components/AboutTab';
import {AssetsTab} from './_components/AssetsTab';
import {DocumentsTab} from './_components/DocumentsTab';
import {EmployeeSidePanel} from './_components/EmployeeSidePanel';
import {JobTab} from './_components/JobTab';
import {ProfileTab} from './_components/ProfileTab';
import {MAIN_TABS, type MainTab, useEmployeeTabs} from './_hooks/useEmployeeTabs';

const log = createLogger('EmployeePage');

const BREADCRUMB_ROOT = [
  {label: 'NU-HRMS'},
  {label: 'Employees', href: '/employees'},
];

function loadErrorMessage(error: unknown): string {
  const status = (error as {response?: {status?: number}})?.response?.status;
  if (status === 403) return "You don't have access to this employee's profile.";
  return 'Failed to load employee. Please try again.';
}

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const employeeId = params.id as string;

  // Scope guard: EMPLOYEE_VIEW_SELF holders may only view their own profile
  const {user} = useAuth();
  const {hasPermission, isPermissionReady: permReady} = usePermissions();
  const canViewAny =
    hasPermission(Permissions.EMPLOYEE_VIEW_ALL) ||
    hasPermission(Permissions.EMPLOYEE_VIEW_DEPARTMENT) ||
    hasPermission(Permissions.EMPLOYEE_VIEW_TEAM);
  const isSelf = user?.employeeId === employeeId;
  if (permReady && !canViewAny && !isSelf) {
    notFound();
  }

  const tabs = useEmployeeTabs();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const employeeQuery = useEmployee(employeeId);
  const {data: employee, isLoading: loading, error: queryError} = employeeQuery;
  const {data: dottedReports = []} = useDottedLineReports(employeeId);
  const {data: subordinates = []} = useSubordinates(employeeId);
  const deleteEmployeeMutation = useDeleteEmployee();

  const handleDelete = async () => {
    try {
      await deleteEmployeeMutation.mutateAsync(employeeId);
      toast.success('Employee Deleted', 'The employee has been deleted successfully.');
      router.push('/employees');
    } catch (err: unknown) {
      // Error toast comes from the global mutation handler.
      log.error('Error deleting employee:', err);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <AppLayout activeMenuItem="employees">
        <DetailPageSkeleton sections={3} showSidePanel/>
      </AppLayout>
    );
  }

  if (!loading && !queryError && !employee) {
    notFound();
  }

  if (queryError || !employee) {
    return (
      <AppLayout activeMenuItem="employees">
        <div className="flex flex-col gap-6">
          <PageHeader title="Employee Details" breadcrumbs={BREADCRUMB_ROOT}/>
          <QueryErrorCard
            title="Couldn't load employee"
            message={loadErrorMessage(queryError)}
            onRetry={() => void employeeQuery.refetch()}
            retrying={employeeQuery.isFetching}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="employees">
      <PageTransition className="flex flex-col gap-6">
        <PageHeader
          title={employee.fullName}
          description={[employee.designation, employee.employeeCode].filter(Boolean).join(' · ')}
          breadcrumbs={[...BREADCRUMB_ROOT, {label: employee.fullName}]}
          actions={
            <div className="flex items-center gap-2">
              <PermissionGate permission={Permissions.EMPLOYEE_UPDATE}>
                <Button
                  size="sm"
                  variant="default"
                  leftSection={<Pencil className="h-4 w-4"/>}
                  onClick={() => router.push(`/employees/${employeeId}/edit`)}
                >
                  Edit
                </Button>
              </PermissionGate>
              <PermissionGate permission={Permissions.EMPLOYEE_DELETE}>
                <Button
                  size="sm"
                  color="red"
                  variant="light"
                  leftSection={<Trash2 className="h-4 w-4"/>}
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete
                </Button>
              </PermissionGate>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="order-2 min-w-0 lg:order-1">
            <Tabs keepMounted={false} value={tabs.currentTab} onChange={(v) => v && tabs.selectMainTab(v as MainTab)}>
              <Tabs.List aria-label="Employee tabs" className="mb-4 flex-nowrap overflow-x-auto">
                {MAIN_TABS.map((tab) => (
                  <Tabs.Tab key={tab.key} value={tab.key}>{tab.label}</Tabs.Tab>
                ))}
              </Tabs.List>

              <Tabs.Panel value="about">
                <AboutTab
                  employee={employee}
                  subordinates={subordinates}
                  subTab={tabs.aboutSubTab}
                  onSubTabChange={tabs.selectAboutSubTab}
                />
              </Tabs.Panel>
              <Tabs.Panel value="profile">
                <ProfileTab employee={employee}/>
              </Tabs.Panel>
              <Tabs.Panel value="job">
                <JobTab employee={employee} directReports={subordinates.length} dottedReports={dottedReports}/>
              </Tabs.Panel>
              <Tabs.Panel value="documents">
                <DocumentsTab employeeId={employeeId}/>
              </Tabs.Panel>
              <Tabs.Panel value="assets">
                <AssetsTab
                  employeeId={employeeId}
                  firstName={employee.firstName}
                  subTab={tabs.assetSubTab}
                  onSubTabChange={tabs.selectAssetSubTab}
                />
              </Tabs.Panel>
            </Tabs>
          </div>

          <div className="order-1 lg:order-2">
            <EmployeeSidePanel
              employee={employee}
              directReports={subordinates.length}
              dottedReports={dottedReports.length}
            />
          </div>
        </div>

        <ConfirmDialog
          isOpen={showDeleteModal}
          onClose={() => !deleteEmployeeMutation.isPending && setShowDeleteModal(false)}
          onConfirm={() => void handleDelete()}
          title="Delete Employee?"
          message={`Are you sure you want to delete ${employee.fullName}? This action cannot be undone.`}
          confirmText="Delete"
          type="danger"
          loading={deleteEmployeeMutation.isPending}
        />
      </PageTransition>
    </AppLayout>
  );
}
