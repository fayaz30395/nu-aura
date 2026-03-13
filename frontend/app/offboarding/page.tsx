'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserMinus,
  Search,
  Plus,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  User,
  Building,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  Briefcase,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Card,
  CardContent,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/ui';
import { exitService } from '@/lib/services/exit.service';
import { ExitProcess, CreateExitProcessRequest, UpdateExitProcessRequest, ExitType, ExitStatus } from '@/lib/types/exit';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { extractContent, extractPaginationMeta, isPageResponse } from '@/lib/utils/type-guards';

const getExitTypeLabel = (type: ExitType | string | null | undefined) => {
  if (!type) {
    return 'Unknown';
  }
  switch (type) {
    case ExitType.RESIGNATION:
      return 'Resignation';
    case ExitType.TERMINATION:
      return 'Termination';
    case ExitType.RETIREMENT:
      return 'Retirement';
    case ExitType.END_OF_CONTRACT:
      return 'End of Contract';
    case ExitType.ABSCONDING:
      return 'Absconding';
    default:
      return String(type);
  }
};

const getStatusColor = (status: ExitStatus | string | null | undefined) => {
  if (!status) {
    return 'bg-gray-100 text-gray-700 dark:bg-surface-950 dark:text-gray-300';
  }
  switch (status) {
    case ExitStatus.INITIATED:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case ExitStatus.IN_PROGRESS:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    case ExitStatus.CLEARANCE_PENDING:
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case ExitStatus.COMPLETED:
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case ExitStatus.CANCELLED:
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-surface-950 dark:text-gray-300';
  }
};

const getExitTypeColor = (type: ExitType | string | null | undefined) => {
  if (!type) {
    return 'bg-gray-100 text-gray-700 dark:bg-surface-950 dark:text-gray-300';
  }
  switch (type) {
    case ExitType.RESIGNATION:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case ExitType.TERMINATION:
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case ExitType.RETIREMENT:
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case ExitType.END_OF_CONTRACT:
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
    case ExitType.ABSCONDING:
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-surface-950 dark:text-gray-300';
  }
};

