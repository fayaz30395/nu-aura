'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Download, Edit2, Eye, Loader2, Plus, Search, X} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {AppLayout} from '@/components/layout/AppLayout';
import {Permissions, usePermissions} from '@/lib/hooks/usePermissions';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ResponsiveTable,
  Select,
  TablePagination,
  Textarea,
} from '@/components/ui';
import {
  HrmsProject,
  ProjectCreateRequest,
  ProjectPriority,
  ProjectStatus,
  ProjectType,
  ProjectUpdateRequest,
} from '@/lib/types/hrms/hrms-project';
import {useAuth} from '@/lib/hooks/useAuth';
import {useEmployeeSearch} from '@/lib/hooks/queries/useEmployees';
import {useToast} from '@/components/notifications/ToastProvider';
import {
  useCreateHrmsProject,
  useExportHrmsProjects,
  useHrmsProjects,
  useUpdateHrmsProject,
} from '@/lib/hooks/queries/useProjects';
import {createLogger} from '@/lib/utils/logger';

const _log = createLogger('ProjectsPage');

interface EmployeeSummary {
  id: string;
  employeeCode?: string | null;
  officialEmail?: string | null;
  firstName: string;
  lastName?: string | null;
}

interface ApiErrorPayload {
  message?: string;
  details?: string[];
}

