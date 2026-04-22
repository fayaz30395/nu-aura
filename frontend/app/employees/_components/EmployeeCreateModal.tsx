'use client';

import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button} from '@/components/ui/Button';
import {createLogger} from '@/lib/utils/logger';
import type {CreateEmployeeRequest, Department, Employee} from '@/lib/types/hrms/employee';

const log = createLogger('EmployeeCreateModal');

const createEmployeeFormSchema = z.object({
  employeeCode: z.string().min(1, 'Employee Code is required'),
  firstName: z.string().min(1, 'First Name is required'),
  middleName: z.string().optional().or(z.literal('')),
  lastName: z.string().optional().or(z.literal('')),
  workEmail: z.string().email('Invalid work email').min(1, 'Work Email is required'),
  personalEmail: z.string().email('Invalid personal email').optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  emergencyContactNumber: z.string().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  designation: z.string().min(1, 'Designation is required'),
  level: z.enum(['ENTRY', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'SENIOR_MANAGER', 'DIRECTOR', 'VP', 'SVP', 'CXO']).optional(),
  jobRole: z.string().optional().or(z.literal('')),
  departmentId: z.string().min(1, 'Department is required'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).default('FULL_TIME'),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'ON_NOTICE', 'TERMINATED', 'RESIGNED']).default('ACTIVE'),
  joiningDate: z.string().min(1, 'Joining Date is required'),
  confirmationDate: z.string().optional().or(z.literal('')),
  managerId: z.string().optional().or(z.literal('')),
  dottedLineManager1Id: z.string().optional().or(z.literal('')),
  dottedLineManager2Id: z.string().optional().or(z.literal('')),
  bankAccountNumber: z.string().optional().or(z.literal('')),
  bankName: z.string().optional().or(z.literal('')),
  bankIfscCode: z.string().optional().or(z.literal('')),
  taxId: z.string().optional().or(z.literal('')),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a digit')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
});

type CreateEmployeeFormData = z.infer<typeof createEmployeeFormSchema>;

type TabKey = 'basic' | 'personal' | 'employment' | 'bank';

export interface EmployeeCreateModalProps {
  departments: Department[];
  managers: Employee[];
  onSubmit: (data: CreateEmployeeRequest) => Promise<void>;
  onClose: () => void;
}

