'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { employmentChangeRequestService } from '@/lib/services/hrms/employment-change-request.service';
import { UpdateEmployeeRequest } from '@/lib/types/hrms/employee';
import { toGender, toEmploymentType, toEmployeeLevel, toJobRole, toEmployeeStatus } from '@/lib/utils/type-guards';
import { CreateEmploymentChangeRequest } from '@/lib/types/hrms/employment-change-request';
import { useEmployee, useManagers, useUpdateEmployee } from '@/lib/hooks/queries/useEmployees';
import { useActiveDepartments } from '@/lib/hooks/queries/useDepartments';
import CustomFieldsSection from '@/components/custom-fields/CustomFieldsSection';
import { EntityType, CustomFieldValueRequest } from '@/lib/types/core/custom-fields';
import { customFieldsApi } from '@/lib/api/custom-fields';
import { AppLayout } from '@/components/layout';
import { AlertCircle, Clock } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { createLogger } from '@/lib/utils/logger';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';

const log = createLogger('EmployeeEditPage');

// Zod schema for employee form validation
const updateEmployeeFormSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code required'),
  firstName: z.string().min(1, 'First name required'),
  middleName: z.string().optional().or(z.literal('')),
  lastName: z.string().min(1, 'Last name required'),
  personalEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  emergencyContactNumber: z.string().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  designation: z.string().min(1, 'Designation required'),
  level: z.enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'SENIOR_MANAGER', 'DIRECTOR', 'VP', 'SVP', 'CXO']).optional(),
  jobRole: z.enum([
    'SOFTWARE_ENGINEER', 'FRONTEND_DEVELOPER', 'BACKEND_DEVELOPER', 'FULLSTACK_DEVELOPER', 'DEVOPS_ENGINEER',
    'QA_ENGINEER', 'DATA_ENGINEER', 'MOBILE_DEVELOPER', 'SYSTEM_ARCHITECT', 'TECH_LEAD', 'ENGINEERING_MANAGER',
    'PRODUCT_MANAGER', 'PRODUCT_OWNER', 'PRODUCT_ANALYST',
    'UI_DESIGNER', 'UX_DESIGNER', 'GRAPHIC_DESIGNER', 'PRODUCT_DESIGNER',
    'DATA_ANALYST', 'DATA_SCIENTIST', 'BUSINESS_ANALYST',
    'MARKETING_MANAGER', 'CONTENT_WRITER', 'SEO_SPECIALIST', 'SOCIAL_MEDIA_MANAGER', 'DIGITAL_MARKETER',
    'SALES_REPRESENTATIVE', 'SALES_MANAGER', 'ACCOUNT_MANAGER', 'BUSINESS_DEVELOPMENT',
    'OPERATIONS_MANAGER', 'PROJECT_MANAGER', 'SCRUM_MASTER', 'PROGRAM_MANAGER',
    'HR_MANAGER', 'HR_GENERALIST', 'RECRUITER', 'TALENT_ACQUISITION',
    'ACCOUNTANT', 'FINANCIAL_ANALYST', 'FINANCE_MANAGER',
    'ADMIN_ASSISTANT', 'OFFICE_MANAGER', 'CUSTOMER_SUPPORT', 'TECH_SUPPORT',
    'LEGAL_COUNSEL', 'COMPLIANCE_OFFICER',
    'CONSULTANT', 'INTERN', 'OTHER'
  ]).optional(),
  departmentId: z.string().optional().or(z.literal('')),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT']).optional(),
  managerId: z.string().optional().or(z.literal('')),
  dottedLineManager1Id: z.string().optional().or(z.literal('')),
  dottedLineManager2Id: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'ON_NOTICE', 'TERMINATED', 'RESIGNED']).optional(),
  confirmationDate: z.string().optional().or(z.literal('')),
  bankAccountNumber: z.string().optional().or(z.literal('')),
  bankName: z.string().optional().or(z.literal('')),
  bankIfscCode: z.string().optional().or(z.literal('')),
  taxId: z.string().optional().or(z.literal('')),
  changeRequestReason: z.string().optional().or(z.literal('')),
});

