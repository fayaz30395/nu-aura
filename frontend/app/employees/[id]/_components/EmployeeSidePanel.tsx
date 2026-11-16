'use client';

import {IdCard, Mail, MapPin, Phone} from 'lucide-react';
import type {ReactNode} from 'react';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {EMPLOYEE_LIFECYCLE_STATUS} from '@/lib/status/vocabulary';
import type {Employee} from '@/lib/types/hrms/employee';
import {EmployeeAvatar} from '../../_components/EmployeeAvatar';
import {InfoField, PersonLink} from './DetailPrimitives';

function ContactRow({icon, children}: {icon: ReactNode; children: ReactNode}) {
  return (
    <li className="flex min-w-0 items-center gap-2 text-sm text-text-2">
      <span className="shrink-0 text-text-3" aria-hidden="true">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </li>
  );
}

export function EmployeeSidePanel({
  employee,
  directReports,
  dottedReports,
}: {
  employee: Employee;
  directReports: number;
  dottedReports: number;
}) {
  const location = [employee.city, employee.state, employee.country].filter(Boolean).join(', ');

  return (
    <aside className="space-y-4" aria-label="Employee overview">
      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <EmployeeAvatar name={employee.fullName} src={employee.profilePhotoUrl} size={68}/>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-text-1">{employee.fullName}</p>
            <p className="truncate text-xs text-text-2">{employee.designation || '-'}</p>
            <div className="mt-2">
              <StatusBadge status={employee.status} domain={EMPLOYEE_LIFECYCLE_STATUS} compact/>
            </div>
          </div>
        </div>
        <ul className="mt-4 space-y-2 border-t border-border pt-4">
          <ContactRow icon={<Mail className="h-4 w-4"/>}>
            <a href={`mailto:${employee.workEmail}`} className="hover:text-text-1 hover:underline">
              {employee.workEmail}
            </a>
          </ContactRow>
          {employee.phoneNumber && (
            <ContactRow icon={<Phone className="h-4 w-4"/>}>
              <a href={`tel:${employee.phoneNumber}`} className="hover:text-text-1 hover:underline">
                {employee.phoneNumber}
              </a>
            </ContactRow>
          )}
          {location && <ContactRow icon={<MapPin className="h-4 w-4"/>}>{location}</ContactRow>}
          <ContactRow icon={<IdCard className="h-4 w-4"/>}>{employee.employeeCode}</ContactRow>
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-text-1">Organization</h2>
        <dl className="space-y-4">
          <InfoField label="Department" value={employee.departmentName || 'Not Set'}/>
          <div className="space-y-1">
            <dt className="text-xs font-medium text-text-3">Reporting Manager</dt>
            <dd>
              {employee.managerId ? (
                <PersonLink
                  id={employee.managerId}
                  name={employee.managerName || 'Manager'}
                  ariaLabel={`View profile of reporting manager ${employee.managerName}`}
                />
              ) : (
                <span className="text-sm text-text-1">-</span>
              )}
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="Direct Reports" value={<span className="tabular-nums">{directReports}</span>}/>
            <InfoField label="Dotted Reports" value={<span className="tabular-nums">{dottedReports}</span>}/>
          </div>
        </dl>
      </section>
    </aside>
  );
}
