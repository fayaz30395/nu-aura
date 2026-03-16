'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  useExitProcesses,
  useCreateExitProcess,
  useUpdateExitProcess,
  useDeleteExitProcess,
  useUpdateExitStatus,
} from '@/lib/hooks/queries/useExit';
import { ExitProcess, CreateExitProcessRequest, UpdateExitProcessRequest, ExitType, ExitStatus } from '@/lib/types/exit';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { extractContent } from '@/lib/utils/type-guards';

const exitProcessFormSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID required'),
  exitType: z.string().min(1, 'Exit type required'),
  resignationDate: z.string().optional().or(z.literal('')),
  lastWorkingDate: z.string().optional().or(z.literal('')),
  noticePeriodDays: z.number({ coerce: true }).min(0, 'Notice period must be non-negative'),
  reasonForLeaving: z.string().optional().or(z.literal('')),
  newCompany: z.string().optional().or(z.literal('')),
  newDesignation: z.string().optional().or(z.literal('')),
  status: z.string().min(1, 'Status required'),
  rehireEligible: z.boolean().default(true),
  notes: z.string().optional().or(z.literal('')),
});

type ExitProcessFormData = z.infer<typeof exitProcessFormSchema>;

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
    return 'bg-[var(--bg-surface)] text-gray-700 dark:bg-[var(--bg-primary)] dark:text-gray-300';
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
      return 'bg-[var(--bg-surface)] text-gray-700 dark:bg-[var(--bg-primary)] dark:text-gray-300';
  }
};