type UpdateEmployeeFormData = z.infer<typeof updateEmployeeFormSchema>;

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;
  const { hasPermission, isReady: permissionsReady } = usePermissions();

  // DEF-43: Redirect unauthorized users — prevents PII exposure in pre-populated form
  useEffect(() => {
    if (!permissionsReady) return;
    if (!hasPermission(Permissions.EMPLOYEE_UPDATE)) {
      router.replace('/employees');
    }
  }, [permissionsReady, hasPermission, router]);

  // React Query hooks for data fetching
  const { data: employee, isLoading: employeeLoading, error: employeeError } = useEmployee(employeeId);
  const { data: managersData } = useManagers();
  const { data: departmentsData } = useActiveDepartments();
  const updateEmployeeMutation = useUpdateEmployee();

  const managers = managersData || [];
  const departments = departmentsData || [];
  const loading = employeeLoading;
  const [error, setError] = useState<string | null>(employeeError ? 'Failed to load employee' : null);
  const [currentTab, setCurrentTab] = useState('basic');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, CustomFieldValueRequest>>({});
  const [changeRequestCreated, setChangeRequestCreated] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateEmployeeFormData>({
    resolver: zodResolver(updateEmployeeFormSchema),
  });

  // Pre-populate form when employee data loads from React Query
  useEffect(() => {
    if (employee) {
      reset({
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        middleName: employee.middleName || '',
        lastName: employee.lastName || '',
        personalEmail: employee.personalEmail || '',
        phoneNumber: employee.phoneNumber || '',
        emergencyContactNumber: employee.emergencyContactNumber || '',
        dateOfBirth: employee.dateOfBirth || '',
        gender: employee.gender,
        address: employee.address || '',
        city: employee.city || '',
        state: employee.state || '',
        postalCode: employee.postalCode || '',
        country: employee.country || '',
        designation: employee.designation,
        level: employee.level,
        jobRole: employee.jobRole,
        departmentId: employee.departmentId,
        employmentType: employee.employmentType,
        confirmationDate: employee.confirmationDate || '',
        managerId: employee.managerId || '',
        dottedLineManager1Id: employee.dottedLineManager1Id || '',
        dottedLineManager2Id: employee.dottedLineManager2Id || '',
        status: employee.status,
        bankAccountNumber: employee.bankAccountNumber || '',
        bankName: employee.bankName || '',
        bankIfscCode: employee.bankIfscCode || '',
        taxId: employee.taxId || '',
        changeRequestReason: '',
      });
    }
  }, [employee, reset]);

  // Sync React Query error to local state
  useEffect(() => {
    if (employeeError) {
      setError('Failed to load employee');
    }
  }, [employeeError]);

  // Check if employment fields have changed (these require HR approval)
  const hasEmploymentFieldChanges = (formData: UpdateEmployeeFormData): boolean => {
    if (!employee) return false;
    return (
      formData.designation !== employee.designation ||
      formData.level !== employee.level ||
      formData.jobRole !== employee.jobRole ||
      formData.departmentId !== employee.departmentId ||
      formData.managerId !== (employee.managerId || '') ||
      formData.employmentType !== employee.employmentType ||
      formData.status !== employee.status ||
      formData.confirmationDate !== (employee.confirmationDate || '')
    );
  };

  const onSubmit = async (formData: UpdateEmployeeFormData) => {
    try {
      setError(null);
      setChangeRequestCreated(false);

      // Check if employment fields have changed
      const employmentChanges = hasEmploymentFieldChanges(formData);

      // Build employment change request if needed
      if (employmentChanges && employee) {
        const changeRequest: CreateEmploymentChangeRequest = {
          employeeId: employeeId,
          reason: formData.changeRequestReason || 'Employment details update',
        };

        // Only include fields that have changed
        if (formData.designation !== employee.designation) {
          changeRequest.newDesignation = formData.designation;
        }
        if (formData.level !== employee.level) {
          changeRequest.newLevel = formData.level;
        }
        if (formData.jobRole !== employee.jobRole) {
          changeRequest.newJobRole = formData.jobRole;
        }
        if (formData.departmentId !== employee.departmentId) {
          changeRequest.newDepartmentId = formData.departmentId;
        }
        if (formData.managerId !== (employee.managerId || '')) {
          changeRequest.newManagerId = formData.managerId || undefined;
        }
        if (formData.employmentType !== employee.employmentType) {
          changeRequest.newEmploymentType = formData.employmentType;
        }
        if (formData.status !== employee.status) {
          changeRequest.newEmployeeStatus = formData.status;
        }
        if (formData.confirmationDate !== (employee.confirmationDate || '')) {
          changeRequest.newConfirmationDate = formData.confirmationDate || undefined;
        }

        await employmentChangeRequestService.createChangeRequest(changeRequest);
        setChangeRequestCreated(true);
      }

      // Clean up empty optional fields for non-employment updates
      const submitData: UpdateEmployeeRequest = {
        employeeCode: formData.employeeCode || undefined,
        firstName: formData.firstName,
        middleName: formData.middleName || undefined,
        lastName: formData.lastName || undefined,
        personalEmail: formData.personalEmail || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        emergencyContactNumber: formData.emergencyContactNumber || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postalCode: formData.postalCode || undefined,
        country: formData.country || undefined,
        bankAccountNumber: formData.bankAccountNumber || undefined,
        bankName: formData.bankName || undefined,
        bankIfscCode: formData.bankIfscCode || undefined,
        taxId: formData.taxId || undefined,
        // Dotted-line managers are informational only — always include them directly
        dottedLineManager1Id: formData.dottedLineManager1Id || undefined,
        dottedLineManager2Id: formData.dottedLineManager2Id || undefined,
        // Employment fields: only include if NO change request was created
        // (i.e., they haven't changed from original values)
        ...(employmentChanges ? {} : {
          designation: formData.designation,
          level: formData.level,
          jobRole: formData.jobRole,
          departmentId: formData.departmentId,
          managerId: formData.managerId || undefined,
          employmentType: formData.employmentType,
          status: formData.status,
          confirmationDate: formData.confirmationDate || undefined,
        }),
      };

      await updateEmployeeMutation.mutateAsync({ id: employeeId, data: submitData });

      // Save custom field values if any were modified
      const customFieldValueRequests = Object.values(customFieldValues).filter(
        (v) => v.value !== undefined && v.value !== null && v.value !== ''
      );
      if (customFieldValueRequests.length > 0) {
        await customFieldsApi.setFieldValues({
          entityType: EntityType.EMPLOYEE,
          entityId: employeeId,
          values: customFieldValueRequests,
        });
      }

      notifications.show({ title: 'Success', message: 'Employee updated successfully', color: 'green' });

      if (!employmentChanges) {
        router.push(`/employees/${employeeId}`);
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update employee';
      setError(message);
      notifications.show({ title: 'Error', message, color: 'red' });
      log.error('Error updating employee:', err);
    }
  };

  // DEF-43: Don't render form content until permission is confirmed
  if (!permissionsReady || !hasPermission(Permissions.EMPLOYEE_UPDATE)) {
    return null;
  }

  if (loading) {
    return (
      <AppLayout activeMenuItem="employees">
        <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700"></div>
            <p className="mt-4 text-[var(--text-secondary)]">Loading employee details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error && !employee) {
    return (
      <AppLayout activeMenuItem="employees">
        <div className="min-h-screen bg-[var(--bg-secondary)]">
          <nav className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] shadow-[var(--shadow-card)] border-b border-[var(--border-main)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.push('/employees')}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">Edit Employee</h1>
                </div>
              </div>
            </div>
          </nav>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-md p-4">
              <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="employees">
      <div className="min-h-screen bg-[var(--bg-secondary)]">
        {/* Navigation Bar */}
        <nav className="bg-[var(--bg-card)] dark:bg-[var(--bg-secondary)] shadow-[var(--shadow-card)] border-b border-[var(--border-main)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(`/employees/${employeeId}`)}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">Edit Employee</h1>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-md">
            <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
          </div>
        )}

        {/* Change Request Success Message */}
        {changeRequestCreated && (
          <div className="mb-4 p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-md">
            <div className="flex items-start gap-4">
              <Clock className="h-5 w-5 text-success-600 dark:text-success-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-success-800 dark:text-success-200">
                  Employment Change Request Submitted
                </p>
                <p className="text-sm text-success-700 dark:text-success-300 mt-1">
                  Your changes to employment details have been submitted for HR Manager approval.
                  Other profile updates have been saved immediately.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/employees/${employeeId}`)}
                    className="px-4 py-1.5 bg-success-600 text-white text-sm rounded hover:bg-success-700 transition-colors"
                  >
                    View Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/employees/change-requests')}
                    className="px-4 py-1.5 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-200 text-sm rounded border border-success-300 dark:border-success-600 hover:bg-success-50 dark:hover:bg-success-700 transition-colors"
                  >
                    View All Requests
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Employee Header */}
        <div className="skeuo-card p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 h-16 w-16 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center">
              <span className="text-xl font-medium text-accent-700 dark:text-accent-400">
                {employee?.firstName.charAt(0)}{employee?.lastName?.charAt(0) || ''}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{employee?.fullName}</h2>
              <p className="text-body-secondary">{employee?.employeeCode}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="skeuo-card">
          {/* Tabs */}
          <div className="border-b border-[var(--border-main)]">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setCurrentTab('basic')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'basic'
                    ? 'border-accent-500 text-accent-700 dark:border-accent-400 dark:text-accent-400'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-main)] dark:text-[var(--text-muted)] dark:hover:text-[var(--text-muted)] dark:hover:border-[var(--border-main)]'
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setCurrentTab('personal')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'personal'
                    ? 'border-accent-500 text-accent-700 dark:border-accent-400 dark:text-accent-400'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-main)] dark:text-[var(--text-muted)] dark:hover:text-[var(--text-muted)] dark:hover:border-[var(--border-main)]'
                }`}
              >
                Personal Details
              </button>
              <button
                onClick={() => setCurrentTab('employment')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'employment'
                    ? 'border-accent-500 text-accent-700 dark:border-accent-400 dark:text-accent-400'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-main)] dark:text-[var(--text-muted)] dark:hover:text-[var(--text-muted)] dark:hover:border-[var(--border-main)]'
                }`}
              >
                Employment
              </button>
              <button
                onClick={() => setCurrentTab('bank')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'bank'
                    ? 'border-accent-500 text-accent-700 dark:border-accent-400 dark:text-accent-400'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-main)] dark:text-[var(--text-muted)] dark:hover:text-[var(--text-muted)] dark:hover:border-[var(--border-main)]'
                }`}
              >
                Banking & Tax
              </button>
              <button
                onClick={() => setCurrentTab('custom')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'custom'
                    ? 'border-accent-500 text-accent-700 dark:border-accent-400 dark:text-accent-400'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-main)] dark:text-[var(--text-muted)] dark:hover:text-[var(--text-muted)] dark:hover:border-[var(--border-main)]'
                }`}
              >
                Additional Info
              </button>
            </nav>
          </div>

          <form className="p-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Basic Info Tab */}
            {currentTab === 'basic' && (
              <div className="space-y-4">
                <div className="bg-accent-50 dark:bg-accent-950/30 border border-accent-500 dark:border-accent-500 rounded-md p-4">
                  <p className="text-sm text-accent-700 dark:text-accent-400">
                    <strong>Note:</strong> Work Email cannot be changed after creation.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    required
                    {...register('employeeCode')}
                    className="input-aura"
                    placeholder="EMP001"
                  />
                  {errors.employeeCode && <p className="text-danger-500 text-sm mt-1">{errors.employeeCode.message}</p>}
                  <p className="mt-1 text-caption">
                    Unique identifier for this employee. Changing this may affect integrations.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      {...register('firstName')}
                      className="input-aura"
                    />
                    {errors.firstName && <p className="text-danger-500 text-sm mt-1">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      {...register('middleName')}
                      className="input-aura"
                    />
                    {errors.middleName && <p className="text-danger-500 text-sm mt-1">{errors.middleName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      {...register('lastName')}
                      className="input-aura"
                    />
                    {errors.lastName && <p className="text-danger-500 text-sm mt-1">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Status *
                  </label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <select
                        required
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(toEmployeeStatus(e.target.value) || undefined)}
                        className="input-aura"
                      >
                        <option value="">Select Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="ON_LEAVE">On Leave</option>
                        <option value="ON_NOTICE">On Notice</option>
                        <option value="TERMINATED">Terminated</option>
                        <option value="RESIGNED">Resigned</option>
                      </select>
                    )}
                  />
                  {errors.status && <p className="text-danger-500 text-sm mt-1">{errors.status.message}</p>}
                </div>
              </div>
            )}

            {/* Personal Details Tab */}
            {currentTab === 'personal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Personal Email
                    </label>
                    <input
                      type="email"
                      {...register('personalEmail')}
                      className="input-aura"
                      placeholder="personal@email.com"
                    />
                    {errors.personalEmail && <p className="text-danger-500 text-sm mt-1">{errors.personalEmail.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      {...register('phoneNumber')}
                      className="input-aura"
                      placeholder="+1 234 567 8900"
                    />
                    {errors.phoneNumber && <p className="text-danger-500 text-sm mt-1">{errors.phoneNumber.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Emergency Contact
                    </label>
                    <input
                      type="tel"
                      {...register('emergencyContactNumber')}
                      className="input-aura"
                      placeholder="+1 234 567 8900"
                    />
                    {errors.emergencyContactNumber && <p className="text-danger-500 text-sm mt-1">{errors.emergencyContactNumber.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      {...register('dateOfBirth')}
                      className="input-aura"
                    />
                    {errors.dateOfBirth && <p className="text-danger-500 text-sm mt-1">{errors.dateOfBirth.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Gender
                  </label>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(toGender(e.target.value) || undefined)}
                        className="input-aura"
                      >
                        <option value="">Select Gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                        <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                      </select>
                    )}
                  />
                  {errors.gender && <p className="text-danger-500 text-sm mt-1">{errors.gender.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    {...register('address')}
                    className="input-aura"
                    placeholder="Street address"
                  />
                  {errors.address && <p className="text-danger-500 text-sm mt-1">{errors.address.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      {...register('city')}
                      className="input-aura"
                    />
                    {errors.city && <p className="text-danger-500 text-sm mt-1">{errors.city.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      State/Province
                    </label>
                    <input
                      type="text"
                      {...register('state')}
                      className="input-aura"
                    />
                    {errors.state && <p className="text-danger-500 text-sm mt-1">{errors.state.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      {...register('postalCode')}
                      className="input-aura"
                    />
                    {errors.postalCode && <p className="text-danger-500 text-sm mt-1">{errors.postalCode.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      {...register('country')}
                      className="input-aura"
                    />
                    {errors.country && <p className="text-danger-500 text-sm mt-1">{errors.country.message}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Employment Tab */}
            {currentTab === 'employment' && (
              <div className="space-y-4">
                {/* Approval Notice */}
                <div className="bg-warning-50 dark:bg-warning-950/30 border border-warning-300 dark:border-warning-700 rounded-md p-4">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-5 w-5 text-warning-600 dark:text-warning-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-warning-800 dark:text-warning-200">
                        HR Manager Approval Required
                      </p>
                      <p className="text-sm text-warning-700 dark:text-warning-300 mt-1">
                        Changes to employment details (designation, level, department, manager, etc.)
                        will be submitted for HR Manager approval before they take effect.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Change Reason */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Reason for Changes
                  </label>
                  <textarea
                    {...register('changeRequestReason')}
                    rows={2}
                    className="input-aura"
                    placeholder="Please provide a reason for the employment changes (e.g., Promotion, Role change, Transfer)"
                  />
                  {errors.changeRequestReason && <p className="text-danger-500 text-sm mt-1">{errors.changeRequestReason.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Designation *
                    </label>
                    <input
                      type="text"
                      required
                      {...register('designation')}
                      className="input-aura"
                      placeholder="Senior Software Engineer"
                    />
                    {errors.designation && <p className="text-danger-500 text-sm mt-1">{errors.designation.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Employment Type *
                    </label>
                    <Controller
                      name="employmentType"
                      control={control}
                      render={({ field }) => (
                        <select
                          required
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(toEmploymentType(e.target.value) || undefined)}
                          className="input-aura"
                        >
                          <option value="">Select Type</option>
                          <option value="FULL_TIME">Full Time</option>
                          <option value="PART_TIME">Part Time</option>
                          <option value="CONTRACT">Contract</option>
                          <option value="INTERN">Intern</option>
                          <option value="CONSULTANT">Consultant</option>
                        </select>
                      )}
                    />
                    {errors.employmentType && <p className="text-danger-500 text-sm mt-1">{errors.employmentType.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Department
                  </label>
                  <Controller
                    name="departmentId"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        value={field.value || ''}
                        className="input-aura"
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name} ({dept.code})
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.departmentId && <p className="text-danger-500 text-sm mt-1">{errors.departmentId.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Employee Level
                    </label>
                    <Controller
                      name="level"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(toEmployeeLevel(e.target.value) || undefined)}
                          className="input-aura"
                        >
                          <option value="">Select Level</option>
                          <option value="ENTRY">Entry (Junior/Associate)</option>
                          <option value="MID">Mid-Level</option>
                          <option value="SENIOR">Senior</option>
                          <option value="LEAD">Lead/Principal</option>
                          <option value="MANAGER">Manager</option>
                          <option value="SENIOR_MANAGER">Senior Manager</option>
                          <option value="DIRECTOR">Director</option>
                          <option value="VP">Vice President</option>
                          <option value="SVP">Senior Vice President</option>
                          <option value="CXO">C-Level Executive</option>
                        </select>
                      )}
                    />
                    {errors.level && <p className="text-danger-500 text-sm mt-1">{errors.level.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Job Role
                    </label>
                    <Controller
                      name="jobRole"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(toJobRole(e.target.value) || undefined)}
                          className="input-aura"
                        >
                      <option value="">Select Role</option>
                      <optgroup label="Engineering">
                        <option value="SOFTWARE_ENGINEER">Software Engineer</option>
                        <option value="FRONTEND_DEVELOPER">Frontend Developer</option>
                        <option value="BACKEND_DEVELOPER">Backend Developer</option>
                        <option value="FULLSTACK_DEVELOPER">Fullstack Developer</option>
                        <option value="DEVOPS_ENGINEER">DevOps Engineer</option>
                        <option value="QA_ENGINEER">QA Engineer</option>
                        <option value="DATA_ENGINEER">Data Engineer</option>
                        <option value="MOBILE_DEVELOPER">Mobile Developer</option>
                        <option value="SYSTEM_ARCHITECT">System Architect</option>
                        <option value="TECH_LEAD">Tech Lead</option>
                        <option value="ENGINEERING_MANAGER">Engineering Manager</option>
                      </optgroup>
                      <optgroup label="Product">
                        <option value="PRODUCT_MANAGER">Product Manager</option>
                        <option value="PRODUCT_OWNER">Product Owner</option>
                        <option value="PRODUCT_ANALYST">Product Analyst</option>
                      </optgroup>
                      <optgroup label="Design">
                        <option value="UI_DESIGNER">UI Designer</option>
                        <option value="UX_DESIGNER">UX Designer</option>
                        <option value="GRAPHIC_DESIGNER">Graphic Designer</option>
                        <option value="PRODUCT_DESIGNER">Product Designer</option>
                      </optgroup>
                      <optgroup label="Data & Analytics">
                        <option value="DATA_ANALYST">Data Analyst</option>
                        <option value="DATA_SCIENTIST">Data Scientist</option>
                        <option value="BUSINESS_ANALYST">Business Analyst</option>
                      </optgroup>
                      <optgroup label="Marketing">
                        <option value="MARKETING_MANAGER">Marketing Manager</option>
                        <option value="CONTENT_WRITER">Content Writer</option>
                        <option value="SEO_SPECIALIST">SEO Specialist</option>
                        <option value="SOCIAL_MEDIA_MANAGER">Social Media Manager</option>
                        <option value="DIGITAL_MARKETER">Digital Marketer</option>
                      </optgroup>
                      <optgroup label="Sales">
                        <option value="SALES_REPRESENTATIVE">Sales Representative</option>
                        <option value="SALES_MANAGER">Sales Manager</option>
                        <option value="ACCOUNT_MANAGER">Account Manager</option>
                        <option value="BUSINESS_DEVELOPMENT">Business Development</option>
                      </optgroup>
                      <optgroup label="Operations">
                        <option value="OPERATIONS_MANAGER">Operations Manager</option>
                        <option value="PROJECT_MANAGER">Project Manager</option>
                        <option value="SCRUM_MASTER">Scrum Master</option>
                        <option value="PROGRAM_MANAGER">Program Manager</option>
                      </optgroup>
                      <optgroup label="HR">
                        <option value="HR_MANAGER">HR Manager</option>
                        <option value="HR_GENERALIST">HR Generalist</option>
                        <option value="RECRUITER">Recruiter</option>
                        <option value="TALENT_ACQUISITION">Talent Acquisition</option>
                      </optgroup>
                      <optgroup label="Finance">
                        <option value="ACCOUNTANT">Accountant</option>
                        <option value="FINANCIAL_ANALYST">Financial Analyst</option>
                        <option value="FINANCE_MANAGER">Finance Manager</option>
                      </optgroup>
                      <optgroup label="Admin & Support">
                        <option value="ADMIN_ASSISTANT">Admin Assistant</option>
                        <option value="OFFICE_MANAGER">Office Manager</option>
                        <option value="CUSTOMER_SUPPORT">Customer Support</option>
                        <option value="TECH_SUPPORT">Tech Support</option>
                      </optgroup>
                      <optgroup label="Legal">
                        <option value="LEGAL_COUNSEL">Legal Counsel</option>
                        <option value="COMPLIANCE_OFFICER">Compliance Officer</option>
                      </optgroup>
                      <optgroup label="Other">
                        <option value="CONSULTANT">Consultant</option>
                        <option value="INTERN">Intern</option>
                        <option value="OTHER">Other</option>
                      </optgroup>
                        </select>
                      )}
                    />
                    {errors.jobRole && <p className="text-danger-500 text-sm mt-1">{errors.jobRole.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Confirmation Date
                    </label>
                    <input
                      type="date"
                      {...register('confirmationDate')}
                      className="input-aura"
                    />
                    {errors.confirmationDate && <p className="text-danger-500 text-sm mt-1">{errors.confirmationDate.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Reporting Manager *
                    </label>
                    <Controller
                      name="managerId"
                      control={control}
                      render={({ field }) => (
                        <select
                          required
                          {...field}
                          className="input-aura"
                        >
                          <option value="">Select Manager</option>
                          <option value={employeeId}>Self (No Reporting Manager)</option>
                          {managers.filter(m => m.id !== employeeId).map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.fullName} ({manager.employeeCode})
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.managerId && <p className="text-danger-500 text-sm mt-1">{errors.managerId.message}</p>}
                    <p className="mt-1 text-caption">
                      Select &quot;Self&quot; for top-level employees who don&apos;t report to anyone.
                    </p>
                  </div>
                </div>

                {/* Dotted-Line Managers (Optional, Matrix Reporting) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Dotted-Line Manager 1 <span className="text-[var(--text-muted)]">(Optional)</span>
                    </label>
                    <Controller
                      name="dottedLineManager1Id"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="input-aura"
                        >
                          <option value="">None</option>
                          {managers.filter(m => m.id !== employeeId).map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.fullName} ({manager.employeeCode})
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Dotted-Line Manager 2 <span className="text-[var(--text-muted)]">(Optional)</span>
                    </label>
                    <Controller
                      name="dottedLineManager2Id"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="input-aura"
                        >
                          <option value="">None</option>
                          {managers.filter(m => m.id !== employeeId).map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.fullName} ({manager.employeeCode})
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </div>
                </div>
                <p className="text-caption">
                  Dotted-line managers represent matrix reporting relationships. They are informational only and do not participate in approval workflows.
                </p>
              </div>
            )}

            {/* Banking & Tax Tab */}
            {currentTab === 'bank' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      {...register('bankAccountNumber')}
                      className="input-aura"
                      placeholder="1234567890"
                    />
                    {errors.bankAccountNumber && <p className="text-danger-500 text-sm mt-1">{errors.bankAccountNumber.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      {...register('bankName')}
                      className="input-aura"
                      placeholder="Bank of America"
                    />
                    {errors.bankName && <p className="text-danger-500 text-sm mt-1">{errors.bankName.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      IFSC Code / Routing Number
                    </label>
                    <input
                      type="text"
                      {...register('bankIfscCode')}
                      className="input-aura"
                      placeholder="HDFC0001234"
                    />
                    {errors.bankIfscCode && <p className="text-danger-500 text-sm mt-1">{errors.bankIfscCode.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Tax ID / SSN
                    </label>
                    <input
                      type="text"
                      {...register('taxId')}
                      className="input-aura"
                      placeholder="XXX-XX-XXXX"
                    />
                    {errors.taxId && <p className="text-danger-500 text-sm mt-1">{errors.taxId.message}</p>}
                  </div>
                </div>

                <div className="bg-accent-50 dark:bg-accent-950/30 border border-accent-500 dark:border-accent-500 rounded-md p-4">
                  <p className="text-sm text-accent-700 dark:text-accent-400">
                    <strong>Note:</strong> Banking and tax information is encrypted and stored securely. This information will be used for payroll processing.
                  </p>
                </div>
              </div>
            )}

            {/* Custom Fields Tab */}
            {currentTab === 'custom' && (
              <div className="space-y-4">
                <CustomFieldsSection
                  entityType={EntityType.EMPLOYEE}
                  entityId={employeeId}
                  onChange={setCustomFieldValues}
                  disabled={false}
                  showGroupHeaders={true}
                />
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-4 pt-4 border-t border-[var(--border-main)]">
              <button
                type="button"
                onClick={() => router.push(`/employees/${employeeId}`)}
                disabled={isSubmitting}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 btn-primary !h-auto disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
    </AppLayout>
  );
}
