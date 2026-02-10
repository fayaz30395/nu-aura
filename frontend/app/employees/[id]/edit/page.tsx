'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { employeeService } from '@/lib/services/employee.service';
import { departmentService } from '@/lib/services/department.service';
import { employmentChangeRequestService } from '@/lib/services/employment-change-request.service';
import { Employee, UpdateEmployeeRequest, Department, Gender, EmploymentType, EmployeeLevel, JobRole, EmployeeStatus } from '@/lib/types/employee';
import { toGender, toEmploymentType, toEmployeeLevel, toJobRole, toEmployeeStatus } from '@/lib/utils/type-guards';
import { CreateEmploymentChangeRequest } from '@/lib/types/employment-change-request';
import CustomFieldsSection from '@/components/custom-fields/CustomFieldsSection';
import { EntityType, CustomFieldValueRequest } from '@/lib/types/custom-fields';
import { customFieldsApi } from '@/lib/api/custom-fields';
import { AppLayout } from '@/components/layout';
import { AlertCircle, Clock } from 'lucide-react';

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('basic');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, CustomFieldValueRequest>>({});
  const [changeRequestCreated, setChangeRequestCreated] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState('');

  const [formData, setFormData] = useState<UpdateEmployeeRequest>({
    employeeCode: '',
    firstName: '',
    middleName: '',
    lastName: '',
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
    departmentId: undefined,
    employmentType: undefined,
    confirmationDate: '',
    managerId: '',
    status: undefined,
    bankAccountNumber: '',
    bankName: '',
    bankIfscCode: '',
    taxId: '',
  });

  useEffect(() => {
    loadEmployee();
    loadManagers();
    loadDepartments();
  }, [employeeId]);

  const loadEmployee = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeService.getEmployee(employeeId);
      setEmployee(data);

      // Pre-populate form data
      setFormData({
        employeeCode: data.employeeCode,
        firstName: data.firstName,
        middleName: data.middleName || '',
        lastName: data.lastName || '',
        personalEmail: data.personalEmail || '',
        phoneNumber: data.phoneNumber || '',
        emergencyContactNumber: data.emergencyContactNumber || '',
        dateOfBirth: data.dateOfBirth || '',
        gender: data.gender,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        postalCode: data.postalCode || '',
        country: data.country || '',
        designation: data.designation,
        level: data.level,
        jobRole: data.jobRole,
        departmentId: data.departmentId,
        employmentType: data.employmentType,
        confirmationDate: data.confirmationDate || '',
        managerId: data.managerId || '',
        status: data.status,
        bankAccountNumber: data.bankAccountNumber || '',
        bankName: data.bankName || '',
        bankIfscCode: data.bankIfscCode || '',
        taxId: data.taxId || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load employee');
      console.error('Error loading employee:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      const response = await employeeService.getAllEmployees(0, 100);
      setManagers(response.content);
    } catch (err: any) {
      console.error('Error loading managers:', err);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentService.getActiveDepartments();
      setDepartments(response);
    } catch (err: any) {
      console.error('Error loading departments:', err);
    }
  };

  // Check if employment fields have changed (these require HR approval)
  const hasEmploymentFieldChanges = (): boolean => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setChangeRequestCreated(false);

      // Check if employment fields have changed
      const employmentChanges = hasEmploymentFieldChanges();

      // Build employment change request if needed
      if (employmentChanges && employee) {
        const changeRequest: CreateEmploymentChangeRequest = {
          employeeId: employeeId,
          reason: changeRequestReason || 'Employment details update',
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

      await employeeService.updateEmployee(employeeId, submitData);

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

      if (employmentChanges) {
        // Show success message for change request, don't navigate away
        setSaving(false);
      } else {
        router.push(`/employees/${employeeId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update employee');
      console.error('Error updating employee:', err);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout activeMenuItem="employees">
        <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-surface-600 dark:text-surface-400">Loading employee details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error && !employee) {
    return (
      <AppLayout activeMenuItem="employees">
        <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
          <nav className="bg-surface-0 dark:bg-surface-800 shadow-sm border-b border-surface-200 dark:border-surface-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.push('/employees')}
                    className="text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">Edit Employee</h1>
                </div>
              </div>
            </div>
          </nav>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="employees">
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
        {/* Navigation Bar */}
        <nav className="bg-surface-0 dark:bg-surface-800 shadow-sm border-b border-surface-200 dark:border-surface-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(`/employees/${employeeId}`)}
                  className="text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">Edit Employee</h1>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Change Request Success Message */}
        {changeRequestCreated && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Employment Change Request Submitted
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Your changes to employment details have been submitted for HR Manager approval.
                  Other profile updates have been saved immediately.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/employees/${employeeId}`)}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  >
                    View Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/employees/change-requests')}
                    className="px-3 py-1.5 bg-white dark:bg-green-800 text-green-700 dark:text-green-200 text-sm rounded border border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-700 transition-colors"
                  >
                    View All Requests
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Employee Header */}
        <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 h-16 w-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <span className="text-xl font-medium text-primary-700 dark:text-primary-400">
                {employee?.firstName.charAt(0)}{employee?.lastName?.charAt(0) || ''}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">{employee?.fullName}</h2>
              <p className="text-sm text-surface-600 dark:text-surface-400">{employee?.employeeCode}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm">
          {/* Tabs */}
          <div className="border-b border-surface-200 dark:border-surface-700">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setCurrentTab('basic')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'basic'
                    ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                    : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-300 dark:hover:border-surface-600'
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setCurrentTab('personal')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'personal'
                    ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                    : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-300 dark:hover:border-surface-600'
                }`}
              >
                Personal Details
              </button>
              <button
                onClick={() => setCurrentTab('employment')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'employment'
                    ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                    : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-300 dark:hover:border-surface-600'
                }`}
              >
                Employment
              </button>
              <button
                onClick={() => setCurrentTab('bank')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'bank'
                    ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                    : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-300 dark:hover:border-surface-600'
                }`}
              >
                Banking & Tax
              </button>
              <button
                onClick={() => setCurrentTab('custom')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'custom'
                    ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                    : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-300 dark:hover:border-surface-600'
                }`}
              >
                Additional Info
              </button>
            </nav>
          </div>

          <form className="p-6 space-y-6" onSubmit={handleSubmit}>
            {/* Basic Info Tab */}
            {currentTab === 'basic' && (
              <div className="space-y-4">
                <div className="bg-primary-50 dark:bg-primary-950/30 border border-primary-500 dark:border-primary-500 rounded-md p-4">
                  <p className="text-sm text-primary-600 dark:text-primary-400">
                    <strong>Note:</strong> Work Email cannot be changed after creation.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface-0 dark:bg-surface-800 text-surface-900 dark:text-surface-100"
                    placeholder="EMP001"
                  />
                  <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                    Unique identifier for this employee. Changing this may affect integrations.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={formData.middleName}
                      onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Status *
                  </label>
                  <select
                    required
                    value={formData.status || ''}
                    onChange={(e) => setFormData({ ...formData, status: toEmployeeStatus(e.target.value) })}
                    className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="ON_NOTICE">On Notice</option>
                    <option value="TERMINATED">Terminated</option>
                    <option value="RESIGNED">Resigned</option>
                  </select>
                </div>
              </div>
            )}

            {/* Personal Details Tab */}
            {currentTab === 'personal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Personal Email
                    </label>
                    <input
                      type="email"
                      value={formData.personalEmail}
                      onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="personal@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Emergency Contact
                    </label>
                    <input
                      type="tel"
                      value={formData.emergencyContactNumber}
                      onChange={(e) => setFormData({ ...formData, emergencyContactNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => setFormData({ ...formData, gender: toGender(e.target.value) })}
                    className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                    <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Street address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      State/Province
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Employment Tab */}
            {currentTab === 'employment' && (
              <div className="space-y-4">
                {/* Approval Notice */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-md p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        HR Manager Approval Required
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Changes to employment details (designation, level, department, manager, etc.)
                        will be submitted for HR Manager approval before they take effect.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Change Reason */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Reason for Changes
                  </label>
                  <textarea
                    value={changeRequestReason}
                    onChange={(e) => setChangeRequestReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Please provide a reason for the employment changes (e.g., Promotion, Role change, Transfer)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Designation *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Senior Software Engineer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Employment Type *
                    </label>
                    <select
                      required
                      value={formData.employmentType || ''}
                      onChange={(e) => setFormData({ ...formData, employmentType: toEmploymentType(e.target.value) })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Type</option>
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="INTERN">Intern</option>
                      <option value="CONSULTANT">Consultant</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.departmentId || ''}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Employee Level
                    </label>
                    <select
                      value={formData.level || ''}
                      onChange={(e) => setFormData({ ...formData, level: toEmployeeLevel(e.target.value) })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Job Role
                    </label>
                    <select
                      value={formData.jobRole || ''}
                      onChange={(e) => setFormData({ ...formData, jobRole: toJobRole(e.target.value) })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Confirmation Date
                    </label>
                    <input
                      type="date"
                      value={formData.confirmationDate}
                      onChange={(e) => setFormData({ ...formData, confirmationDate: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Reporting Manager *
                    </label>
                    <select
                      required
                      value={formData.managerId}
                      onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface-0 dark:bg-surface-800 text-surface-900 dark:text-surface-100"
                    >
                      <option value="">Select Manager</option>
                      <option value={employeeId}>Self (No Reporting Manager)</option>
                      {managers.filter(m => m.id !== employeeId).map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.fullName} ({manager.employeeCode})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                      Select &quot;Self&quot; for top-level employees who don&apos;t report to anyone.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Banking & Tax Tab */}
            {currentTab === 'bank' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="1234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Bank of America"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      IFSC Code / Routing Number
                    </label>
                    <input
                      type="text"
                      value={formData.bankIfscCode}
                      onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="HDFC0001234"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Tax ID / SSN
                    </label>
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="XXX-XX-XXXX"
                    />
                  </div>
                </div>

                <div className="bg-primary-50 dark:bg-primary-950/30 border border-primary-500 dark:border-primary-500 rounded-md p-4">
                  <p className="text-sm text-primary-600 dark:text-primary-400">
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
            <div className="flex gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
              <button
                type="button"
                onClick={() => router.push(`/employees/${employeeId}`)}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-md text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
    </AppLayout>
  );
}