const getExitTypeColor = (type: ExitType | string | null | undefined) => {
  if (!type) {
    return 'bg-[var(--bg-surface)] text-gray-700 dark:bg-[var(--bg-primary)] dark:text-gray-300';
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
      return 'bg-[var(--bg-surface)] text-gray-700 dark:bg-[var(--bg-primary)] dark:text-gray-300';
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
  const { data: exitResponse } = useExitProcesses(0, 20);
  const createMutation = useCreateExitProcess();
  const updateMutation = useUpdateExitProcess();
  const deleteMutation = useDeleteExitProcess();
  const updateStatusMutation = useUpdateExitStatus();

  // Extract content from paginated response
  const exitProcessesData = extractContent<ExitProcess>(exitResponse) || [];

  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<ExitProcess | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form setup
  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<ExitProcessFormData>({
    resolver: zodResolver(exitProcessFormSchema),
    defaultValues: {
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
    },
  });

  // Client-side filtering
  let filteredProcesses = exitProcessesData.filter((item): item is ExitProcess => Boolean(item));

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

  React.useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      try {
        router.push('/auth/login');
      } catch (err) {
        console.error('Navigation error:', err);
        window.location.href = '/auth/login';
      }
    }
  }, [isAuthenticated, hasHydrated, router]);

  const resetFormState = () => {
    resetForm();
    setIsEditing(false);
    setSelectedProcess(null);
  };

  const handleOpenAddModal = () => {
    resetFormState();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (process: ExitProcess) => {
    setSelectedProcess(process);
    setIsEditing(true);
    setValue('employeeId', process.employeeId);
    setValue('exitType', process.exitType as unknown as string);
    setValue('resignationDate', process.resignationDate || '');
    setValue('lastWorkingDate', process.lastWorkingDate || '');
    setValue('noticePeriodDays', process.noticePeriodDays);
    setValue('reasonForLeaving', process.reasonForLeaving || '');
    setValue('newCompany', process.newCompany || '');
    setValue('newDesignation', process.newDesignation || '');
    setValue('status', process.status as unknown as string);
    setValue('rehireEligible', process.rehireEligible);
    setValue('notes', process.notes || '');
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

  const onSubmit = async (data: ExitProcessFormData) => {
    try {
      if (isEditing && selectedProcess) {
        const updateData: UpdateExitProcessRequest = {
          exitType: data.exitType as ExitType,
          resignationDate: data.resignationDate || undefined,
          lastWorkingDate: data.lastWorkingDate || undefined,
          noticePeriodDays: data.noticePeriodDays,
          reasonForLeaving: data.reasonForLeaving || undefined,
          newCompany: data.newCompany || undefined,
          newDesignation: data.newDesignation || undefined,
          status: data.status as ExitStatus,
          rehireEligible: data.rehireEligible,
          notes: data.notes || undefined,
        };
        await updateMutation.mutateAsync({ id: selectedProcess.id, data: updateData });
      } else {
        const createData: CreateExitProcessRequest = {
          employeeId: data.employeeId,
          exitType: data.exitType as ExitType,
          resignationDate: data.resignationDate || undefined,
          lastWorkingDate: data.lastWorkingDate || undefined,
          noticePeriodDays: data.noticePeriodDays,
          reasonForLeaving: data.reasonForLeaving || undefined,
          newCompany: data.newCompany || undefined,
          newDesignation: data.newDesignation || undefined,
          status: data.status as ExitStatus,
          rehireEligible: data.rehireEligible,
          notes: data.notes || undefined,
        };
        await createMutation.mutateAsync(createData);
      }
      setShowAddModal(false);
      resetFormState();
    } catch (err: unknown) {
      console.error('Error saving exit process:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save exit process');
    }
  };

  // Removed fetchExitProcesses call - React Query handles this automatically

  const handleDelete = async () => {
    if (!selectedProcess) return;
    try {
      await deleteMutation.mutateAsync(selectedProcess.id);
      setShowDeleteModal(false);
      setSelectedProcess(null);
    } catch (err: unknown) {
      console.error('Error deleting exit process:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete exit process');
    }
  };

  const handleStatusChange = async (process: ExitProcess, newStatus: ExitStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id: process.id, status: newStatus });
    } catch (err: unknown) {
      console.error('Error updating status:', err);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update status');
    }
  };

  // Stats
  const stats = {
    total: filteredProcesses.length,
    initiated: filteredProcesses.filter((p) => p.status === ExitStatus.INITIATED).length,
    inProgress: filteredProcesses.filter((p) => p.status === ExitStatus.IN_PROGRESS).length,
    clearancePending: filteredProcesses.filter((p) => p.status === ExitStatus.CLEARANCE_PENDING).length,
    completed: filteredProcesses.filter((p) => p.status === ExitStatus.COMPLETED).length,
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Offboarding' },
  ];

  if (!exitResponse && filteredProcesses.length === 0) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="offboarding">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <span className="ml-2 text-[var(--text-secondary)]">Loading exit processes...</span>
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
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Exit Management
            </h1>
            <p className="text-[var(--text-secondary)]">
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
                  <p className="text-sm text-[var(--text-secondary)]">Total Exits</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
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
                  <p className="text-sm text-[var(--text-secondary)]">Initiated</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.initiated}</p>
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
                  <p className="text-sm text-[var(--text-secondary)]">In Progress</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.inProgress}</p>
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
                  <p className="text-sm text-[var(--text-secondary)]">Clearance Pending</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.clearancePending}</p>
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
                  <p className="text-sm text-[var(--text-secondary)]">Completed</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by employee name, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            className="px-4 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
        {filteredProcesses.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Exit Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Last Working Day
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Notice Period
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Rehire Eligible
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                    {filteredProcesses.map((process: ExitProcess) => (
                      <tr key={process.id} className="hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] p-2">
                              <User className="h-5 w-5 text-[var(--text-secondary)]" />
                            </div>
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">
                                {process.employeeName || 'Employee'}
                              </p>
                              {process.newCompany && (
                                <p className="text-xs text-[var(--text-muted)]">Moving to: {process.newCompany}</p>
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
                          <span className="text-sm text-[var(--text-secondary)]">
                            {formatDate(process.lastWorkingDate)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-sm text-[var(--text-secondary)]">
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
                            <button className="p-1 rounded hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]">
                              <MoreVertical className="h-4 w-4 text-[var(--text-muted)]" />
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                              <button
                                onClick={() => handleViewDetails(process)}
                                className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(process)}
                                className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>
                              {process.status === ExitStatus.INITIATED && (
                                <button
                                  onClick={() => handleStatusChange(process, ExitStatus.IN_PROGRESS)}
                                  className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                                >
                                  <Clock className="h-4 w-4" />
                                  Start Process
                                </button>
                              )}
                              {process.status === ExitStatus.IN_PROGRESS && (
                                <button
                                  onClick={() => handleStatusChange(process, ExitStatus.CLEARANCE_PENDING)}
                                  className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-2"
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
          exitResponse && (
            <Card>
              <CardContent className="p-12 text-center">
                <UserMinus className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  No Exit Processes Found
                </h3>
                <p className="text-[var(--text-secondary)] mb-4">
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


        {/* Add/Edit Exit Process Modal */}
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {isEditing ? 'Edit Exit Process' : 'Initiate Exit Process'}
            </h2>
          </ModalHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    disabled={isEditing}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                    placeholder="Enter employee ID"
                    {...register('employeeId')}
                  />
                  {errors.employeeId && <span className="text-red-500 text-sm">{errors.employeeId.message}</span>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Exit Type *
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      {...register('exitType')}
                    >
                      <option value={ExitType.RESIGNATION}>Resignation</option>
                      <option value={ExitType.TERMINATION}>Termination</option>
                      <option value={ExitType.RETIREMENT}>Retirement</option>
                      <option value={ExitType.END_OF_CONTRACT}>End of Contract</option>
                      <option value={ExitType.ABSCONDING}>Absconding</option>
                    </select>
                    {errors.exitType && <span className="text-red-500 text-sm">{errors.exitType.message}</span>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Status
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      {...register('status')}
                    >
                      <option value={ExitStatus.INITIATED}>Initiated</option>
                      <option value={ExitStatus.IN_PROGRESS}>In Progress</option>
                      <option value={ExitStatus.CLEARANCE_PENDING}>Clearance Pending</option>
                      <option value={ExitStatus.COMPLETED}>Completed</option>
                      <option value={ExitStatus.CANCELLED}>Cancelled</option>
                    </select>
                    {errors.status && <span className="text-red-500 text-sm">{errors.status.message}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Resignation Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      {...register('resignationDate')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      Last Working Day
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      {...register('lastWorkingDate')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Notice Period (days)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="30"
                    {...register('noticePeriodDays')}
                  />
                  {errors.noticePeriodDays && <span className="text-red-500 text-sm">{errors.noticePeriodDays.message}</span>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Reason for Leaving
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Reason for leaving..."
                    {...register('reasonForLeaving')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      New Company
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="New company name"
                      {...register('newCompany')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      New Designation
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="New designation"
                      {...register('newDesignation')}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rehireEligible"
                    className="w-4 h-4 text-primary-600 border-[var(--border-main)] rounded focus:ring-primary-500"
                    {...register('rehireEligible')}
                  />
                  <label htmlFor="rehireEligible" className="text-sm text-[var(--text-secondary)]">
                    Eligible for Rehire
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Additional notes..."
                    {...register('notes')}
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
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
              <div className="rounded-full bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] p-2">
                <User className="h-6 w-6 text-[var(--text-secondary)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {selectedProcess?.employeeName || 'Employee'}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">Exit Process Details</p>
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
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Resignation Date
                    </p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {formatDate(selectedProcess.resignationDate)}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Last Working Day
                    </p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {formatDate(selectedProcess.lastWorkingDate)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Notice Period
                    </p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {selectedProcess.noticePeriodServed || 0} / {selectedProcess.noticePeriodDays || 0} days
                    </p>
                  </div>
                  {selectedProcess.finalSettlementAmount && (
                    <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                      <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Settlement Amount
                      </p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {formatCurrency(selectedProcess.finalSettlementAmount)}
                      </p>
                    </div>
                  )}
                </div>

                {selectedProcess.reasonForLeaving && (
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-muted)] mb-1">Reason for Leaving</h4>
                    <p className="text-[var(--text-secondary)]">
                      {selectedProcess.reasonForLeaving}
                    </p>
                  </div>
                )}

                {(selectedProcess.newCompany || selectedProcess.newDesignation) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedProcess.newCompany && (
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                        <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          New Company
                        </p>
                        <p className="text-lg font-semibold text-[var(--text-primary)]">
                          {selectedProcess.newCompany}
                        </p>
                      </div>
                    )}
                    {selectedProcess.newDesignation && (
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                        <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          New Designation
                        </p>
                        <p className="text-lg font-semibold text-[var(--text-primary)]">
                          {selectedProcess.newDesignation}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedProcess.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-muted)] mb-1">Notes</h4>
                    <p className="text-[var(--text-secondary)]">
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
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Delete Exit Process
            </h2>
          </ModalHeader>
          <ModalBody>
            <p className="text-[var(--text-secondary)]">
              Are you sure you want to delete the exit process for <strong>{selectedProcess?.employeeName || 'this employee'}</strong>? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? (
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