export function EmployeeCreateModal({
                                      departments,
                                      managers,
                                      onSubmit,
                                      onClose,
                                    }: EmployeeCreateModalProps) {
  const [currentTab, setCurrentTab] = useState<TabKey>('basic');

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: {errors, isSubmitting},
  } = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeFormSchema),
    defaultValues: {
      employeeCode: '',
      firstName: '',
      middleName: '',
      lastName: '',
      workEmail: '',
      personalEmail: '',
      phoneNumber: '',
      emergencyContactNumber: '',
      dateOfBirth: '',
      gender: undefined,
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      designation: '',
      level: undefined,
      jobRole: undefined,
      departmentId: '',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      joiningDate: new Date().toISOString().split('T')[0],
      confirmationDate: '',
      managerId: '',
      dottedLineManager1Id: '',
      dottedLineManager2Id: '',
      bankAccountNumber: '',
      bankName: '',
      bankIfscCode: '',
      taxId: '',
      password: '',
    },
  });

  const handleClose = () => {
    onClose();
    reset();
    setCurrentTab('basic');
  };

  const handleFormSubmit = async (data: CreateEmployeeFormData) => {
    const isSelfManaged = data.managerId === 'SELF';

    const submitData = {
      ...data,
      middleName: data.middleName || undefined,
      lastName: data.lastName || undefined,
      personalEmail: data.personalEmail || undefined,
      phoneNumber: data.phoneNumber || undefined,
      emergencyContactNumber: data.emergencyContactNumber || undefined,
      dateOfBirth: data.dateOfBirth || undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      postalCode: data.postalCode || undefined,
      country: data.country || undefined,
      confirmationDate: data.confirmationDate || undefined,
      managerId: isSelfManaged ? undefined : (data.managerId || undefined),
      dottedLineManager1Id: data.dottedLineManager1Id || undefined,
      dottedLineManager2Id: data.dottedLineManager2Id || undefined,
      selfManaged: isSelfManaged,
      bankAccountNumber: data.bankAccountNumber || undefined,
      bankName: data.bankName || undefined,
      bankIfscCode: data.bankIfscCode || undefined,
      taxId: data.taxId || undefined,
      gender: data.gender,
      level: data.level,
      jobRole: data.jobRole || undefined,
      departmentId: data.departmentId,
      employmentType: data.employmentType,
      status: data.status,
    } as CreateEmployeeRequest;

    try {
      await onSubmit(submitData);
      reset();
      setCurrentTab('basic');
    } catch (err: unknown) {
      log.error('Error creating employee:', err);
    }
  };

  const tabButtonClass = (tab: TabKey) =>
    `pb-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-t-sm ${
      currentTab === tab
        ? "border-[var(--accent-primary)] text-accent"
        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] hover:border-[var(--border-main)] dark:hover:border-[var(--border-main)]'
    }`;

  return (
    <div className="fixed inset-0 glass-aura !rounded-none flex items-center justify-center p-4 z-50">
      <div className="skeuo-card rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Add New Employee</h2>
            <button
              onClick={handleClose}
              aria-label="Close add employee dialog"
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 rounded-md"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-[var(--border-main)]">
            <nav className="-mb-px flex space-x-8">
              <button onClick={() => setCurrentTab('basic')} className={tabButtonClass('basic')}>
                Basic Info
              </button>
              <button onClick={() => setCurrentTab('personal')} className={tabButtonClass('personal')}>
                Personal Details
              </button>
              <button onClick={() => setCurrentTab('employment')} className={tabButtonClass('employment')}>
                Employment
              </button>
              <button onClick={() => setCurrentTab('bank')} className={tabButtonClass('bank')}>
                Banking & Tax
              </button>
            </nav>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(handleFormSubmit)}>
            {/* Basic Info Tab */}
            <div className={currentTab === 'basic' ? 'space-y-4' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Employee Code *
                  </label>
                  <input type="text" {...register('employeeCode')} className="input-aura" placeholder="EMP001"/>
                  {errors.employeeCode &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.employeeCode.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Work Email *
                  </label>
                  <input type="email" {...register('workEmail')} className="input-aura"
                         placeholder="employee@company.com"/>
                  {errors.workEmail &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.workEmail.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    First Name *
                  </label>
                  <input type="text" {...register('firstName')} className="input-aura"/>
                  {errors.firstName &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Middle Name
                  </label>
                  <input type="text" {...register('middleName')} className="input-aura"/>
                  {errors.middleName &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.middleName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Last Name
                  </label>
                  <input type="text" {...register('lastName')} className="input-aura"/>
                  {errors.lastName &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.lastName.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Initial Password *
                </label>
                <input type="password" {...register('password')} className="input-aura"
                       placeholder="Employee will change on first login"/>
                {errors.password &&
                  <p className='text-status-danger-text text-xs mt-1'>{errors.password.message}</p>}
              </div>
            </div>

            {/* Personal Details Tab */}
            <div className={currentTab === 'personal' ? 'space-y-4' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Personal Email
                  </label>
                  <input type="email" {...register('personalEmail')} className="input-aura"
                         placeholder="personal@email.com"/>
                  {errors.personalEmail &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.personalEmail.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Phone Number
                  </label>
                  <input type="tel" {...register('phoneNumber')} className="input-aura"
                         placeholder="+1 234 567 8900"/>
                  {errors.phoneNumber &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.phoneNumber.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Emergency Contact
                  </label>
                  <input type="tel" {...register('emergencyContactNumber')} className="input-aura"
                         placeholder="+1 234 567 8900"/>
                  {errors.emergencyContactNumber && <p
                    className='text-status-danger-text text-xs mt-1'>{errors.emergencyContactNumber.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Date of Birth
                  </label>
                  <input type="date" {...register('dateOfBirth')} className="input-aura"/>
                  {errors.dateOfBirth &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.dateOfBirth.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Gender</label>
                <Controller
                  name="gender"
                  control={control}
                  render={({field}) => (
                    <select {...field} value={field.value || ''} className="input-aura">
                      <option value="">Select Gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                      <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                    </select>
                  )}
                />
                {errors.gender &&
                  <p className='text-status-danger-text text-xs mt-1'>{errors.gender.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Address</label>
                <textarea rows={2} {...register('address')} className="input-aura min-h-[80px] py-2"
                          placeholder="Street address"/>
                {errors.address &&
                  <p className='text-status-danger-text text-xs mt-1'>{errors.address.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">City</label>
                  <input type="text" {...register('city')} className="input-aura"/>
                  {errors.city &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.city.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">State/Province</label>
                  <input type="text" {...register('state')} className="input-aura"/>
                  {errors.state &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.state.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Postal Code</label>
                  <input type="text" {...register('postalCode')} className="input-aura"/>
                  {errors.postalCode &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.postalCode.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Country</label>
                  <input type="text" {...register('country')} className="input-aura"/>
                  {errors.country &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.country.message}</p>}
                </div>
              </div>
            </div>

            {/* Employment Tab */}
            <div className={currentTab === 'employment' ? 'space-y-4' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Designation *
                  </label>
                  <input type="text" {...register('designation')} className="input-aura"
                         placeholder="Senior Software Engineer"/>
                  {errors.designation &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.designation.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Employment Type *
                  </label>
                  <Controller
                    name="employmentType"
                    control={control}
                    render={({field}) => (
                      <select {...field} className="input-aura">
                        <option value="FULL_TIME">Full Time</option>
                        <option value="PART_TIME">Part Time</option>
                        <option value="CONTRACT">Contract</option>
                        <option value="INTERN">Intern</option>
                      </select>
                    )}
                  />
                  {errors.employmentType && <p
                    className='text-status-danger-text text-xs mt-1'>{errors.employmentType.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Department *
                </label>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({field}) => (
                    <select {...field} className="input-aura">
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.departmentId &&
                  <p className='text-status-danger-text text-xs mt-1'>{errors.departmentId.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Employee Level
                  </label>
                  <Controller
                    name="level"
                    control={control}
                    render={({field}) => (
                      <select {...field} value={field.value || ''} className="input-aura">
                        <option value="">Select Level</option>
                        <option value="ENTRY">Entry</option>
                        <option value="MID">Mid</option>
                        <option value="SENIOR">Senior</option>
                        <option value="LEAD">Lead</option>
                        <option value="MANAGER">Manager</option>
                        <option value="SENIOR_MANAGER">Senior Manager</option>
                        <option value="DIRECTOR">Director</option>
                        <option value="VP">Vice President</option>
                        <option value="SVP">Senior Vice President</option>
                        <option value="CXO">C-Level Executive</option>
                      </select>
                    )}
                  />
                  {errors.level &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.level.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Job Role
                  </label>
                  <Controller
                    name="jobRole"
                    control={control}
                    render={({field}) => (
                      <select {...field} value={field.value || ''} className="input-aura">
                        <option value="">Select Role</option>
                        <option value="ENGINEER">Engineer</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ANALYST">Analyst</option>
                        <option value="DESIGNER">Designer</option>
                        <option value="SUPPORT">Support</option>
                        <option value="SALES">Sales</option>
                        <option value="MARKETING">Marketing</option>
                        <option value="HR">HR</option>
                        <option value="FINANCE">Finance</option>
                        <option value="OPERATIONS">Operations</option>
                        <option value="OTHER">Other</option>
                      </select>
                    )}
                  />
                  {errors.jobRole &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.jobRole.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Joining Date *
                  </label>
                  <input type="date" {...register('joiningDate')} className="input-aura"/>
                  {errors.joiningDate &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.joiningDate.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Confirmation Date
                  </label>
                  <input type="date" {...register('confirmationDate')} className="input-aura"/>
                  {errors.confirmationDate && <p
                    className='text-status-danger-text text-xs mt-1'>{errors.confirmationDate.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Reporting Manager
                </label>
                <Controller
                  name="managerId"
                  control={control}
                  render={({field}) => (
                    <select {...field} className="input-aura">
                      <option value="">Select Manager</option>
                      <option value="SELF">Self (No Reporting Manager)</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.fullName} ({manager.employeeCode})
                        </option>
                      ))}
                    </select>
                  )}
                />
                <p className="mt-1 text-caption">
                  Select &ldquo;Self&rdquo; for top-level employees who don&apos;t report to anyone.
                </p>
                {errors.managerId &&
                  <p className='text-status-danger-text text-xs mt-1'>{errors.managerId.message}</p>}
              </div>

              {/* Dotted-Line Managers (Optional, Matrix Reporting) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Dotted-Line Manager 1 <span className="text-[var(--text-muted)]">(Optional)</span>
                  </label>
                  <Controller
                    name="dottedLineManager1Id"
                    control={control}
                    render={({field}) => (
                      <select {...field} className="input-aura">
                        <option value="">None</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.fullName} ({manager.employeeCode})
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Dotted-Line Manager 2 <span className="text-[var(--text-muted)]">(Optional)</span>
                  </label>
                  <Controller
                    name="dottedLineManager2Id"
                    control={control}
                    render={({field}) => (
                      <select {...field} className="input-aura">
                        <option value="">None</option>
                        {managers.map((manager) => (
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
                Dotted-line managers represent matrix reporting relationships. They are informational only and do not
                participate in approval workflows.
              </p>
            </div>

            {/* Banking & Tax Tab */}
            <div className={currentTab === 'bank' ? 'space-y-4' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Bank Account Number
                  </label>
                  <input type="text" {...register('bankAccountNumber')} className="input-aura"
                         placeholder="1234567890"/>
                  {errors.bankAccountNumber && <p
                    className='text-status-danger-text text-xs mt-1'>{errors.bankAccountNumber.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Bank Name
                  </label>
                  <input type="text" {...register('bankName')} className="input-aura" placeholder="Bank of America"/>
                  {errors.bankName &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.bankName.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    IFSC Code / Routing Number
                  </label>
                  <input type="text" {...register('bankIfscCode')} className="input-aura" placeholder="HDFC0001234"/>
                  {errors.bankIfscCode &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.bankIfscCode.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Tax ID / SSN
                  </label>
                  <input type="text" {...register('taxId')} className="input-aura" placeholder="XXX-XX-XXXX"/>
                  {errors.taxId &&
                    <p className='text-status-danger-text text-xs mt-1'>{errors.taxId.message}</p>}
                </div>
              </div>

              <div
                className='bg-accent-subtle border border-[var(--accent-primary)] rounded-xl p-4'>
                <p className='text-sm text-accent'>
                  <strong>Note:</strong> Banking and tax information is encrypted and stored securely. This information
                  will be used for payroll processing.
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Employee'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
