'use client';

import {PermissionGate} from '@/components/auth/PermissionGate';
import {Callout} from '@/components/ui/Callout';
import {Permissions} from '@/lib/hooks/usePermissions';
import type {Employee} from '@/lib/types/hrms/employee';
import {formatDate, formatEnumValue, InfoField, InfoGrid, SectionCard} from './DetailPrimitives';

export function ProfileTab({employee}: {employee: Employee}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard title="Primary Details">
        <InfoGrid>
          <InfoField label="First Name" value={employee.firstName}/>
          <InfoField label="Last Name" value={employee.lastName}/>
          <InfoField label="Middle Name" value={employee.middleName}/>
          <InfoField label="Gender" value={formatEnumValue(employee.gender)}/>
          <InfoField label="Date of Birth" value={formatDate(employee.dateOfBirth)}/>
          <InfoField label="Nationality" value={employee.country}/>
        </InfoGrid>
      </SectionCard>

      <SectionCard title="Contact Details">
        <InfoGrid>
          <InfoField label="Work Email" value={employee.workEmail}/>
          <InfoField label="Personal Email" value={employee.personalEmail}/>
          <InfoField label="Mobile" value={employee.phoneNumber}/>
          <InfoField label="Emergency Contact" value={employee.emergencyContactNumber}/>
        </InfoGrid>
      </SectionCard>

      <SectionCard title="Address">
        <InfoGrid>
          <div className="sm:col-span-2">
            <InfoField label="Street Address" value={employee.address}/>
          </div>
          <InfoField label="City" value={employee.city}/>
          <InfoField label="State / Province" value={employee.state}/>
          <InfoField label="Postal Code" value={employee.postalCode}/>
          <InfoField label="Country" value={employee.country}/>
        </InfoGrid>
      </SectionCard>

      <PermissionGate
        anyOf={[Permissions.PAYROLL_VIEW, Permissions.PAYROLL_VIEW_SELF, Permissions.PAYROLL_VIEW_ALL]}
        fallback={null}
      >
        <SectionCard title="Banking & Tax">
          <InfoGrid>
            <InfoField label="Bank Name" value={employee.bankName}/>
            <InfoField label="Account Number" value={employee.bankAccountNumber}/>
            <InfoField label="IFSC / Routing" value={employee.bankIfscCode}/>
            <InfoField label="Tax ID / SSN" value={employee.taxId}/>
          </InfoGrid>
          <Callout tone="info" className="mt-4">
            Banking and tax information is encrypted and stored securely.
          </Callout>
        </SectionCard>
      </PermissionGate>
    </div>
  );
}