const formatDate = (date: string | undefined) => {
  if (!date) return '-';
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return '-';
  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatStatusLabel = (status: ExitStatus | string | null | undefined) => {
  if (!status) return 'Unknown';
  return String(status).replace(/_/g, ' ');
};

const formatCurrency = (amount: number | undefined) => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function OffboardingPage() {
  const router = useRouter();
  const { isAuthenticated, user, hasHydrated } = useAuth();
  const [exitProcesses, setExitProcesses] = useState<ExitProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<ExitProcess | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateExitProcessRequest>({
    employeeId: '',
    exitType: ExitType.RESIGNATION,
    resignationDate: '',
    lastWorkingDate: '',
    noticePeriodDays: 30,
    reasonForLeaving: '',
    newCompany: '',
    newDesignation: '',
    status: ExitStatus.INITIATED,
    rehireEligible: true,
    notes: '',
  });

  const fetchExitProcesses = useCallback(async () => {
    if (!hasHydrated || !isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await exitService.getAllExitProcesses(currentPage, 20);
      // Use type-safe extraction utilities
      const content = extractContent<ExitProcess>(response);
      let filteredProcesses = content.filter((item): item is ExitProcess => Boolean(item));

      // Client-side filtering
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredProcesses = filteredProcesses.filter(
          (p: ExitProcess) =>
            p.employeeName?.toLowerCase().includes(query) ||
            p.reasonForLeaving?.toLowerCase().includes(query) ||
            p.newCompany?.toLowerCase().includes(query)
        );
      }
      if (statusFilter) {
        filteredProcesses = filteredProcesses.filter((p: ExitProcess) => p.status === statusFilter);
      }
      if (typeFilter) {
        filteredProcesses = filteredProcesses.filter((p: ExitProcess) => p.exitType === typeFilter);
      }

      setExitProcesses(filteredProcesses);
      const paginationMeta = extractPaginationMeta(response);
      setTotalElements(paginationMeta.totalElements || content.length);
      setTotalPages(paginationMeta.totalPages || 1);
    } catch (err: any) {
      console.error('Error fetching exit processes:', err);
      setError(err.response?.data?.message || 'Failed to load exit processes');
      setExitProcesses([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, typeFilter, currentPage, isAuthenticated, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      try {
        router.push('/auth/login');
      } catch (err) {
        console.error('Navigation error:', err);
        window.location.href = '/auth/login';
      }
      return;
    }
    fetchExitProcesses();
  }, [fetchExitProcesses, isAuthenticated, hasHydrated, router]);

  const resetForm = () => {
    setFormData({
      employeeId: '',
      exitType: ExitType.RESIGNATION,
      resignationDate: '',
      lastWorkingDate: '',
      noticePeriodDays: 30,
      reasonForLeaving: '',
      newCompany: '',
      newDesignation: '',
      status: ExitStatus.INITIATED,
      rehireEligible: true,
      notes: '',
    });
    setIsEditing(false);
    setSelectedProcess(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (process: ExitProcess) => {
    setSelectedProcess(process);
    setIsEditing(true);
    setFormData({
      employeeId: process.employeeId,
      exitType: process.exitType,
      resignationDate: process.resignationDate || '',
      lastWorkingDate: process.lastWorkingDate || '',
      noticePeriodDays: process.noticePeriodDays,
      reasonForLeaving: process.reasonForLeaving || '',
      newCompany: process.newCompany || '',
      newDesignation: process.newDesignation || '',
      status: process.status,
      rehireEligible: process.rehireEligible,
      notes: process.notes || '',
    });
    setShowAddModal(true);
  };

  const handleViewDetails = (process: ExitProcess) => {
    setSelectedProcess(process);
    setShowDetailModal(true);
  };

  const handleDeleteClick = (process: ExitProcess) => {
    setSelectedProcess(process);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing && selectedProcess) {
        const updateData: UpdateExitProcessRequest = { ...formData };
        await exitService.updateExitProcess(selectedProcess.id, updateData);
      } else {
        await exitService.createExitProcess(formData);
      }
      setShowAddModal(false);
      resetForm();
      fetchExitProcesses();
    } catch (err: any) {
      console.error('Error saving exit process:', err);
      setError(err.response?.data?.message || 'Failed to save exit process');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProcess) return;
    setDeleting(true);
    try {
      await exitService.deleteExitProcess(selectedProcess.id);
      setShowDeleteModal(false);
      setSelectedProcess(null);
      fetchExitProcesses();
    } catch (err: any) {
      console.error('Error deleting exit process:', err);
      setError(err.response?.data?.message || 'Failed to delete exit process');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (process: ExitProcess, newStatus: ExitStatus) => {
    try {
      await exitService.updateExitStatus(process.id, newStatus);
      fetchExitProcesses();
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Stats
  const stats = {
    total: totalElements,
    initiated: exitProcesses.filter((p) => p.status === ExitStatus.INITIATED).length,
    inProgress: exitProcesses.filter((p) => p.status === ExitStatus.IN_PROGRESS).length,
    clearancePending: exitProcesses.filter((p) => p.status === ExitStatus.CLEARANCE_PENDING).length,
    completed: exitProcesses.filter((p) => p.status === ExitStatus.COMPLETED).length,
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Offboarding' },
  ];

  if (loading && exitProcesses.length === 0) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="offboarding">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <span className="ml-2 text-surface-600 dark:text-surface-400">Loading exit processes...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="offboarding">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
              Exit Management
            </h1>
            <p className="text-surface-600 dark:text-surface-400">
              Manage employee offboarding and exit processes
            </p>
          </div>
          <Button onClick={handleOpenAddModal}>
            <Plus className="h-4 w-4 mr-2" />
            Initiate Exit
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
                <Button size="sm" variant="outline" onClick={fetchExitProcesses} className="ml-auto">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary-100 p-3 dark:bg-primary-900">
                  <UserMinus className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Total Exits</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900">
                  <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Initiated</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.initiated}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">In Progress</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900">
                  <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Clearance Pending</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.clearancePending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Completed</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search by employee name, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value={ExitStatus.INITIATED}>Initiated</option>
            <option value={ExitStatus.IN_PROGRESS}>In Progress</option>
            <option value={ExitStatus.CLEARANCE_PENDING}>Clearance Pending</option>
            <option value={ExitStatus.COMPLETED}>Completed</option>
            <option value={ExitStatus.CANCELLED}>Cancelled</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Types</option>
            <option value={ExitType.RESIGNATION}>Resignation</option>
            <option value={ExitType.TERMINATION}>Termination</option>
            <option value={ExitType.RETIREMENT}>Retirement</option>
            <option value={ExitType.END_OF_CONTRACT}>End of Contract</option>
            <option value={ExitType.ABSCONDING}>Absconding</option>
          </select>
        </div>

        {/* Exit Processes Table */}
        {exitProcesses.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-50 dark:bg-surface-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Exit Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Last Working Day
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Notice Period
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Rehire Eligible
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-surface-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                    {exitProcesses.map((process) => (
                      <tr key={process.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-surface-200 dark:bg-surface-700 p-2">
                              <User className="h-5 w-5 text-surface-600 dark:text-surface-400" />
                            </div>
                            <div>
                              <p className="font-medium text-surface-900 dark:text-white">
                                {process.employeeName || 'Employee'}
                              </p>
                              {process.newCompany && (
                                <p className="text-xs text-surface-500">Moving to: {process.newCompany}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getExitTypeColor(process.exitType)}`}>
                            {getExitTypeLabel(process.exitType)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(process.status)}`}>
                            {formatStatusLabel(process.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-surface-600 dark:text-surface-400">
                            {formatDate(process.lastWorkingDate)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-surface-600 dark:text-surface-400">
                            {process.noticePeriodServed || 0} / {process.noticePeriodDays || 0} days
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {process.rehireEligible ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <div className="relative group inline-block">
                            <button className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700">
                              <MoreVertical className="h-4 w-4 text-surface-400" />
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                              <button
                                onClick={() => handleViewDetails(process)}
                                className="w-full px-3 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(process)}
                                className="w-full px-3 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>
                              {process.status === ExitStatus.INITIATED && (
                                <button
                                  onClick={() => handleStatusChange(process, ExitStatus.IN_PROGRESS)}
                                  className="w-full px-3 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                                >
                                  <Clock className="h-4 w-4" />
                                  Start Process
                                </button>
                              )}
                              {process.status === ExitStatus.IN_PROGRESS && (
                                <button
                                  onClick={() => handleStatusChange(process, ExitStatus.CLEARANCE_PENDING)}
                                  className="w-full px-3 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 flex items-center gap-2"
                                >
                                  <FileText className="h-4 w-4" />
                                  Request Clearance
                                </button>
                              )}
                              {process.status === ExitStatus.CLEARANCE_PENDING && (
                                <button
                                  onClick={() => handleStatusChange(process, ExitStatus.COMPLETED)}
                                  className="w-full px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Complete
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteClick(process)}
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          !loading && (
            <Card>
              <CardContent className="p-12 text-center">
                <UserMinus className="h-12 w-12 mx-auto text-surface-400 mb-4" />
                <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
                  No Exit Processes Found
                </h3>
                <p className="text-surface-600 dark:text-surface-400 mb-4">
                  {searchQuery || statusFilter || typeFilter
                    ? 'No exit processes match your search criteria.'
                    : 'No employees are currently in the offboarding process.'}
                </p>
                {!searchQuery && !statusFilter && !typeFilter && (
                  <Button onClick={handleOpenAddModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Initiate Exit
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-surface-600 dark:text-surface-400">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}

        {/* Add/Edit Exit Process Modal */}
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              {isEditing ? 'Edit Exit Process' : 'Initiate Exit Process'}
            </h2>
          </ModalHeader>
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                    placeholder="Enter employee ID"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Exit Type *
                    </label>
                    <select
                      required
                      value={formData.exitType}
                      onChange={(e) => setFormData({ ...formData, exitType: e.target.value as ExitType })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value={ExitType.RESIGNATION}>Resignation</option>
                      <option value={ExitType.TERMINATION}>Termination</option>
                      <option value={ExitType.RETIREMENT}>Retirement</option>
                      <option value={ExitType.END_OF_CONTRACT}>End of Contract</option>
                      <option value={ExitType.ABSCONDING}>Absconding</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as ExitStatus })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value={ExitStatus.INITIATED}>Initiated</option>
                      <option value={ExitStatus.IN_PROGRESS}>In Progress</option>
                      <option value={ExitStatus.CLEARANCE_PENDING}>Clearance Pending</option>
                      <option value={ExitStatus.COMPLETED}>Completed</option>
                      <option value={ExitStatus.CANCELLED}>Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Resignation Date
                    </label>
                    <input
                      type="date"
                      value={formData.resignationDate}
                      onChange={(e) => setFormData({ ...formData, resignationDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Last Working Day
                    </label>
                    <input
                      type="date"
                      value={formData.lastWorkingDate}
                      onChange={(e) => setFormData({ ...formData, lastWorkingDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Notice Period (days)
                  </label>
                  <input
                    type="number"
                    value={formData.noticePeriodDays || ''}
                    onChange={(e) => setFormData({ ...formData, noticePeriodDays: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Reason for Leaving
                  </label>
                  <textarea
                    rows={3}
                    value={formData.reasonForLeaving}
                    onChange={(e) => setFormData({ ...formData, reasonForLeaving: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Reason for leaving..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      New Company
                    </label>
                    <input
                      type="text"
                      value={formData.newCompany}
                      onChange={(e) => setFormData({ ...formData, newCompany: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="New company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      New Designation
                    </label>
                    <input
                      type="text"
                      value={formData.newDesignation}
                      onChange={(e) => setFormData({ ...formData, newDesignation: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="New designation"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rehireEligible"
                    checked={formData.rehireEligible}
                    onChange={(e) => setFormData({ ...formData, rehireEligible: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-surface-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="rehireEligible" className="text-sm text-surface-700 dark:text-surface-300">
                    Eligible for Rehire
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : isEditing ? (
                  'Update'
                ) : (
                  'Initiate Exit'
                )}
              </Button>
            </ModalFooter>
          </form>
        </Modal>

        {/* Exit Process Detail Modal */}
        <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} size="lg">
          <ModalHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-surface-200 dark:bg-surface-700 p-2">
                <User className="h-6 w-6 text-surface-600 dark:text-surface-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
                  {selectedProcess?.employeeName || 'Employee'}
                </h2>
                <p className="text-sm text-surface-500">Exit Process Details</p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedProcess && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedProcess.status)}`}>
                    {formatStatusLabel(selectedProcess.status)}
                  </span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getExitTypeColor(selectedProcess.exitType)}`}>
                    {getExitTypeLabel(selectedProcess.exitType)}
                  </span>
                  {selectedProcess.rehireEligible && (
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      Rehire Eligible
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Resignation Date
                    </p>
                    <p className="text-lg font-semibold text-surface-900 dark:text-white">
                      {formatDate(selectedProcess.resignationDate)}
                    </p>
                  </div>
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Last Working Day
                    </p>
                    <p className="text-lg font-semibold text-surface-900 dark:text-white">
                      {formatDate(selectedProcess.lastWorkingDate)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Notice Period
                    </p>
                    <p className="text-lg font-semibold text-surface-900 dark:text-white">
                      {selectedProcess.noticePeriodServed || 0} / {selectedProcess.noticePeriodDays || 0} days
                    </p>
                  </div>
                  {selectedProcess.finalSettlementAmount && (
                    <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                      <p className="text-sm text-surface-500 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Settlement Amount
                      </p>
                      <p className="text-lg font-semibold text-surface-900 dark:text-white">
                        {formatCurrency(selectedProcess.finalSettlementAmount)}
                      </p>
                    </div>
                  )}
                </div>

                {selectedProcess.reasonForLeaving && (
                  <div>
                    <h4 className="text-sm font-medium text-surface-500 mb-1">Reason for Leaving</h4>
                    <p className="text-surface-700 dark:text-surface-300">
                      {selectedProcess.reasonForLeaving}
                    </p>
                  </div>
                )}

                {(selectedProcess.newCompany || selectedProcess.newDesignation) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedProcess.newCompany && (
                      <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                        <p className="text-sm text-surface-500 flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          New Company
                        </p>
                        <p className="text-lg font-semibold text-surface-900 dark:text-white">
                          {selectedProcess.newCompany}
                        </p>
                      </div>
                    )}
                    {selectedProcess.newDesignation && (
                      <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                        <p className="text-sm text-surface-500 flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          New Designation
                        </p>
                        <p className="text-lg font-semibold text-surface-900 dark:text-white">
                          {selectedProcess.newDesignation}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedProcess.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-surface-500 mb-1">Notes</h4>
                    <p className="text-surface-700 dark:text-surface-300">
                      {selectedProcess.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowDetailModal(false);
              if (selectedProcess) handleOpenEditModal(selectedProcess);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </ModalFooter>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="sm">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              Delete Exit Process
            </h2>
          </ModalHeader>
          <ModalBody>
            <p className="text-surface-600 dark:text-surface-400">
              Are you sure you want to delete the exit process for <strong>{selectedProcess?.employeeName || 'this employee'}</strong>? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}
