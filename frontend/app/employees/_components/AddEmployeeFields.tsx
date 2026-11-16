'use client';

import {NativeSelect, PasswordInput, Select, SimpleGrid, Text, Textarea, TextInput} from '@mantine/core';
import {Controller, type UseFormReturn} from 'react-hook-form';
import {Callout} from '@/components/ui/Callout';
import {JOB_ROLE_GROUPS} from '../_constants/job-roles';
import type {CreateEmployeeFormData} from './create-employee-schema';

type Form = UseFormReturn<CreateEmployeeFormData>;

export interface ManagerOption {
  id: string;
  fullName: string;
  employeeCode: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

const GENDER_OPTIONS = [
  {value: '', label: 'Select Gender'},
  {value: 'MALE', label: 'Male'},
  {value: 'FEMALE', label: 'Female'},
  {value: 'OTHER', label: 'Other'},
  {value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say'},
];

const EMPLOYMENT_TYPE_OPTIONS = [
  {value: 'FULL_TIME', label: 'Full Time'},
  {value: 'PART_TIME', label: 'Part Time'},
  {value: 'CONTRACT', label: 'Contract'},
  {value: 'INTERN', label: 'Intern'},
];

const LEVEL_OPTIONS = [
  {value: '', label: 'Select Level'},
  {value: 'ENTRY', label: 'Entry'},
  {value: 'MID', label: 'Mid'},
  {value: 'SENIOR', label: 'Senior'},
  {value: 'LEAD', label: 'Lead'},
  {value: 'MANAGER', label: 'Manager'},
  {value: 'SENIOR_MANAGER', label: 'Senior Manager'},
  {value: 'DIRECTOR', label: 'Director'},
  {value: 'VP', label: 'Vice President'},
  {value: 'SVP', label: 'Senior Vice President'},
  {value: 'CXO', label: 'C-Level Executive'},
];

const optional = (label: string) => (
  <>
    {label} <span className="font-normal text-text-3">(Optional)</span>
  </>
);

export function BasicInfoFields({form}: { form: Form }) {
  const {register, formState: {errors}} = form;
  return (
    <div className="flex flex-col gap-4">
      <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
        <TextInput
          id="emp-code"
          data-testid="emp-code"
          label="Employee Code"
          placeholder="Leave blank to auto-generate"
          error={errors.employeeCode?.message}
          {...register('employeeCode')}
        />
        <TextInput
          id="emp-work-email"
          type="email"
          label="Work Email"
          withAsterisk
          placeholder="employee@company.com"
          error={errors.workEmail?.message}
          {...register('workEmail')}
        />
      </SimpleGrid>
      <SimpleGrid cols={{base: 1, sm: 2, md: 3}} spacing="md">
        <TextInput
          id="emp-first-name"
          label="First Name"
          withAsterisk
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <TextInput id="emp-middle-name" label="Middle Name" error={errors.middleName?.message} {...register('middleName')}/>
        <TextInput id="emp-last-name" label="Last Name" error={errors.lastName?.message} {...register('lastName')}/>
      </SimpleGrid>
      <PasswordInput
        id="emp-password"
        label="Initial Password"
        withAsterisk
        placeholder="Employee will change on first login"
        description="At least 12 characters with upper and lower case letters, a digit and a symbol."
        error={errors.password?.message}
        {...register('password')}
      />
    </div>
  );
}

export function PersonalFields({form}: { form: Form }) {
  const {register, formState: {errors}} = form;
  return (
    <div className="flex flex-col gap-4">
      <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
        <TextInput
          id="emp-personal-email"
          type="email"
          label="Personal Email"
          placeholder="personal@email.com"
          error={errors.personalEmail?.message}
          {...register('personalEmail')}
        />
        <TextInput
          id="emp-phone-number"
          type="tel"
          label="Phone Number"
          placeholder="+1 234 567 8900"
          error={errors.phoneNumber?.message}
          {...register('phoneNumber')}
        />
        <TextInput
          id="emp-emergency-contact"
          type="tel"
          label="Emergency Contact"
          placeholder="+1 234 567 8900"
          error={errors.emergencyContactNumber?.message}
          {...register('emergencyContactNumber')}
        />
        <TextInput
          id="emp-date-of-birth"
          type="date"
          label="Date of Birth"
          error={errors.dateOfBirth?.message}
          {...register('dateOfBirth')}
        />
      </SimpleGrid>
      <NativeSelect
        id="emp-gender"
        label="Gender"
        data={GENDER_OPTIONS}
        error={errors.gender?.message}
        {...register('gender', {setValueAs: (v: string) => v || undefined})}
      />
      <Textarea
        id="emp-address"
        label="Address"
        rows={2}
        placeholder="Street address"
        error={errors.address?.message}
        {...register('address')}
      />
      <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
        <TextInput id="emp-city" label="City" error={errors.city?.message} {...register('city')}/>
        <TextInput id="emp-state" label="State/Province" error={errors.state?.message} {...register('state')}/>
        <TextInput id="emp-postal-code" label="Postal Code" error={errors.postalCode?.message} {...register('postalCode')}/>
        <TextInput id="emp-country" label="Country" error={errors.country?.message} {...register('country')}/>
      </SimpleGrid>
    </div>
  );
}

interface EmploymentFieldsProps {
  form: Form;
  departments: DepartmentOption[];
  managers: ManagerOption[];
}

export function EmploymentFields({form, departments, managers}: EmploymentFieldsProps) {
  const {register, control, formState: {errors}} = form;
  const managerOptions = managers.map((m) => ({value: m.id, label: `${m.fullName} (${m.employeeCode})`}));

  return (
    <div className="flex flex-col gap-4">
      <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
        <TextInput
          id="emp-designation"
          label="Designation"
          withAsterisk
          placeholder="Senior Software Engineer"
          error={errors.designation?.message}
          {...register('designation')}
        />
        <NativeSelect
          id="emp-employment-type"
          label="Employment Type"
          withAsterisk
          data={EMPLOYMENT_TYPE_OPTIONS}
          error={errors.employmentType?.message}
          {...register('employmentType')}
        />
      </SimpleGrid>
      <Controller
        name="departmentId"
        control={control}
        render={({field}) => (
          <NativeSelect
            id="emp-department"
            label="Department"
            withAsterisk
            data={[
              {value: '', label: 'Select Department'},
              ...departments.map((d) => ({value: d.id, label: `${d.name} (${d.code})`})),
            ]}
            error={errors.departmentId?.message}
            {...field}
          />
        )}
      />
      <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
        <NativeSelect
          id="emp-level"
          label="Employee Level"
          data={LEVEL_OPTIONS}
          error={errors.level?.message}
          {...register('level', {setValueAs: (v: string) => v || undefined})}
        />
        <Controller
          name="jobRole"
          control={control}
          render={({field}) => (
            <Select
              id="emp-job-role"
              label="Job Role"
              placeholder="Search roles"
              data={JOB_ROLE_GROUPS}
              searchable
              clearable
              nothingFoundMessage="No matching role"
              error={errors.jobRole?.message}
              name={field.name}
              ref={field.ref}
              value={field.value || null}
              onChange={(value) => field.onChange(value ?? undefined)}
              onBlur={field.onBlur}
            />
          )}
        />
        <TextInput
          id="emp-joining-date"
          type="date"
          label="Joining Date"
          withAsterisk
          error={errors.joiningDate?.message}
          {...register('joiningDate')}
        />
        <TextInput
          id="emp-confirmation-date"
          type="date"
          label="Confirmation Date"
          error={errors.confirmationDate?.message}
          {...register('confirmationDate')}
        />
      </SimpleGrid>
      <Controller
        name="managerId"
        control={control}
        render={({field}) => (
          <NativeSelect
            id="emp-manager"
            label="Reporting Manager"
            description="Select “Self” for top-level employees who don't report to anyone."
            data={[
              {value: '', label: 'Select Manager'},
              {value: 'SELF', label: 'Self (No Reporting Manager)'},
              ...managerOptions,
            ]}
            error={errors.managerId?.message}
            {...field}
          />
        )}
      />
      <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
        <NativeSelect
          id="emp-dotted-manager-1"
          label={optional('Dotted-Line Manager 1')}
          data={[{value: '', label: 'None'}, ...managerOptions]}
          {...register('dottedLineManager1Id')}
        />
        <NativeSelect
          id="emp-dotted-manager-2"
          label={optional('Dotted-Line Manager 2')}
          data={[{value: '', label: 'None'}, ...managerOptions]}
          {...register('dottedLineManager2Id')}
        />
      </SimpleGrid>
      <Text size="xs" c="dimmed">
        Dotted-line managers represent matrix reporting relationships. They are informational only and do not
        participate in approval workflows.
      </Text>
    </div>
  );
}

export function BankingFields({form}: { form: Form }) {
  const {register, formState: {errors}} = form;
  return (
    <div className="flex flex-col gap-4">
      <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
        <TextInput
          id="emp-bank-account"
          label="Bank Account Number"
          placeholder="1234567890"
          error={errors.bankAccountNumber?.message}
          {...register('bankAccountNumber')}
        />
        <TextInput
          id="emp-bank-name"
          label="Bank Name"
          placeholder="Bank of America"
          error={errors.bankName?.message}
          {...register('bankName')}
        />
        <TextInput
          id="emp-bank-ifsc"
          label="IFSC Code / Routing Number"
          placeholder="HDFC0001234"
          error={errors.bankIfscCode?.message}
          {...register('bankIfscCode')}
        />
        <TextInput
          id="emp-tax-id"
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
