'use client';

import {ActionIcon} from '@mantine/core';
import {Building2, Mail, Phone} from 'lucide-react';
import {Avatar} from '@/components/ui/Avatar';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {EMPLOYEE_LIFECYCLE_STATUS} from '@/lib/status/vocabulary';
import type {DirectoryEmployee} from './directory-options';

interface DirectoryGridProps {
  employees: DirectoryEmployee[];
  onSelect: (employee: DirectoryEmployee) => void;
}

export function DirectoryGrid({employees, onSelect}: DirectoryGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {employees.map((employee) => (
        <li key={employee.id} className="relative flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-center transition-colors hover:border-border-strong">
          <Avatar name={employee.fullName} src={employee.profileImageUrl} size="lg"/>
          <button
            type="button"
            onClick={() => onSelect(employee)}
            className="text-sm font-semibold text-text-1 after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[var(--ring-primary)]"
          >
            {employee.fullName}
          </button>
          <p className="text-xs text-text-2">{employee.designation || employee.jobRole}</p>
          <StatusBadge status={employee.status} domain={EMPLOYEE_LIFECYCLE_STATUS}/>
          {employee.departmentName && (
            <p className="flex items-center gap-1 text-xs text-text-2">
              <Building2 className="h-3 w-3" aria-hidden/>
              {employee.departmentName}
            </p>
          )}
          {(employee.personalEmail || employee.phoneNumber) && (
            <div className="relative z-10 flex gap-2">
              {employee.personalEmail && (
                <ActionIcon
                  component="a"
                  href={`mailto:${employee.personalEmail}`}
                  variant="light"
                  aria-label={`Email ${employee.fullName}`}
                >
                  <Mail className="h-4 w-4"/>
                </ActionIcon>
              )}
              {employee.phoneNumber && (
                <ActionIcon
                  component="a"
                  href={`tel:${employee.phoneNumber}`}
                  variant="light"
                  color="green"
                  aria-label={`Call ${employee.fullName}`}
                >
                  <Phone className="h-4 w-4"/>
                </ActionIcon>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