interface OwnerTypeaheadProps {
  label: string;
  value: EmployeeSummary | null;
  onChange: (value: EmployeeSummary | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface MultiOwnerTypeaheadProps {
  label: string;
  values: EmployeeSummary[];
  onChange: (values: EmployeeSummary[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxOwners?: number;
}

const STATUS_BADGE: Record<ProjectStatus, {
  label: string;
  variant: 'success' | 'warning' | 'secondary' | 'danger' | 'primary'
}> = {
  DRAFT: {label: 'Draft', variant: 'secondary'},
  PLANNED: {label: 'Planned', variant: 'secondary'},
  IN_PROGRESS: {label: 'In Progress', variant: 'primary'},
  ON_HOLD: {label: 'On Hold', variant: 'warning'},
  COMPLETED: {label: 'Completed', variant: 'success'},
  CANCELLED: {label: 'Cancelled', variant: 'danger'},
};

const PRIORITY_BADGE: Record<string, { label: string; variant: 'danger' | 'warning' | 'primary' | 'secondary' }> = {
  LOW: {label: 'Low', variant: 'secondary'},
  MEDIUM: {label: 'Medium', variant: 'primary'},
  HIGH: {label: 'High', variant: 'warning'},
  CRITICAL: {label: 'Critical', variant: 'danger'},
};

const TYPE_BADGE: Record<ProjectType, { label: string; variant: 'primary' | 'outline' }> = {
  CLIENT: {label: 'Client', variant: 'primary'},
  INTERNAL: {label: 'Internal', variant: 'outline'},
};

const getStatusBadge = (status?: ProjectStatus | null) => {
  if (status && STATUS_BADGE[status]) {
    return STATUS_BADGE[status];
  }
  return {label: status ?? 'Unknown', variant: 'secondary' as const};
};

const getTypeBadge = (type?: ProjectType | null) => {
  if (type && TYPE_BADGE[type]) {
    return TYPE_BADGE[type];
  }
  return {label: type ?? 'Unknown', variant: 'outline' as const};
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
};

const buildEmployeeName = (employee?: EmployeeSummary | null) => {
  if (!employee) return '—';
  const last = employee.lastName?.trim();
  if (!last) return employee.firstName;
  return `${employee.firstName} ${last}`;
};

// Zod schema for project creation form
const projectFormSchema = z.object({
  projectCode: z.string().min(1, 'Project code is required'),
  name: z.string().min(1, 'Project name is required'),
  type: z.enum(['CLIENT', 'INTERNAL']),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'ON_HOLD']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  startDate: z.string().min(1, 'Start date is required'),
  expectedEndDate: z.string().optional().or(z.literal('')),
  clientName: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  isBillable: z.boolean().optional().default(false),
  billingType: z.enum(['TIME_AND_MATERIAL', 'FIXED_PRICE', 'RETAINER']).optional(),
  billingRate: z.union([z.string(), z.number()]).optional()
    .transform((v) => v === '' || v === undefined ? undefined : typeof v === 'string' ? Number(v) : v),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

// Zod schema for project edit form
const editProjectFormSchema = z.object({
  projectCode: z.string().optional(),
  name: z.string().min(1, 'Project name is required'),
  status: z.enum(['DRAFT', 'PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  startDate: z.string().min(1, 'Start date is required'),
  expectedEndDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  clientName: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});

type EditProjectFormData = z.infer<typeof editProjectFormSchema>;

const parseApiError = (error: unknown): ApiErrorPayload => {
  const response = (error as { response?: { data?: ApiErrorPayload } })?.response?.data;
  if (response) {
    return {message: response.message, details: response.details};
  }
  if (error instanceof Error) {
    return {message: error.message};
  }
  return {message: 'Something went wrong. Please try again.'};
};

function OwnerTypeahead({label, value, onChange, placeholder, disabled}: OwnerTypeaheadProps) {
  const [query, setQuery] = useState(value ? buildEmployeeName(value) : '');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value ? buildEmployeeName(value) : '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search term
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setDebouncedQuery('');
      return;
    }
    const handle = setTimeout(() => setDebouncedQuery(term), 300);
    return () => clearTimeout(handle);
  }, [query]);

  // React Query for employee search
  const {data: searchData, isLoading: loading} = useEmployeeSearch(
    debouncedQuery, 0, 20, open && debouncedQuery.length >= 2
  );
  const results: EmployeeSummary[] = (searchData?.content ?? []) as EmployeeSummary[];

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (value) {
      onChange(null);
    }
    setQuery(event.target.value);
    setOpen(true);
  };

  const handleSelect = (owner: EmployeeSummary) => {
    onChange(owner);
    setOpen(false);
    setDebouncedQuery('');
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setDebouncedQuery('');
    setOpen(false);
  };

  const showClear = Boolean(value) || query.length > 0;

  return (
    <div className="relative" ref={containerRef}>
      <Input
        label={label}
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        icon={<Search className="h-4 w-4"/>}
        rightIcon={loading ? <Loader2 className="h-4 w-4 animate-spin"/> : showClear ?
          <X className="h-4 w-4"/> : undefined}
        onRightIconClick={showClear ? handleClear : undefined}
        disabled={disabled}
      />
      {open && query.trim().length >= 2 && (
        <div
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-dropdown)] dark:border-[var(--border-main)] dark:bg-[var(--bg-card)]">
          {loading && (
            <div className="px-4 py-4 text-body-muted">Searching owners...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-4 text-body-muted">No owners found</div>
          )}
          {!loading && results.length > 0 && (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((owner) => (
                <li key={owner.id}>
                  <button
                    type="button"
                    aria-label={`Select ${buildEmployeeName(owner)}`}
                    className="flex w-full flex-col gap-0.5 px-4 py-4 text-left text-body-secondary hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]"
                    onClick={() => handleSelect(owner)}
                  >
                    <span className="font-medium text-[var(--text-primary)]">
                      {buildEmployeeName(owner)}
                    </span>
                    <span className="text-caption">
                      {owner.employeeCode || owner.officialEmail}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function MultiOwnerTypeahead({
                               label,
                               values,
                               onChange,
                               placeholder,
                               disabled,
                               maxOwners = 5,
                             }: MultiOwnerTypeaheadProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search term
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setDebouncedQuery('');
      return;
    }
    const handle = setTimeout(() => setDebouncedQuery(term), 300);
    return () => clearTimeout(handle);
  }, [query]);

  // React Query for employee search
  const {data: searchData, isLoading: loading} = useEmployeeSearch(
    debouncedQuery, 0, 20, open && debouncedQuery.length >= 2
  );
  const results: EmployeeSummary[] = useMemo(() => {
    const content = (searchData?.content ?? []) as EmployeeSummary[];
    const selectedIds = new Set(values.map((v) => v.id));
    return content.filter((emp) => !selectedIds.has(emp.id));
  }, [searchData, values]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setOpen(true);
  };

  const handleSelect = (owner: EmployeeSummary) => {
    if (values.length < maxOwners) {
      onChange([...values, owner]);
      setQuery('');
      setDebouncedQuery('');
    }
  };

  const handleRemove = (id: string) => {
    onChange(values.filter((v) => v.id !== id));
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </label>
      <div
        className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-2.5 dark:border-[var(--border-main)] dark:bg-[var(--bg-card)]">
        {values.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {values.map((owner, index) => (
              <div
                key={owner.id}
                className="flex items-center gap-1.5 rounded-md bg-accent-50 px-2.5 py-1.5 text-sm text-accent-700 dark:bg-accent-900/30 dark:text-accent-300"
              >
                <span>
                  {buildEmployeeName(owner)}
                  {index === 0 ? ' (Primary)' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(owner.id)}
                  className="ml-1 hover:text-accent-900 dark:hover:text-accent-100"
                  aria-label={`Remove ${buildEmployeeName(owner)}`}
                >
                  <X className="h-3.5 w-3.5"/>
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="relative">
          <Input
            placeholder={placeholder || 'Search and add owners...'}
            value={query}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            icon={<Search className="h-4 w-4"/>}
            rightIcon={loading ? <Loader2 className="h-4 w-4 animate-spin"/> : undefined}
            disabled={disabled || values.length >= maxOwners}
          />
        </div>
      </div>
      {open && query.trim().length >= 2 && (
        <div
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] shadow-[var(--shadow-dropdown)] dark:border-[var(--border-main)] dark:bg-[var(--bg-card)]">
          {loading && (
            <div className="px-4 py-4 text-body-muted">Searching owners...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-4 text-body-muted">
              {values.length >= maxOwners ? 'Maximum owners reached' : 'No owners found'}
            </div>
          )}
          {!loading && results.length > 0 && (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((owner) => (
                <li key={owner.id}>
                  <button
                    type="button"
                    aria-label={`Select ${buildEmployeeName(owner)}`}
                    className="flex w-full flex-col gap-0.5 px-4 py-4 text-left text-body-secondary hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]"
                    onClick={() => handleSelect(owner)}
                  >
                    <span className="font-medium text-[var(--text-primary)]">
                      {buildEmployeeName(owner)}
                    </span>
                    <span className="text-caption">
                      {owner.employeeCode || owner.officialEmail}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const {user} = useAuth();
  const toast = useToast();
  const {hasAnyPermission, isReady: permissionsReady} = usePermissions();
  const hasAccess = hasAnyPermission(Permissions.PROJECT_VIEW, Permissions.PROJECT_MANAGE);

  useEffect(() => {
    if (permissionsReady && !hasAccess) {
      router.replace('/me/dashboard');
    }
  }, [permissionsReady, hasAccess, router]);

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [activeTab, setActiveTab] = useState<'active' | 'all' | 'on_hold' | 'completed' | 'archived'>('active');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('IN_PROGRESS');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<ProjectType | ''>('');
  const [ownerFilter, setOwnerFilter] = useState<EmployeeSummary | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formErrorDetails, setFormErrorDetails] = useState<string[]>([]);
  const [ownerSelection, setOwnerSelection] = useState<EmployeeSummary[]>([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<HrmsProject | null>(null);
  const [editOwnerSelection, setEditOwnerSelection] = useState<EmployeeSummary[]>([]);
  const [editFormErrorDetails, setEditFormErrorDetails] = useState<string[]>([]);

  const handleTabChange = (tab: 'active' | 'all' | 'on_hold' | 'completed' | 'archived') => {
    setActiveTab(tab);
    setCurrentPage(0);

    // Map tab to status filter
    switch (tab) {
      case 'active':
        setStatusFilter('IN_PROGRESS');
        break;
      case 'all':
        setStatusFilter('');
        break;
      case 'on_hold':
        setStatusFilter('ON_HOLD');
        break;
      case 'completed':
        setStatusFilter('COMPLETED');
        break;
      case 'archived':
        setStatusFilter('CANCELLED');
        break;
    }
  };

  // React Hook Form setup for create
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: {errors, isSubmitting},
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      projectCode: '',
      name: '',
      type: 'INTERNAL',
      status: 'PLANNED',
      priority: 'MEDIUM',
      startDate: new Date().toISOString().split('T')[0],
      expectedEndDate: '',
      clientName: '',
      description: '',
      isBillable: false,
      billingType: undefined,
      billingRate: undefined,
    },
  });

  // React Hook Form setup for edit
  const {
    register: editRegister,
    handleSubmit: editHandleSubmit,
    reset: editReset,
    formState: {errors: editErrors, isSubmitting: editIsSubmitting},
  } = useForm<EditProjectFormData>({
    resolver: zodResolver(editProjectFormSchema),
  });

  const roleCodes = useMemo(() => new Set(user?.roles?.map((role) => role.code) ?? []), [user]);
  const canCreateProject = roleCodes.has('SUPER_ADMIN') || roleCodes.has('HR_ADMIN') || roleCodes.has('MANAGER');
  const canChooseOwner = roleCodes.has('SUPER_ADMIN') || roleCodes.has('HR_ADMIN') || roleCodes.has('HR_EXECUTIVE');
  const defaultOwner = useMemo<EmployeeSummary | null>(() => {
    if (!user?.employeeId) {
      return null;
    }
    const firstName = user.firstName || user.fullName?.split(' ')[0] || '';
    const lastName = user.lastName || user.fullName?.split(' ').slice(1).join(' ') || '';
    return {
      id: user.employeeId,
      officialEmail: user.email,
      firstName,
      lastName: lastName || null,
    };
  }, [user]);

  // Search debounce
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  React.useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchTerm(searchInput.trim());
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const activeFilters = useMemo(() => ({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    type: typeFilter || undefined,
    ownerId: ownerFilter?.id || undefined,
    search: debouncedSearchTerm || undefined,
  }), [ownerFilter, debouncedSearchTerm, statusFilter, typeFilter, priorityFilter]);

  // Query with filters
  const {data, isLoading, error: queryError, refetch} = useHrmsProjects(
    currentPage,
    pageSize,
    activeFilters
  );

  const createMutation = useCreateHrmsProject();
  const updateMutation = useUpdateHrmsProject();
  const exportMutation = useExportHrmsProjects();

  const projects = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const loading = isLoading;
  const error = queryError ? parseApiError(queryError) : null;
  const exporting = exportMutation.isPending;

  const handleExport = async () => {
    try {
      const blob = await exportMutation.mutateAsync(activeFilters) as Blob;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'projects.csv';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Export Complete', 'Projects exported as CSV');
    } catch (err) {
      const apiError = parseApiError(err);
      toast.error('Export Failed', apiError.message || 'Could not export projects');
    }
  };

  const handleOpenCreate = () => {
    reset();
    setOwnerSelection(canChooseOwner ? [] : (defaultOwner ? [defaultOwner] : []));
    setFormErrorDetails([]);
    setShowCreateModal(true);
  };

  const handleCreateProject = async (data: ProjectFormData) => {
    if (!canCreateProject) {
      setFormErrorDetails(['You do not have permission to create projects.']);
      return;
    }

    const ownerId = ownerSelection[0]?.id?.trim();
    if (!ownerId) {
      setFormErrorDetails(['Project owner is required']);
      return;
    }

    if (data.type === 'CLIENT' && !data.clientName?.trim()) {
      setFormErrorDetails(['Client name is required for client projects']);
      return;
    }

    const payload: ProjectCreateRequest = {
      projectCode: data.projectCode.trim().toUpperCase(),
      name: data.name.trim(),
      status: data.status,
      priority: data.priority as ProjectPriority,
      projectManagerId: ownerId,
      startDate: data.startDate,
      expectedEndDate: data.expectedEndDate ? data.expectedEndDate : undefined,
      clientName: data.type === 'CLIENT' ? data.clientName?.trim() : undefined,
      description: data.description?.trim() || undefined,
      isBillable: data.isBillable ?? false,
      billingType: data.isBillable ? data.billingType : undefined,
      billingRate: data.isBillable && data.billingRate ? Number(data.billingRate) : undefined,
    };

    try {
      await createMutation.mutateAsync(payload);
      setShowCreateModal(false);
      setCurrentPage(0);
      refetch();
    } catch (err) {
      const apiError = parseApiError(err);
      setFormErrorDetails([apiError.message || 'Failed to create project. Please try again.', ...(apiError.details || [])]);
    }
  };

  const handleOpenEdit = useCallback((project: HrmsProject) => {
    setEditingProject(project);
    editReset({
      name: project.name,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate?.split('T')[0] || '',
      expectedEndDate: project.expectedEndDate?.split('T')[0] || '',
      endDate: project.endDate?.split('T')[0] || '',
      clientName: project.clientName || '',
      description: project.description || '',
    });
    const owners: EmployeeSummary[] = [];
    if (project.projectManagerId && project.projectManagerName) {
      const nameParts = project.projectManagerName.split(' ');
      owners.push({
        id: project.projectManagerId,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || null,
      });
    }
    setEditOwnerSelection(owners);
    setEditFormErrorDetails([]);
    setShowEditModal(true);
  }, [editReset]);

  const handleEditProject = async (data: EditProjectFormData) => {
    if (!editingProject) return;

    const primaryOwnerId = editOwnerSelection[0]?.id?.trim();
    if (!primaryOwnerId) {
      setEditFormErrorDetails(['At least one project owner is required']);
      return;
    }

    const payload: ProjectUpdateRequest = {
      name: data.name?.trim(),
      status: data.status,
      priority: data.priority as ProjectPriority,
      projectManagerId: primaryOwnerId,
      startDate: data.startDate,
      expectedEndDate: data.expectedEndDate || undefined,
      endDate: data.endDate || undefined,
      clientName: data.clientName?.trim() || undefined,
      description: data.description?.trim() || undefined,
    };

    try {
      await updateMutation.mutateAsync({id: editingProject.id, data: payload});
      setShowEditModal(false);
      setEditingProject(null);
      refetch();
    } catch (err) {
      const apiError = parseApiError(err);
      setEditFormErrorDetails([apiError.message || 'Failed to update project.', ...(apiError.details || [])]);
    }
  };

  const columns = useMemo(() => [
    {
      key: 'project',
      header: 'Project',
      accessor: (project: HrmsProject) => (
        <div className="space-y-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/projects/${project.id}`);
            }}
            className="font-semibold text-[var(--text-primary)] hover:text-accent-700 dark:hover:text-accent-400 transition-colors text-left"
          >
            {project.name}
          </button>
          <div className="text-caption">
            {project.projectCode}
            {project.clientName ? ` • ${project.clientName}` : ''}
          </div>
        </div>
      ),
      mobilePriority: 'primary' as const,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (project: HrmsProject) => {
        const badge = getStatusBadge(project.status);
        return (
          <Badge variant={badge.variant} size="sm">
            {badge.label}
          </Badge>
        );
      },
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'type',
      header: 'Type',
      accessor: (project: HrmsProject) => {
        const badge = getTypeBadge(project.type);
        return (
          <Badge variant={badge.variant} size="sm">
            {badge.label}
          </Badge>
        );
      },
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'client',
      header: 'Client',
      accessor: (project: HrmsProject) => (
        <span className="text-body-secondary">
          {project.clientName || '—'}
        </span>
      ),
      mobilePriority: 'hidden' as const,
    },
    {
      key: 'budget',
      header: 'Budget',
      accessor: (project: HrmsProject) => (
        <span className="text-body-secondary">
          {project.budget != null
            ? `${project.currency || '₹'}${project.budget.toLocaleString('en-IN')}`
            : '—'}
        </span>
      ),
      mobilePriority: 'hidden' as const,
    },
    {
      key: 'priority',
      header: 'Priority',
      accessor: (project: HrmsProject) => {
        const badge = PRIORITY_BADGE[project.priority] || {label: project.priority, variant: 'secondary'};
        return (
          <Badge variant={badge.variant} size="sm">
            {badge.label}
          </Badge>
        );
      },
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'owner',
      header: 'Manager',
      accessor: (project: HrmsProject) => (
        <div className="space-y-1">
          <div className="text-sm text-[var(--text-primary)]">
            {project.projectManagerName || '—'}
          </div>
        </div>
      ),
      mobilePriority: 'secondary' as const,
    },
    {
      key: 'dates',
      header: 'Dates',
      accessor: (project: HrmsProject) => (
        <div className="text-body-secondary">
          {formatDate(project.startDate)}
          {' → '}
          {project.endDate ? formatDate(project.endDate) : project.expectedEndDate ? `${formatDate(project.expectedEndDate)} (Exp)` : '—'}
        </div>
      ),
      mobilePriority: 'hidden' as const,
    },
    {
      key: 'actions',
      header: '',
      accessor: (project: HrmsProject) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/projects/${project.id}`);
            }}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors"
            aria-label={`View ${project.name}`}
          >
            <Eye className="h-4 w-4"/>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(project);
            }}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors"
            aria-label={`Edit ${project.name}`}
          >
            <Edit2 className="h-4 w-4"/>
          </button>
        </div>
      ),
      mobilePriority: 'secondary' as const,
    },
  ], [handleOpenEdit, router]);

  if (!permissionsReady || !hasAccess) return null;

  return (
    <AppLayout breadcrumbs={[{label: 'Dashboard', href: '/dashboard'}, {label: 'Projects'}]} activeMenuItem="projects">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
              Projects & Allocations
            </h1>
            <p className="text-body-muted skeuo-deboss">
              Track projects and manage team allocations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              leftIcon={<Download className="h-4 w-4"/>}
              isLoading={exporting}
              aria-label="Export projects as CSV"
            >
              Export
            </Button>
            {canCreateProject && (
              <Button onClick={handleOpenCreate} leftIcon={<Plus className="h-4 w-4"/>} aria-label="Create new project">
                New Project
              </Button>
            )}
          </div>
        </div>

        {/* Tab-based filtering */}
        <div className="flex border-b border-[var(--border-main)]">
          {[
            {key: 'active' as const, label: 'Active'},
            {key: 'all' as const, label: 'All'},
            {key: 'on_hold' as const, label: 'On Hold'},
            {key: 'completed' as const, label: 'Completed'},
            {key: 'archived' as const, label: 'Archived'},
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-accent-500 text-accent-700 dark:text-accent-400'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-main)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <Card className="border border-danger-200 bg-danger-50 dark:border-danger-800 dark:bg-danger-900/20">
            <CardContent className="row-between gap-4">
              <p className="text-sm text-danger-700 dark:text-danger-400">{error?.message ?? String(error)}</p>
              <Button variant="outline" size="sm" onClick={() => {
                void refetch();
              }}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Input
                label="Search"
                placeholder="Search by name, code, client, or owner"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                icon={<Search className="h-4 w-4"/>}
              />
              <Select
                label="Status"
                value={statusFilter}
                onChange={(event) => {
                  const newStatus = event.target.value as ProjectStatus | '';
                  setStatusFilter(newStatus);
                  setCurrentPage(0);

                  // Sync activeTab with status selection
                  switch (newStatus) {
                    case 'IN_PROGRESS':
                      setActiveTab('active');
                      break;
                    case 'ON_HOLD':
                      setActiveTab('on_hold');
                      break;
                    case 'COMPLETED':
                      setActiveTab('completed');
                      break;
                    case 'CANCELLED':
                      setActiveTab('archived');
                      break;
                    default:
                      setActiveTab('all');
                  }
                }}
              >
                <option value="">All statuses</option>
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
              <Select
                label="Priority"
                value={priorityFilter}
                onChange={(event) => {
                  setPriorityFilter(event.target.value);
                  setCurrentPage(0);
                }}
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </Select>
              <Select
                label="Type"
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value as ProjectType | '');
                  setCurrentPage(0);
                }}
              >
                <option value="">All types</option>
                <option value="CLIENT">Client</option>
                <option value="INTERNAL">Internal</option>
              </Select>
              <OwnerTypeahead
                label="Owner"
                value={ownerFilter}
                onChange={(owner) => {
                  setOwnerFilter(owner);
                  setCurrentPage(0);
                }}
                placeholder="Search owners..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            {!loading && totalElements === 0 && projects.length === 0 ? (
              <EmptyState
                icon={<Eye className="h-12 w-12"/>}
                title="No Projects Yet"
                description="Create your first project to start tracking work, assigning tasks, and collaborating with your team."
                actionLabel="Create Project"
                onAction={() => setShowCreateModal(true)}
              />
            ) : (
              <ResponsiveTable
                columns={columns}
                data={projects}
                keyExtractor={(project) => project.id}
                isLoading={loading}
                emptyMessage="No projects found for the selected filters."
              />
            )}
            {totalElements > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalElements}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(0);
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} size="lg">
        <ModalHeader onClose={() => setShowCreateModal(false)}>
          Create Project
        </ModalHeader>
        <form onSubmit={handleSubmit(handleCreateProject)}>
          <ModalBody className="space-y-4">
            {formErrorDetails.length > 0 && (
              <div
                className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-4 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
                <ul className="space-y-1">
                  {formErrorDetails.map((detail, index) => (
                    <li key={`${index}-${detail}`}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input
                  label="Project code"
                  placeholder="e.g. PRJ-2024-001"
                  {...register('projectCode')}
                />
                {errors.projectCode && <p className="text-sm text-danger-500 mt-1">{errors.projectCode.message}</p>}
              </div>
              <div>
                <Input
                  label="Project name"
                  placeholder="e.g. Mobile app revamp"
                  {...register('name')}
                />
                {errors.name && <p className="text-sm text-danger-500 mt-1">{errors.name.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Select label="Type" {...register('type')}>
                  <option value="CLIENT">Client</option>
                  <option value="INTERNAL">Internal</option>
                </Select>
                {errors.type && <p className="text-sm text-danger-500 mt-1">{errors.type.message}</p>}
              </div>
              <MultiOwnerTypeahead
                label="Owner(s)"
                values={ownerSelection}
                onChange={setOwnerSelection}
                placeholder="Search owners..."
                disabled={!canChooseOwner}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input label="Start date" type="date" {...register('startDate')} />
                {errors.startDate && <p className="text-sm text-danger-500 mt-1">{errors.startDate.message}</p>}
              </div>
              <div>
                <Input label="Expected end date" type="date" {...register('expectedEndDate')} />
                {errors.expectedEndDate &&
                  <p className="text-sm text-danger-500 mt-1">{errors.expectedEndDate.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Select label="Status" {...register('status')}>
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                </Select>
                {errors.status && <p className="text-sm text-danger-500 mt-1">{errors.status.message}</p>}
              </div>
              <div>
                <Select label="Priority" {...register('priority')}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </Select>
                {errors.priority && <p className="text-sm text-danger-500 mt-1">{errors.priority.message}</p>}
              </div>
            </div>

            <div>
              <Input label="Client name" placeholder="e.g. Acme Corp" {...register('clientName')} />
              {errors.clientName && <p className="text-sm text-danger-500 mt-1">{errors.clientName.message}</p>}
            </div>

            {/* Billing toggle */}
            <div className="rounded-lg border border-[var(--border-main)] p-4 space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--border-main)] text-accent-700 focus:ring-accent-500"
                  {...register('isBillable')}
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">Billable project</span>
                <span className="text-caption">— enables invoicing for this project</span>
              </label>

              {watch('isBillable') && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Select label="Billing type" {...register('billingType')}>
                      <option value="">Select billing type</option>
                      <option value="TIME_AND_MATERIAL">Time &amp; Material</option>
                      <option value="FIXED_PRICE">Fixed Price</option>
                      <option value="RETAINER">Retainer</option>
                    </Select>
                  </div>
                  <div>
                    <Input
                      label="Billing rate (per hour)"
                      type="number"
                      min={0}
                      placeholder="e.g. 150"
                      {...register('billingRate')}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                Description (optional)
              </label>
              <Textarea placeholder="Add a short description or scope notes" {...register('description')} />
              {errors.description && <p className="text-sm text-danger-500 mt-1">{errors.description.message}</p>}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting || createMutation.isPending}>
              Create Project
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} size="lg">
        <ModalHeader onClose={() => setShowEditModal(false)}>
          Edit Project
        </ModalHeader>
        <form onSubmit={editHandleSubmit(handleEditProject)}>
          <ModalBody className="space-y-4">
            {editFormErrorDetails.length > 0 && (
              <div
                className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-4 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
                <ul className="space-y-1">
                  {editFormErrorDetails.map((detail, index) => (
                    <li key={`${index}-${detail}`}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                  Project code
                </label>
                <div
                  className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-secondary)] px-4 py-2.5 text-body-secondary">
                  {editingProject?.projectCode}
                </div>
              </div>
              <div>
                <Input
                  label="Project name"
                  placeholder="e.g. Mobile app revamp"
                  {...editRegister('name')}
                />
                {editErrors.name && <p className="text-sm text-danger-500 mt-1">{editErrors.name.message}</p>}
              </div>
            </div>

            <div>
              <MultiOwnerTypeahead
                label="Owner(s)"
                values={editOwnerSelection}
                onChange={setEditOwnerSelection}
                placeholder="Search owners..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input label="Start date" type="date" {...editRegister('startDate')} />
                {editErrors.startDate && <p className="text-sm text-danger-500 mt-1">{editErrors.startDate.message}</p>}
              </div>
              <div>
                <Input label="Expected end date" type="date" {...editRegister('expectedEndDate')} />
                {editErrors.expectedEndDate &&
                  <p className="text-sm text-danger-500 mt-1">{editErrors.expectedEndDate.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input label="Actual end date" type="date" {...editRegister('endDate')} />
                {editErrors.endDate && <p className="text-sm text-danger-500 mt-1">{editErrors.endDate.message}</p>}
              </div>
              <div>
                <Select label="Status" {...editRegister('status')}>
                  <option value="DRAFT">Draft</option>
                  <option value="PLANNED">Planned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </Select>
                {editErrors.status && <p className="text-sm text-danger-500 mt-1">{editErrors.status.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Select label="Priority" {...editRegister('priority')}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </Select>
                {editErrors.priority && <p className="text-sm text-danger-500 mt-1">{editErrors.priority.message}</p>}
              </div>
            </div>

            <div>
              <Input label="Client name" placeholder="e.g. Acme Corp" {...editRegister('clientName')} />
              {editErrors.clientName && <p className="text-sm text-danger-500 mt-1">{editErrors.clientName.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
                Description (optional)
              </label>
              <Textarea placeholder="Add a short description or scope notes" {...editRegister('description')} />
              {editErrors.description &&
                <p className="text-sm text-danger-500 mt-1">{editErrors.description.message}</p>}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={editIsSubmitting || updateMutation.isPending}>
              Save Changes
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </AppLayout>
  );
}
