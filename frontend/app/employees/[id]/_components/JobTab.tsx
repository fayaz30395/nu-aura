'use client';

import {useMemo} from 'react';
import {useRouter} from 'next/navigation';
import {ResponsiveTable, type Column} from '@/components/ui/ResponsiveTable';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {EMPLOYEE_LIFECYCLE_STATUS} from '@/lib/status/vocabulary';
import type {Employee} from '@/lib/types/hrms/employee';
import {formatDate, formatEnumValue, InfoField, InfoGrid, PersonLink, SectionCard} from './DetailPrimitives';

function DottedManager({label, id, name}: {label: string; id?: string; name: string}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-text-3">{label}</dt>
      <dd><PersonLink id={id} name={name}/></dd>
    </div>
  );
}

export function JobTab({
  employee,
  directReports,
  dottedReports,
}: {
  employee: Employee;
  directReports: number;
  dottedReports: Employee[];
}) {
  const router = useRouter();

  const columns = useMemo<Column<Employee>[]>(() => [
    {
      key: 'employee',
      header: 'Employee',
      mobilePriority: 'primary',
      accessor: (r) => <PersonLink id={r.id} name={r.fullName}/>,
    },
    {key: 'code', header: 'Code', mobilePriority: 'secondary', accessor: (r) => r.employeeCode},
    {key: 'designation', header: 'Designation', accessor: (r) => r.designation || '-'},
    {key: 'department', header: 'Department', accessor: (r) => r.departmentName || '-'},
    {
      key: 'status',
      header: 'Status',
      mobilePriority: 'secondary',
      accessor: (r) => <StatusBadge status={r.status} domain={EMPLOYEE_LIFECYCLE_STATUS} compact/>,
    },
  ], []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Job Details">
          <InfoGrid>
            <InfoField label="Employee Number" value={employee.employeeCode}/>
            <InfoField label="Date of Joining" value={formatDate(employee.joiningDate)}/>
            <InfoField label="Job Title" value={employee.designation}/>
            <InfoField label="Job Role" value={formatEnumValue(employee.jobRole)}/>
            <InfoField label="Confirmation Date" value={formatDate(employee.confirmationDate)}/>
            <InfoField label="Worker Type" value={formatEnumValue(employee.employmentType)}/>
            <InfoField label="Level" value={formatEnumValue(employee.level)}/>
            <InfoField label="Status" value={formatEnumValue(employee.status)}/>
            {employee.exitDate && <InfoField label="Exit Date" value={formatDate(employee.exitDate)}/>}
          </InfoGrid>
        </SectionCard>

        <SectionCard title="Organization">
          <InfoGrid>
            <InfoField label="Department" value={employee.departmentName}/>
            <InfoField label="Cost Center" value="Not Set"/>
            <div className="space-y-1 sm:col-span-2">
              <dt className="text-xs font-medium text-text-3">Reports To</dt>
              <dd>
                {employee.managerId ? (
                  <PersonLink id={employee.managerId} name={employee.managerName || 'Manager'}/>
                ) : (
                  <span className="text-sm text-text-1">-</span>
                )}
              </dd>
            </div>
            {employee.dottedLineManager1Name && (
              <DottedManager
                label="Dotted-Line Manager 1"
                id={employee.dottedLineManager1Id}
                name={employee.dottedLineManager1Name}
              />
            )}
            {employee.dottedLineManager2Name && (
              <DottedManager
                label="Dotted-Line Manager 2"
                id={employee.dottedLineManager2Id}
                name={employee.dottedLineManager2Name}
              />
            )}
            <InfoField label="Direct Reports" value={String(directReports)}/>
            <InfoField label="Dotted Reports" value={String(dottedReports.length)}/>
          </InfoGrid>
        </SectionCard>
      </div>

      {dottedReports.length > 0 && (
        <SectionCard
          title="Dotted-Line Reports"
          description={`Employees who have ${employee.fullName} assigned as a dotted-line manager (matrix reporting).`}
        >
          <ResponsiveTable
            data={dottedReports}
            columns={columns}
            keyExtractor={(r) => r.id}
            onRowClick={(r) => router.push(`/employees/${r.id}`)}
          />
        </SectionCard>
      )}
    </div>
  );
}
