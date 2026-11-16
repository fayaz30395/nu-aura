'use client';

import type {ReactNode} from 'react';
import Link from 'next/link';
import {Button} from '@mantine/core';
import {Building2, Calendar, Mail, Phone, UserCircle} from 'lucide-react';
import {Avatar} from '@/components/ui/Avatar';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {EMPLOYEE_LIFECYCLE_STATUS} from '@/lib/status/vocabulary';
import {formatDate} from '@/lib/utils/format/date';
import type {DirectoryEmployee} from './directory-options';

function InfoRow({icon, label, value, action}: {icon: ReactNode; label: string; value: ReactNode; action?: ReactNode}) {
  return (
    <div className="flex items-center gap-4 border-b border-border py-2 last:border-0">
      <span className="text-text-3" aria-hidden>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-2">{label}</p>
        <p className="truncate text-sm font-medium text-text-1">{value}</p>
      </div>
      {action}
    </div>
  );
}

interface EmployeeQuickViewModalProps {
  employee: DirectoryEmployee | null;
  onClose: () => void;
}

export function EmployeeQuickViewModal({employee, onClose}: EmployeeQuickViewModalProps) {
  return (
    <Modal isOpen={!!employee} onClose={onClose} size="md">
      {employee && (
        <>
          <ModalHeader onClose={onClose}>
            <div className="flex items-center gap-4">
              <Avatar name={employee.fullName} src={employee.profileImageUrl} size="lg"/>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold text-text-1">{employee.fullName}</h2>
                <p className="truncate text-xs text-text-2">{employee.designation || employee.jobRole}</p>
                <StatusBadge className="mt-1" status={employee.status} domain={EMPLOYEE_LIFECYCLE_STATUS} compact/>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            {employee.departmentName && (
              <InfoRow icon={<Building2 className="h-4 w-4"/>} label="Department" value={employee.departmentName}/>
            )}
            {employee.personalEmail && (
              <InfoRow
                icon={<Mail className="h-4 w-4"/>}
                label="Email"
                value={employee.personalEmail}
                action={
                  <Button component="a" href={`mailto:${employee.personalEmail}`} size="xs" variant="light">
                    Send Email
                  </Button>
                }
              />
            )}
            {employee.phoneNumber && (
              <InfoRow
                icon={<Phone className="h-4 w-4"/>}
                label="Phone"
                value={employee.phoneNumber}
                action={
                  <Button component="a" href={`tel:${employee.phoneNumber}`} size="xs" variant="light" color="green">
                    Call
                  </Button>
                }
              />
            )}
            {employee.managerName && (
              <InfoRow icon={<UserCircle className="h-4 w-4"/>} label="Reports To" value={employee.managerName}/>
            )}
            {employee.joiningDate && (
              <InfoRow icon={<Calendar className="h-4 w-4"/>} label="Joined" value={formatDate(employee.joiningDate)}/>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="default" onClick={onClose}>
              Close
            </Button>
            <Button component={Link} href={`/employees/${employee.id}`}>
              View Full Profile
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
