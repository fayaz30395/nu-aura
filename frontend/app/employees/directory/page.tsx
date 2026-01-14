'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Users,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  X,
  MessageCircle,
  UserCircle,
  Loader2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { getInitials } from '@/lib/utils';

interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  personalEmail: string;
  workEmail: string;
  phoneNumber: string;
  departmentId: string;
  departmentName: string;
  designation: string;
  jobRole: string;
  level: string;
  employmentType: string;
  managerId: string;
  managerName: string;
  joiningDate: string;
  exitDate: string;
  status: string;
  profileImageUrl: string;
}

interface SearchFilters {
  searchTerm: string;
  departmentIds: string[];
  jobRoles: string[];
  levels: string[];
  employmentTypes: string[];
  statuses: string[];
  page: number;
  size: number;
  sortBy: string;
  sortDirection: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

const jobRoleOptions = [
  { value: 'ENGINEER', label: 'Engineer' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'DESIGNER', label: 'Designer' },
  { value: 'ANALYST', label: 'Analyst' },
  { value: 'HR', label: 'HR' },
  { value: 'SALES', label: 'Sales' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'SUPPORT', label: 'Support' },
  { value: 'OTHER', label: 'Other' },
];

const levelOptions = [
  { value: 'INTERN', label: 'Intern' },
  { value: 'JUNIOR', label: 'Junior' },
  { value: 'MID', label: 'Mid-Level' },
  { value: 'SENIOR', label: 'Senior' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'PRINCIPAL', label: 'Principal' },
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'VP', label: 'VP' },
  { value: 'C_LEVEL', label: 'C-Level' },
];

