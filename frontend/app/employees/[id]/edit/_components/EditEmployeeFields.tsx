'use client';

import type {ReactNode} from 'react';
import {NativeSelect, SimpleGrid, Textarea, TextInput} from '@mantine/core';
import {Controller, type UseFormReturn} from 'react-hook-form';
import {Callout} from '@/components/ui/Callout';
import {toEmployeeLevel, toEmployeeStatus, toEmploymentType, toGender, toJobRole} from '@/lib/utils/type-guards';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  jobRoleOptionsFor,
  LEVEL_OPTIONS,
  STATUS_OPTIONS,
  type UpdateEmployeeFormData,
} from './edit-employee-schema';

type Form = UseFormReturn<UpdateEmployeeFormData>;

export interface EditManagerOption {
  id: string;
  fullName: string;
  employeeCode: string;
}

export interface EditDepartmentOption {
  id: string;
  name: string;
  code: string;
}

const optional = (label: string): ReactNode => (
  <>
    {label} <span className="font-normal text-text-3">(Optional)</span>
  </>
);

export function BasicFields({form}: {form: Form}) {
  const {register, control, formState: {errors}} = form;
  return (
    <div className="flex flex-col gap-4">
      <Callout tone="info">Work Email cannot be changed after creation.</Callout>
      <TextInput
        id="employee-edit-code"
        label="Employee Code"
        withAsterisk
        placeholder="EMP001"
        description="Unique identifier for this employee. Changing this may affect integrations."
        error={errors.employeeCode?.message}
        {...register('employeeCode')}
      />
      <SimpleGrid cols={{base: 1, sm: 3}} spacing="md">
        <TextInput
          id="employee-edit-first-name"
          label="First Name"
          withAsterisk
          autoComplete="given-name"
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <TextInput
          id="employee-edit-middle-name"
          label="Middle Name"
          error={errors.middleName?.message}
          {...register('middleName')}
        />
        <TextInput
          id="employee-edit-last-name"
          label="Last Name"
          autoComplete="family-name"
          error={errors.lastName?.message}
          {...register('lastName')}
        />
      </SimpleGrid>
      <Controller
        name="status"
        control={control}
        render={({field}) => (
          <NativeSelect
            id="employee-edit-status"
            label="Status"
            withAsterisk
            data={STATUS_OPTIONS}
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            value={field.value || ''}
            onChange={(e) => field.onChange(toEmployeeStatus(e.currentTarget.value) || undefined)}
            error={errors.status?.message}
          />
        )}
      />
    </div>
  );
}

export function PersonalFields({form}: {form: Form}) {
  const {register, control, formState: {errors}} = form;
  return (
    <div className="flex flex-col gap-4">
      <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
        <TextInput
          id="employee-edit-personal-email"
          type="email"
          label="Personal Email"
          autoComplete="email"
          placeholder="personal@email.com"
          error={errors.personalEmail?.message}
          {...register('personalEmail')}
        />
        <TextInput
          id="employee-edit-phone-number"
          type="tel"
          label="Phone Number"
          autoComplete="tel"
          placeholder="+1 234 567 8900"
          error={errors.phoneNumber?.message}
          {...register('phoneNumber')}
        />
        <TextInput
          id="employee-edit-emergency-contact"
          type="tel"
          label="Emergency Contact"
          placeholder="+1 234 567 8900"
          error={errors.emergencyContactNumber?.message}
          {...register('emergencyContactNumber')}
        />
        <TextInput
          id="employee-edit-date-of-birth"
          type="date"
          label="Date of Birth"
          error={errors.dateOfBirth?.message}
          {...register('dateOfBirth')}
        />
        <Controller
          name="gender"
          control={control}
          render={({field}) => (
            <NativeSelect
              id="employee-edit-gender"
              label="Gender"
              data={GENDER_OPTIONS}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value || ''}
              onChange={(e) => field.onChange(toGender(e.currentTarget.value) || undefined)}
              error={errors.gender?.message}
            />
          )}
        />
      </SimpleGrid>
      <Textarea
        id="employee-edit-address"
        label="Address"
        rows={2}
        placeholder="Street address"
        error={errors.address?.message}
        {...register('address')}
      />
      <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
        <TextInput id="employee-edit-city" label="City" error={errors.city?.message} {...register('city')}/>
        <TextInput id="employee-edit-state" label="State/Province" error={errors.state?.message} {...register('state')}/>
        <TextInput
          id="employee-edit-postal-code"
          label="Postal Code"
          autoComplete="postal-code"
          error={errors.postalCode?.message}
          {...register('postalCode')}
        />
        <TextInput id="employee-edit-country" label="Country" error={errors.country?.message} {...register('country')}/>
      </SimpleGrid>
    </div>
  );
}

