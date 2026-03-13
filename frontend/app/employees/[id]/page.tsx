'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { employeeService } from '@/lib/services/employee.service';
import { Employee } from '@/lib/types/employee';
import CustomFieldsSection from '@/components/custom-fields/CustomFieldsSection';
import { EntityType } from '@/lib/types/custom-fields';
import { AppLayout } from '@/components/layout';
import TalentJourneyTab from '@/components/employee/talent-profiles/TalentJourneyTab';

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('basic');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadEmployee();
  }, [employeeId]);

  const loadEmployee = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeService.getEmployee(employeeId);
      setEmployee(data);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load employee');
      console.error('Error loading employee:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await employeeService.deleteEmployee(employeeId);
      router.push('/employees');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete employee');
      console.error('Error deleting employee:', err);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'ON_LEAVE': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'ON_NOTICE': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'TERMINATED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'RESIGNED': return 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-200';
      default: return 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-200';
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatEnumValue = (value?: string) => {
    if (!value) return '-';
    return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

  if (error || !employee) {
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
                  <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">Employee Details</h1>
                </div>
              </div>
            </div>
          </nav>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error || 'Employee not found'}</p>
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
                  onClick={() => router.push('/employees')}
                  className="text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">Employee Details</h1>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/employees/${employeeId}/edit`)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
                >
                  Edit Employee
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Employee Header */}
          <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 h-20 w-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-medium text-primary-700 dark:text-primary-400">
                    {employee.firstName.charAt(0)}{employee.lastName?.charAt(0) || ''}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100">{employee.fullName}</h2>
                  <p className="text-sm text-surface-600 dark:text-surface-400">{employee.designation}</p>
                  <p className="text-sm text-surface-500 dark:text-surface-500">{employee.employeeCode}</p>
                </div>
              </div>
              <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeColor(employee.status)}`}>
                {formatEnumValue(employee.status)}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm">
            <div className="border-b border-surface-200 dark:border-surface-700">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setCurrentTab('basic')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${currentTab === 'basic'
                      ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                      : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-300 dark:hover:border-surface-600'
                    }`}
                >
                  Basic Info
                </button>
                <button
                  onClick={() => setCurrentTab('personal')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${currentTab === 'personal'
                      ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                      : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-300 dark:hover:border-surface-600'
                    }`}
                >
                  Personal Details
                </button>
                <button
                  onClick={() => setCurrentTab('employment')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${currentTab === 'employment'
                      ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                      : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-300 dark:hover:border-surface-600'
                    }`}
                >
                  Employment
                </button>
                <button
                  onClick={() => setCurrentTab('bank')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${currentTab === 'bank'
                      ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                      : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-300 dark:hover:border-surface-600'
                    }`}
                >
                  Banking & Tax
                </button>
                <button
                  onClick={() => setCurrentTab('custom')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${currentTab === 'custom'
                      ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                      : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-300 dark:hover:border-surface-600'
                    }`}
                >
                  Additional Info
                </button>
                <button
                  onClick={() => setCurrentTab('talent')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${currentTab === 'talent'
                      ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                      : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:text-surface-400 dark:hover:text-surface-300 dark:hover:border-surface-600'
                    }`}
                >
                  Talent Journey
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Basic Info Tab */}
              {currentTab === 'basic' && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Employee Code</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.employeeCode}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Work Email</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.workEmail}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">First Name</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.firstName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Middle Name</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.middleName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Last Name</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.lastName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Status</label>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(employee.status)}`}>
                      {formatEnumValue(employee.status)}
                    </span>
                  </div>
                </div>
              )}

              {/* Personal Details Tab */}
              {currentTab === 'personal' && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Personal Email</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.personalEmail || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Phone Number</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.phoneNumber || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Emergency Contact</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.emergencyContactNumber || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Date of Birth</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{formatDate(employee.dateOfBirth)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Gender</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{formatEnumValue(employee.gender)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Address</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.address || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">City</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.city || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">State/Province</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.state || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Postal Code</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.postalCode || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Country</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.country || '-'}</p>
                  </div>
                </div>
              )}

              {/* Employment Tab */}
              {currentTab === 'employment' && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Designation</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.designation}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Employment Type</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{formatEnumValue(employee.employmentType)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Department</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.departmentName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Employee Level</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{formatEnumValue(employee.level)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Job Role</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{formatEnumValue(employee.jobRole)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Reporting Manager</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{employee.managerName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Joining Date</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{formatDate(employee.joiningDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Confirmation Date</label>
                    <p className="text-base text-surface-900 dark:text-surface-100">{formatDate(employee.confirmationDate)}</p>
                  </div>
                  {employee.exitDate && (
                    <div>
                      <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Exit Date</label>
                      <p className="text-base text-surface-900 dark:text-surface-100">{formatDate(employee.exitDate)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Banking & Tax Tab */}
              {currentTab === 'bank' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Bank Account Number</label>
                      <p className="text-base text-surface-900 dark:text-surface-100">{employee.bankAccountNumber || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Bank Name</label>
                      <p className="text-base text-surface-900 dark:text-surface-100">{employee.bankName || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">IFSC Code / Routing Number</label>
                      <p className="text-base text-surface-900 dark:text-surface-100">{employee.bankIfscCode || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Tax ID / SSN</label>
                      <p className="text-base text-surface-900 dark:text-surface-100">{employee.taxId || '-'}</p>
                    </div>
                  </div>
                  <div className="bg-primary-50 dark:bg-primary-950/30 border border-primary-500 dark:border-primary-500 rounded-md p-4">
                    <p className="text-sm text-primary-600 dark:text-primary-400">
                      <strong>Note:</strong> Banking and tax information is encrypted and stored securely.
                    </p>
                  </div>
                </div>
              )}

              {/* Custom Fields Tab */}
              {currentTab === 'custom' && (
                <CustomFieldsSection
                  entityType={EntityType.EMPLOYEE}
                  entityId={employee.id}
                  disabled={true}
                  showGroupHeaders={true}
                />
              )}

              {/* Talent Journey Tab */}
              {currentTab === 'talent' && (
                <TalentJourneyTab employeeId={employeeId} />
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-6 bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-4">System Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Created At</label>
                <p className="text-base text-surface-900 dark:text-surface-100">{formatDate(employee.createdAt)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Last Updated</label>
                <p className="text-base text-surface-900 dark:text-surface-100">{formatDate(employee.updatedAt)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Employee ID</label>
                <p className="text-base text-surface-900 dark:text-surface-100 font-mono text-sm">{employee.id}</p>
              </div>
              {employee.userId && (
                <div>
                  <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">User ID</label>
                  <p className="text-base text-surface-900 dark:text-surface-100 font-mono text-sm">{employee.userId}</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface-0 dark:bg-surface-800 rounded-lg max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="ml-4 text-lg font-medium text-surface-900 dark:text-surface-100">Delete Employee</h3>
              </div>
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
                Are you sure you want to delete <strong>{employee.fullName}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-md text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