const statusOptions = [
  { value: 'ACTIVE', label: 'Active', color: 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400' },
  { value: 'INACTIVE', label: 'Inactive', color: 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-400' },
  { value: 'ON_LEAVE', label: 'On Leave', color: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400' },
  { value: 'PROBATION', label: 'Probation', color: 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400' },
  { value: 'TERMINATED', label: 'Terminated', color: 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400' },
];

export default function TeamDirectory() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    departmentIds: [],
    jobRoles: [],
    levels: [],
    employmentTypes: [],
    statuses: ['ACTIVE'],
    page: 0,
    size: 12,
    sortBy: 'fullName',
    sortDirection: 'ASC',
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    searchEmployees();
  }, [filters.page, filters.sortBy, filters.sortDirection]);

  const fetchDepartments = async () => {
    try {
      const response = await apiClient.get<{ content: Department[] }>('/departments', {
        params: { page: 0, size: 100 },
      });
      setDepartments(response.data.content || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const searchEmployees = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post<{
        content: Employee[];
        totalPages: number;
        totalElements: number;
      }>('/employees/directory/search', filters);

      setEmployees(response.data.content || []);
      setTotalPages(response.data.totalPages || 0);
      setTotalElements(response.data.totalElements || 0);
    } catch (error) {
      console.error('Error searching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters({ ...filters, page: 0 });
    searchEmployees();
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  const clearFilters = () => {
    setFilters({
      ...filters,
      departmentIds: [],
      jobRoles: [],
      levels: [],
      employmentTypes: [],
      statuses: ['ACTIVE'],
      page: 0,
    });
  };

  const getStatusColor = (status: string) => {
    const found = statusOptions.find((s) => s.value === status);
    return found?.color || 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-400';
  };



  const getRandomColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500',
    ];
    const index = name?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

  return (
    <AppLayout activeMenuItem="team-directory">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-3">
                <Users className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                Team Directory
              </h1>
              <p className="text-surface-500 dark:text-surface-400 mt-1">
                Search and connect with colleagues across the organization
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-colors ${viewMode === 'grid'
                    ? 'bg-primary-100 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400'
                    : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'
                  }`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-colors ${viewMode === 'list'
                    ? 'bg-primary-100 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400'
                    : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'
                  }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-6">
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-surface-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name, email, phone, or employee code..."
                    className="w-full pl-12 pr-4 py-3 border border-surface-200 dark:border-surface-700 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-50 transition-all"
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium shadow-sm hover:shadow-md"
                >
                  Search
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-3 border rounded-xl transition-colors flex items-center gap-2 ${showFilters
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400'
                      : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300'
                    }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {(filters.departmentIds.length > 0 ||
                    filters.jobRoles.length > 0 ||
                    filters.levels.length > 0) && (
                      <span className="w-2 h-2 bg-primary-600 rounded-full" />
                    )}
                </button>
              </div>

              {/* Advanced Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 border-t border-surface-100 dark:border-surface-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Department Filter */}
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                            Department
                          </label>
                          <select
                            className="w-full border border-surface-200 dark:border-surface-700 rounded-xl p-2.5 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50"
                            value={filters.departmentIds[0] || ''}
                            onChange={(e) =>
                              handleFilterChange(
                                'departmentIds',
                                e.target.value ? [e.target.value] : []
                              )
                            }
                          >
                            <option value="">All Departments</option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Job Role Filter */}
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                            Job Role
                          </label>
                          <select
                            className="w-full border border-surface-200 dark:border-surface-700 rounded-xl p-2.5 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50"
                            value={filters.jobRoles[0] || ''}
                            onChange={(e) =>
                              handleFilterChange('jobRoles', e.target.value ? [e.target.value] : [])
                            }
                          >
                            <option value="">All Roles</option>
                            {jobRoleOptions.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Level Filter */}
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                            Level
                          </label>
                          <select
                            className="w-full border border-surface-200 dark:border-surface-700 rounded-xl p-2.5 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50"
                            value={filters.levels[0] || ''}
                            onChange={(e) =>
                              handleFilterChange('levels', e.target.value ? [e.target.value] : [])
                            }
                          >
                            <option value="">All Levels</option>
                            {levelOptions.map((level) => (
                              <option key={level.value} value={level.value}>
                                {level.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                            Status
                          </label>
                          <select
                            className="w-full border border-surface-200 dark:border-surface-700 rounded-xl p-2.5 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50"
                            value={filters.statuses[0] || ''}
                            onChange={(e) =>
                              handleFilterChange('statuses', e.target.value ? [e.target.value] : [])
                            }
                          >
                            <option value="">All Statuses</option>
                            {statusOptions.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end mt-4">
                        <button
                          onClick={clearFilters}
                          className="text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
                        >
                          Clear all filters
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results Count */}
              <div className="mt-4 flex items-center justify-between text-sm text-surface-600 dark:text-surface-400">
                <span>
                  Found <strong className="text-surface-900 dark:text-surface-50">{totalElements}</strong>{' '}
                  employee{totalElements !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <span>Sort by:</span>
                  <select
                    className="border-0 bg-transparent font-medium text-surface-900 dark:text-surface-50 focus:ring-0 cursor-pointer"
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  >
                    <option value="fullName">Name</option>
                    <option value="joiningDate">Joining Date</option>
                    <option value="departmentId">Department</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Employee Grid/List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {employees.map((employee, index) => (
                  <motion.div
                    key={employee.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedEmployee(employee)}
                  >
                    <Card
                      isClickable
                      className="bg-white dark:bg-surface-900 overflow-hidden cursor-pointer group"
                    >
                      {/* Card Header with gradient */}
                      <div className={`h-20 ${getRandomColor(employee.fullName)} relative`}>
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
                          <div className="w-16 h-16 rounded-full bg-white dark:bg-surface-900 p-1 shadow-lg">
                            <div
                              className={`w-full h-full rounded-full ${getRandomColor(
                                employee.fullName
                              )} flex items-center justify-center text-white text-lg font-semibold`}
                            >
                              {getInitials(employee.fullName)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Content */}
                      <CardContent className="pt-12 pb-4 px-4 text-center">
                        <h3 className="font-semibold text-surface-900 dark:text-surface-50 text-lg">
                          {employee.fullName}
                        </h3>
                        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                          {employee.designation || employee.jobRole}
                        </p>

                        <div className="mt-3 flex justify-center">
                          <span
                            className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              employee.status
                            )}`}
                          >
                            {employee.status}
                          </span>
                        </div>

                        {employee.departmentName && (
                          <div className="mt-3 flex items-center justify-center gap-1 text-sm text-surface-500 dark:text-surface-400">
                            <Building2 className="w-4 h-4" />
                            <span>{employee.departmentName}</span>
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div className="mt-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {employee.personalEmail && (
                            <a
                              href={`mailto:${employee.personalEmail}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                          {employee.phoneNumber && (
                            <a
                              href={`tel:${employee.phoneNumber}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="bg-white dark:bg-surface-900 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-surface-50 dark:bg-surface-800/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                      {employees.map((employee, index) => (
                        <motion.tr
                          key={employee.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => setSelectedEmployee(employee)}
                          className="hover:bg-surface-50 dark:hover:bg-surface-800/50 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-full ${getRandomColor(
                                  employee.fullName
                                )} flex items-center justify-center text-white font-medium`}
                              >
                                {getInitials(employee.fullName)}
                              </div>
                              <div>
                                <p className="font-medium text-surface-900 dark:text-surface-50">
                                  {employee.fullName}
                                </p>
                                <p className="text-sm text-surface-500 dark:text-surface-400">
                                  {employee.employeeCode}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-surface-900 dark:text-surface-50">
                              {employee.departmentName || '-'}
                            </p>
                            <p className="text-sm text-surface-500 dark:text-surface-400">
                              {employee.designation || employee.jobRole}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-surface-900 dark:text-surface-50 text-sm">
                              {employee.personalEmail || '-'}
                            </p>
                            <p className="text-sm text-surface-500 dark:text-surface-400">
                              {employee.phoneNumber || '-'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                employee.status
                              )}`}
                            >
                              {employee.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {employee.personalEmail && (
                                <a
                                  href={`mailto:${employee.personalEmail}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-2 text-surface-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                  <Mail className="w-4 h-4" />
                                </a>
                              )}
                              {employee.phoneNumber && (
                                <a
                                  href={`tel:${employee.phoneNumber}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-2 text-surface-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                >
                                  <Phone className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </motion.div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 0}
                  className="p-2 border border-surface-200 dark:border-surface-700 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-surface-600 dark:text-surface-400" />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum =
                    filters.page < 3
                      ? i
                      : filters.page > totalPages - 3
                        ? totalPages - 5 + i
                        : filters.page - 2 + i;
                  if (pageNum < 0 || pageNum >= totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-10 h-10 rounded-xl font-medium transition-colors ${filters.page === pageNum
                          ? 'bg-primary-500 text-white'
                          : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                        }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page >= totalPages - 1}
                  className="p-2 border border-surface-200 dark:border-surface-700 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-surface-600 dark:text-surface-400" />
                </button>
              </div>
            )}

            {/* Empty State */}
            {employees.length === 0 && !loading && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-surface-900 dark:text-surface-50 mb-2">
                  No employees found
                </h3>
                <p className="text-surface-500 dark:text-surface-400">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </>
        )}

        {/* Employee Detail Modal */}
        <AnimatePresence>
          {selectedEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setSelectedEmployee(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className={`h-24 ${getRandomColor(selectedEmployee.fullName)} relative`}>
                  <button
                    onClick={() => setSelectedEmployee(null)}
                    className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                    <div className="w-24 h-24 rounded-full bg-white dark:bg-surface-900 p-1 shadow-lg">
                      <div
                        className={`w-full h-full rounded-full ${getRandomColor(
                          selectedEmployee.fullName
                        )} flex items-center justify-center text-white text-2xl font-bold`}
                      >
                        {getInitials(selectedEmployee.fullName)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="pt-16 pb-6 px-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                      {selectedEmployee.fullName}
                    </h2>
                    <p className="text-surface-500 dark:text-surface-400">
                      {selectedEmployee.designation || selectedEmployee.jobRole}
                    </p>
                    <div className="mt-2 flex justify-center">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          selectedEmployee.status
                        )}`}
                      >
                        {selectedEmployee.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedEmployee.departmentName && (
                      <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                        <Building2 className="w-5 h-5 text-surface-400" />
                        <div>
                          <p className="text-xs text-surface-500 dark:text-surface-400">Department</p>
                          <p className="font-medium text-surface-900 dark:text-surface-50">
                            {selectedEmployee.departmentName}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedEmployee.personalEmail && (
                      <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                        <Mail className="w-5 h-5 text-surface-400" />
                        <div className="flex-1">
                          <p className="text-xs text-surface-500 dark:text-surface-400">Email</p>
                          <p className="font-medium text-surface-900 dark:text-surface-50">
                            {selectedEmployee.personalEmail}
                          </p>
                        </div>
                        <a
                          href={`mailto:${selectedEmployee.personalEmail}`}
                          className="px-3 py-1.5 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 transition-colors"
                        >
                          Send Email
                        </a>
                      </div>
                    )}

                    {selectedEmployee.phoneNumber && (
                      <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                        <Phone className="w-5 h-5 text-surface-400" />
                        <div className="flex-1">
                          <p className="text-xs text-surface-500 dark:text-surface-400">Phone</p>
                          <p className="font-medium text-surface-900 dark:text-surface-50">
                            {selectedEmployee.phoneNumber}
                          </p>
                        </div>
                        <a
                          href={`tel:${selectedEmployee.phoneNumber}`}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Call
                        </a>
                      </div>
                    )}

                    {selectedEmployee.managerName && (
                      <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                        <UserCircle className="w-5 h-5 text-surface-400" />
                        <div>
                          <p className="text-xs text-surface-500 dark:text-surface-400">Reports To</p>
                          <p className="font-medium text-surface-900 dark:text-surface-50">
                            {selectedEmployee.managerName}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedEmployee.joiningDate && (
                      <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                        <Calendar className="w-5 h-5 text-surface-400" />
                        <div>
                          <p className="text-xs text-surface-500 dark:text-surface-400">Joined</p>
                          <p className="font-medium text-surface-900 dark:text-surface-50">
                            {new Date(selectedEmployee.joiningDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => setSelectedEmployee(null)}
                      className="flex-1 px-4 py-2.5 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors font-medium"
                    >
                      Close
                    </button>
                    <a
                      href={`/employees/${selectedEmployee.id}`}
                      className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium text-center"
                    >
                      View Full Profile
                    </a>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