export function EmploymentFields({
  form,
  employeeId,
  currentJobRole,
  departments,
  managers,
}: {
  form: Form;
  employeeId: string;
  currentJobRole?: string | null;
  departments: EditDepartmentOption[];
  managers: EditManagerOption[];
}) {
  const {register, control, formState: {errors}} = form;
  const managerOptions = managers
    .filter((m) => m.id !== employeeId)
    .map((m) => ({value: m.id, label: `${m.fullName} (${m.employeeCode})`}));

  return (
    <div className="flex flex-col gap-4">
      <Callout tone="warning" title="HR Manager Approval Required">
        Changes to employment details (designation, level, department, manager, etc.) will be submitted for HR
        Manager approval before they take effect.
      </Callout>
      <Textarea
        id="employee-edit-change-reason"
        label="Reason for Changes"
        rows={2}
        placeholder="Please provide a reason for the employment changes (e.g., Promotion, Role change, Transfer)"
        error={errors.changeRequestReason?.message}
        {...register('changeRequestReason')}
      />
      <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
        <TextInput
          id="employee-edit-designation"
          label="Designation"
          withAsterisk
          placeholder="Senior Software Engineer"
          error={errors.designation?.message}
          {...register('designation')}
        />
        <Controller
          name="employmentType"
          control={control}
          render={({field}) => (
            <NativeSelect
              id="employee-edit-employment-type"
              label="Employment Type"
              withAsterisk
              data={EMPLOYMENT_TYPE_OPTIONS}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value || ''}
              onChange={(e) => field.onChange(toEmploymentType(e.currentTarget.value) || undefined)}
              error={errors.employmentType?.message}
            />
          )}
        />
      </SimpleGrid>
      <Controller
        name="departmentId"
        control={control}
        render={({field}) => (
          <NativeSelect
            id="employee-edit-department"
            label="Department"
            data={[
              {value: '', label: 'Select Department'},
              ...departments.map((d) => ({value: d.id, label: `${d.name} (${d.code})`})),
            ]}
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            value={field.value || ''}
            onChange={field.onChange}
            error={errors.departmentId?.message}
          />
        )}
      />
      <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
        <Controller
          name="level"
          control={control}
          render={({field}) => (
            <NativeSelect
              id="employee-edit-level"
              label="Employee Level"
              data={LEVEL_OPTIONS}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value || ''}
              onChange={(e) => field.onChange(toEmployeeLevel(e.currentTarget.value) || undefined)}
              error={errors.level?.message}
            />
          )}
        />
        <Controller
          name="jobRole"
          control={control}
          render={({field}) => (
            <NativeSelect
              id="employee-edit-job-role"
              label="Job Role"
              data={jobRoleOptionsFor(currentJobRole)}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value || ''}
              onChange={(e) => {
                const value = e.currentTarget.value;
                field.onChange(toJobRole(value) ?? (value && value === currentJobRole ? value : undefined));
              }}
              error={errors.jobRole?.message}
            />
          )}
        />
        <TextInput
          id="employee-edit-confirmation-date"
          type="date"
          label="Confirmation Date"
          error={errors.confirmationDate?.message}
          {...register('confirmationDate')}
        />
        <Controller
          name="managerId"
          control={control}
          render={({field}) => (
            <NativeSelect
              id="employee-edit-manager"
              label="Reporting Manager"
              withAsterisk
              description={'Select "Self" for top-level employees who don\'t report to anyone.'}
              inputWrapperOrder={['label', 'input', 'description', 'error']}
              data={[
                {value: '', label: 'Select Manager'},
                {value: employeeId, label: 'Self (No Reporting Manager)'},
                ...managerOptions,
              ]}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value || ''}
              onChange={field.onChange}
              error={errors.managerId?.message}
            />
          )}
        />
      </SimpleGrid>
      <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
        {(['dottedLineManager1Id', 'dottedLineManager2Id'] as const).map((name, i) => (
          <Controller
            key={name}
            name={name}
            control={control}
            render={({field}) => (
              <NativeSelect
                id={`employee-edit-dotted-manager-${i + 1}`}
                label={optional(`Dotted-Line Manager ${i + 1}`)}
                data={[{value: '', label: 'None'}, ...managerOptions]}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />
        ))}
      </SimpleGrid>
      <p className="text-xs text-text-3">
        Dotted-line managers represent matrix reporting relationships. They are informational only and do not
        participate in approval workflows.
      </p>
    </div>
  );
}

export function BankingFields({form, maskedAccount}: {form: Form; maskedAccount?: string}) {
  const {register, formState: {errors}} = form;
  return (
    <div className="flex flex-col gap-4">
      <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
        <TextInput
          id="employee-edit-bank-account"
          label="Bank Account Number"
          placeholder={maskedAccount ? `Currently: ${maskedAccount}` : 'Enter account number'}
          description={maskedAccount ? `Leave blank to keep current account (${maskedAccount})` : undefined}
          inputWrapperOrder={['label', 'input', 'description', 'error']}
          error={errors.bankAccountNumber?.message}
          {...register('bankAccountNumber')}
        />
        <TextInput
          id="employee-edit-bank-name"
          label="Bank Name"
          placeholder="Bank of America"
          error={errors.bankName?.message}
          {...register('bankName')}
        />
        <TextInput
          id="employee-edit-bank-ifsc"
          label="IFSC Code / Routing Number"
          placeholder="HDFC0001234"
          error={errors.bankIfscCode?.message}
          {...register('bankIfscCode')}
        />
        <TextInput
          id="employee-edit-tax-id"
          label="Tax ID / SSN"
          placeholder="XXX-XX-XXXX"
          error={errors.taxId?.message}
          {...register('taxId')}
        />
      </SimpleGrid>
      <Callout tone="info" title="Stored securely">
        Banking and tax information is encrypted and stored securely. This information will be used for payroll
        processing.
      </Callout>
    </div>
  );
}
