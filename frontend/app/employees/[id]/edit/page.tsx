'use client';

import {useEffect, useMemo, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import {useForm, type FieldErrors} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Tabs} from '@mantine/core';
import {Clock} from 'lucide-react';
import CustomFieldsSection from '@/components/custom-fields/CustomFieldsSection';
import {AppLayout} from '@/components/layout';
import {Callout} from '@/components/ui/Callout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryErrorCard} from '@/components/ui/QueryState';
import {FormPageSkeleton} from '@/components/ui/skeletons';
import {useUnsavedChanges} from '@/lib/hooks';
import {useActiveDepartments} from '@/lib/hooks/queries/useDepartments';
import {useEmployee, useManagers} from '@/lib/hooks/queries/useEmployees';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {EntityType} from '@/lib/types/core/custom-fields';
import {BankingFields, BasicFields, EmploymentFields, PersonalFields} from './_components/EditEmployeeFields';
import {
  buildUpdateEmployeeFormSchema,
  EDIT_TABS,
  type EditEmployeeTab,
  firstEditTabWithError,
  toEditFormValues,
  type UpdateEmployeeFormData,
} from './_components/edit-employee-schema';
import {useEditEmployeeSubmit} from './_hooks/useEditEmployeeSubmit';

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;
  const {hasPermission, isPermissionReady: permissionsReady} = usePermissions();

  // DEF-43: Redirect unauthorized users — prevents PII exposure in pre-populated form
  useEffect(() => {
    if (!permissionsReady) return;
    if (!hasPermission(Permissions.EMPLOYEE_UPDATE)) {
      router.replace('/employees');
    }
  }, [permissionsReady, hasPermission, router]);

  const employeeQuery = useEmployee(employeeId);
  const {data: employee, isLoading: loading, error: employeeError} = employeeQuery;
  const {data: managersData} = useManagers();
  const {data: departmentsData} = useActiveDepartments();
  const managers = managersData || [];
  const departments = departmentsData || [];

  const [currentTab, setCurrentTab] = useState<EditEmployeeTab>('basic');
  const submit = useEditEmployeeSubmit(employeeId, employee);

  const currentJobRole = employee?.jobRole;
  const schema = useMemo(() => buildUpdateEmployeeFormSchema(currentJobRole), [currentJobRole]);
  const form = useForm<UpdateEmployeeFormData>({
    resolver: zodResolver(schema),
  });
  const {handleSubmit, reset, formState: {isSubmitting, isDirty}} = form;
  useUnsavedChanges(isDirty);

  useEffect(() => {
    if (employee) reset(toEditFormValues(employee));
  }, [employee, reset]);

  // DEF-43: Don't render form content until permission is confirmed
  if (!permissionsReady || !hasPermission(Permissions.EMPLOYEE_UPDATE)) {
    return null;
  }

  if (loading) {
    return (
      <AppLayout activeMenuItem="employees">
        <FormPageSkeleton fields={8}/>
      </AppLayout>
    );
  }

  if (!employee) {
    return (
      <AppLayout activeMenuItem="employees">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <PageHeader title="Edit Employee"/>
          <QueryErrorCard
            title="Couldn't load employee"
            message={employeeError ? 'Failed to load employee. Please try again.' : 'Employee not found.'}
            onRetry={() => void employeeQuery.refetch()}
            retrying={employeeQuery.isFetching}
          />
        </div>
      </AppLayout>
    );
  }

  const onInvalid = (errors: FieldErrors<UpdateEmployeeFormData>) => {
    const tab = firstEditTabWithError(Object.keys(errors));
    if (tab) setCurrentTab(tab);
    submit.onInvalid();
  };

  return (
    <AppLayout
      activeMenuItem="employees"
      breadcrumbs={[
        {label: 'Employees', href: '/employees'},
        {label: 'Employee Detail', href: `/employees/${employeeId}`},
        {label: 'Edit'},
      ]}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <PageHeader
          title="Edit Employee"
          description={[employee.fullName, employee.employeeCode].filter(Boolean).join(' · ')}
        />

        {submit.submitError && <Callout tone="danger">{submit.submitError}</Callout>}

        {submit.changeRequestCreated && (
          <Callout
            tone="success"
            icon={<Clock className="h-4 w-4"/>}
            title="Employment Change Request Submitted"
            action={
              <div className="flex flex-wrap gap-2">
                <Button size="xs" color="green" onClick={() => router.push(`/employees/${employeeId}`)}>
                  View Employee
                </Button>
                <Button size="xs" variant="default" onClick={() => router.push('/employees/change-requests')}>
                  View All Requests
                </Button>
              </div>
            }
          >
            Your changes to employment details have been submitted for HR Manager approval. Other profile updates
            have been saved immediately.
          </Callout>
        )}

        <form
          noValidate
          onSubmit={(event) => void handleSubmit(submit.onSubmit, onInvalid)(event)}
          className="rounded-lg border border-border bg-card"
        >
          <Tabs
            value={currentTab}
            onChange={(v) => v && setCurrentTab(v as EditEmployeeTab)}
            keepMountedMode="display-none"
          >
            <Tabs.List aria-label="Edit employee sections" className="flex-nowrap overflow-x-auto px-4 sm:px-6">
              {EDIT_TABS.map((tab) => (
                <Tabs.Tab key={tab.key} value={tab.key}>{tab.label}</Tabs.Tab>
              ))}
            </Tabs.List>
            <div className="p-4 sm:p-6">
              <Tabs.Panel value="basic"><BasicFields form={form}/></Tabs.Panel>
              <Tabs.Panel value="personal"><PersonalFields form={form}/></Tabs.Panel>
              <Tabs.Panel value="employment">
                <EmploymentFields
                  form={form}
                  employeeId={employeeId}
                  currentJobRole={currentJobRole}
                  departments={departments}
                  managers={managers}
                />
              </Tabs.Panel>
              <Tabs.Panel value="bank">
                <BankingFields form={form} maskedAccount={employee.bankAccountNumber}/>
              </Tabs.Panel>
              <Tabs.Panel value="custom">
                <CustomFieldsSection
                  entityType={EntityType.EMPLOYEE}
                  entityId={employeeId}
                  onChange={submit.setCustomFieldValues}
                  disabled={false}
                  showGroupHeaders={true}
                />
              </Tabs.Panel>
            </div>
          </Tabs>

          <div className="flex justify-end gap-2 border-t border-border px-4 py-4 sm:px-6">
            <Button
              variant="default"
              onClick={() => router.push(`/employees/${employeeId}`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
