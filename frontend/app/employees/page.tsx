'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { employeeService } from '@/lib/services/employee.service';
import { departmentService } from '@/lib/services/department.service';
import { Employee, CreateEmployeeRequest, Department, Gender, EmploymentType, EmployeeLevel, JobRole } from '@/lib/types/employee';
import { toGender, toEmploymentType, toEmployeeLevel, toJobRole } from '@/lib/utils/type-guards';
import { AppLayout } from '@/components/layout';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function EmployeesPage() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentTab, setCurrentTab] = useState('basic'); // basic, personal, employment, bank
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState<CreateEmployeeRequest>({
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
    departmentId: undefined,
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    joiningDate: new Date().toISOString().split('T')[0],
    confirmationDate: '',
    managerId: '',
    bankAccountNumber: '',
    bankName: '',
    bankIfscCode: '',
    taxId: '',
    password: '',
  });

  useEffect(() => {
    loadEmployees();
    loadManagers();
    loadDepartments();
  }, [statusFilter]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await employeeService.getAllEmployees(0, 100, statusFilter || undefined);
      setEmployees(response.content);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load employees');
      console.error('Error loading employees:', err);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      // Clean up empty optional fields
      // Handle SELF manager - set selfManaged flag for backend to set managerId to employee's own ID
      const isSelfManaged = formData.managerId === 'SELF';

      const submitData: CreateEmployeeRequest = {
        ...formData,
        middleName: formData.middleName || undefined,
        lastName: formData.lastName || undefined,
        personalEmail: formData.personalEmail || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        emergencyContactNumber: formData.emergencyContactNumber || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postalCode: formData.postalCode || undefined,
        country: formData.country || undefined,
        confirmationDate: formData.confirmationDate || undefined,
        managerId: isSelfManaged ? undefined : (formData.managerId || undefined),
        selfManaged: isSelfManaged,
        bankAccountNumber: formData.bankAccountNumber || undefined,
        bankName: formData.bankName || undefined,
        bankIfscCode: formData.bankIfscCode || undefined,
        taxId: formData.taxId || undefined,
      };

      await employeeService.createEmployee(submitData);
      setShowAddModal(false);
      resetForm();
      loadEmployees();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create employee');
      console.error('Error creating employee:', err);
    }
  };

  const resetForm = () => {
    setFormData({
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
      departmentId: undefined,
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      joiningDate: new Date().toISOString().split('T')[0],
      confirmationDate: '',
      managerId: '',
      bankAccountNumber: '',
      bankName: '',
      bankIfscCode: '',
      taxId: '',
      password: '',
    });
    setCurrentTab('basic');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadEmployees();
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await employeeService.searchEmployees(searchQuery);
      setEmployees(response.content);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Search failed');
      console.error('Error searching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;

    try {
      setDeleting(true);
      await employeeService.deleteEmployee(employeeToDelete.id);
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
      loadEmployees();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete employee');
      console.error('Error deleting employee:', err);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'ON_LEAVE': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'TERMINATED': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200';
    }
  };

  return (
    <AppLayout activeMenuItem="employees">
      <motion.div
        className="p-3 sm:p-6 space-y-4 sm:space-y-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-50">Employee Management</h1>
            <p className="text-sm sm:text-base text-surface-600 dark:text-surface-400 mt-1">Manage your organization&apos;s employees</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/employees/change-requests')}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-xl transition-colors"
            >
              Change Requests
            </button>
            <button
              onClick={() => router.push('/employees/import')}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 rounded-xl transition-colors"
            >
              Import
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md shadow-primary-500/25 transition-all whitespace-nowrap"
            >
              + Add Employee
            </button>
          </div>
        </div>
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
            <button
              onClick={handleSearch}
              className="px-3 sm:px-4 py-2 text-sm bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl transition-colors whitespace-nowrap"
            >
              Search
            </button>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 sm:px-4 py-2.5 text-sm border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>

        {/* Employee Table */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-soft border border-surface-200 dark:border-surface-800 overflow-hidden">
          {loading ? (
            <div className="px-6 py-12 text-center text-surface-500 dark:text-surface-400">
              Loading employees...
            </div>
          ) : employees.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title={searchQuery.trim() ? 'No employees match your search' : 'No Employees Found'}
              description={searchQuery.trim() ? 'Try adjusting your search terms' : 'Add your first employee to get started'}
              action={{ label: 'Add Employee', onClick: () => setShowAddModal(true) }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-800">
                <thead className="bg-surface-50 dark:bg-surface-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Designation
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-surface-900 divide-y divide-surface-100 dark:divide-surface-800">
                  {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                            {employee.firstName.charAt(0)}{employee.lastName?.charAt(0) || ''}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-surface-900 dark:text-surface-50">{employee.fullName}</div>
                          <div className="text-sm text-surface-500 dark:text-surface-400">{employee.workEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-surface-900 dark:text-surface-50">{employee.employeeCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-surface-900 dark:text-surface-50">{employee.designation}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-surface-900 dark:text-surface-50">{employee.departmentName || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee.level ? (
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                          {employee.level.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-sm text-surface-400 dark:text-surface-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-surface-900 dark:text-surface-50">{employee.managerName || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-lg ${getStatusBadgeColor(employee.status)}`}>
                        {employee.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => router.push(`/employees/${employee.id}`)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 mr-4 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setEmployeeToDelete(employee);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-[calc(100vw-1rem)] sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-surface-200 dark:border-surface-700 shadow-xl">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-50">Add New Employee</h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b border-surface-200 dark:border-surface-700">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setCurrentTab('basic')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        currentTab === 'basic'
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:border-surface-300 dark:hover:border-surface-600'
                      }`}
                    >
                      Basic Info
                    </button>
                    <button
                      onClick={() => setCurrentTab('personal')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        currentTab === 'personal'
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:border-surface-300 dark:hover:border-surface-600'
                      }`}
                    >
                      Personal Details
                    </button>
                    <button
                      onClick={() => setCurrentTab('employment')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        currentTab === 'employment'
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:border-surface-300 dark:hover:border-surface-600'
                      }`}
                    >
                      Employment
                    </button>
                    <button
                      onClick={() => setCurrentTab('bank')}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        currentTab === 'bank'
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:border-surface-300 dark:hover:border-surface-600'
                      }`}
                    >
                      Banking & Tax
                    </button>
                  </nav>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                  {/* Basic Info Tab */}
                  {currentTab === 'basic' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Employee Code *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.employeeCode}
                            onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="EMP001"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Work Email *
                          </label>
                          <input
                            type="email"
                            required
                            value={formData.workEmail}
                            onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="employee@company.com"
                          />
                        </div>
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Initial Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          placeholder="Employee will change on first login"
                        />
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                          className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                          className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Employment Tab */}
                  {currentTab === 'employment' && (
                    <div className="space-y-4">
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="Senior Software Engineer"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Employment Type *
                          </label>
                          <select
                            required
                            value={formData.employmentType}
                            onChange={(e) => setFormData({ ...formData, employmentType: toEmploymentType(e.target.value) })}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          >
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
                          className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                            Joining Date *
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.joiningDate}
                            onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                            Confirmation Date
                          </label>
                          <input
                            type="date"
                            value={formData.confirmationDate}
                            onChange={(e) => setFormData({ ...formData, confirmationDate: e.target.value })}
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                          Reporting Manager *
                        </label>
                        <select
                          required
                          value={formData.managerId}
                          onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                          className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        >
                          <option value="">Select Manager</option>
                          <option value="SELF">Self (No Reporting Manager)</option>
                          {managers.map((manager) => (
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
                            className="w-full px-3 py-2.5 border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="XXX-XX-XXXX"
                          />
                        </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          <strong>Note:</strong> Banking and tax information is encrypted and stored securely. This information will be used for payroll processing.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        resetForm();
                      }}
                      className="flex-1 px-4 py-2.5 border border-surface-300 dark:border-surface-600 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-md shadow-primary-500/25 transition-all"
                    >
                      Add Employee
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && employeeToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-surface-900 rounded-2xl max-w-md w-full p-6 border border-surface-200 dark:border-surface-700 shadow-xl">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="ml-4 text-lg font-medium text-surface-900 dark:text-surface-50">Delete Employee</h3>
              </div>
              <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
                Are you sure you want to delete <strong className="text-surface-700 dark:text-surface-300">{employeeToDelete.fullName}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEmployeeToDelete(null);
                  }}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 border border-surface-300 dark:border-surface-600 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 shadow-md shadow-red-500/25 transition-all"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}
