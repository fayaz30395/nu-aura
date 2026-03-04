'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, Plus, Search, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Badge,
  Button,
  Card,
  CardContent,
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
import { hrmsProjectService } from '@/lib/services/hrms-project.service';
import {
  HrmsProject,
  ProjectCreateRequest,
  ProjectStatus,
  ProjectType,
} from '@/lib/types/hrms-project';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/lib/hooks/useAuth';

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

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

const STATUS_BADGE: Record<ProjectStatus, { label: string; variant: 'success' | 'warning' | 'secondary' | 'danger' | 'primary' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  PLANNED: { label: 'Planned', variant: 'secondary' },
  IN_PROGRESS: { label: 'In Progress', variant: 'primary' },
  ON_HOLD: { label: 'On Hold', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
};

const PRIORITY_BADGE: Record<string, { label: string; variant: 'danger' | 'warning' | 'primary' | 'secondary' }> = {
  LOW: { label: 'Low', variant: 'secondary' },
  MEDIUM: { label: 'Medium', variant: 'primary' },
  HIGH: { label: 'High', variant: 'warning' },
  CRITICAL: { label: 'Critical', variant: 'danger' },
};

const TYPE_BADGE: Record<ProjectType, { label: string; variant: 'primary' | 'outline' }> = {
  CLIENT: { label: 'Client', variant: 'primary' },
  INTERNAL: { label: 'Internal', variant: 'outline' },
};

const getStatusBadge = (status?: ProjectStatus | null) => {
  if (status && STATUS_BADGE[status]) {
    return STATUS_BADGE[status];
  }
  return { label: status ?? 'Unknown', variant: 'secondary' as const };
};

const getTypeBadge = (type?: ProjectType | null) => {
  if (type && TYPE_BADGE[type]) {
    return TYPE_BADGE[type];
  }
  return { label: type ?? 'Unknown', variant: 'outline' as const };
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const buildEmployeeName = (employee?: EmployeeSummary | null) => {
  if (!employee) return '—';
  const last = employee.lastName?.trim();
  if (!last) return employee.firstName;
  return `${employee.firstName} ${last}`;
};

const parseApiError = (error: unknown): ApiErrorPayload => {
  const response = (error as { response?: { data?: ApiErrorPayload } })?.response?.data;
  if (response) {
    return { message: response.message, details: response.details };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'Something went wrong. Please try again.' };
};

function OwnerTypeahead({ label, value, onChange, placeholder, disabled }: OwnerTypeaheadProps) {
  const [query, setQuery] = useState(value ? buildEmployeeName(value) : '');
  const [results, setResults] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    if (!open) {
      return;
    }

    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await apiClient.get<PageResponse<EmployeeSummary>>('/employees', {
          params: { search: term, page: 0, size: 20 },
        });
        setResults(response.data.content ?? []);
      } catch (err) {
        console.error('Owner search failed', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [query, open]);

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
    setResults([]);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setResults([]);
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
        icon={<Search className="h-4 w-4" />}
        rightIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : showClear ? <X className="h-4 w-4" /> : undefined}
        onRightIconClick={showClear ? handleClear : undefined}
        disabled={disabled}
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-surface-200 bg-white shadow-lg dark:border-surface-700 dark:bg-surface-800">
          {loading && (
            <div className="px-4 py-3 text-sm text-surface-500">Searching owners...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-surface-500">No owners found</div>
          )}
          {!loading && results.length > 0 && (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((owner) => (
                <li key={owner.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-700"
                    onClick={() => handleSelect(owner)}
                  >
                    <span className="font-medium text-surface-900 dark:text-surface-50">
                      {buildEmployeeName(owner)}
                    </span>
                    <span className="text-xs text-surface-500 dark:text-surface-400">
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
  const { user } = useAuth();
  const [projects, setProjects] = useState<HrmsProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('IN_PROGRESS');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<ProjectType | ''>('');
  const [ownerFilter, setOwnerFilter] = useState<EmployeeSummary | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formErrorDetails, setFormErrorDetails] = useState<string[]>([]);
  const [ownerSelection, setOwnerSelection] = useState<EmployeeSummary | null>(null);

  const [formData, setFormData] = useState({
    projectCode: '',
    name: '',
    type: 'INTERNAL' as ProjectType,
    status: 'PLANNED' as ProjectStatus,
    priority: 'MEDIUM',
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: '',
    clientName: '',
    description: '',
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

  const activeFilters = useMemo(() => ({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    type: typeFilter || undefined,
    ownerId: ownerFilter?.id || undefined,
    search: searchTerm || undefined,
  }), [ownerFilter, searchTerm, statusFilter, typeFilter, priorityFilter]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await hrmsProjectService.listProjects(currentPage, pageSize, activeFilters);
      setProjects(response.content ?? []);
      setTotalPages(response.totalPages ?? 0);
      setTotalElements(response.totalElements ?? 0);
    } catch (err) {
      const apiError = parseApiError(err);
      setError(apiError.message || 'Failed to load projects. Please try again.');
      setProjects([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [activeFilters, currentPage, pageSize]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleExport = async () => {
    setError(null);
    setExporting(true);
    try {
      const blob = await hrmsProjectService.exportProjects(activeFilters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'projects.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const apiError = parseApiError(err);
      setError(apiError.message || 'Failed to export projects. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      projectCode: '',
      name: '',
      type: 'INTERNAL',
      status: 'PLANNED',
      priority: 'MEDIUM',
      startDate: new Date().toISOString().split('T')[0],
      expectedEndDate: '',
      clientName: '',
      description: '',
    });
    setOwnerSelection(canChooseOwner ? null : defaultOwner);
    setFormError(null);
    setFormErrorDetails([]);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleCreateProject = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFormErrorDetails([]);

    if (!canCreateProject) {
      setFormError('You do not have permission to create projects.');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Project name is required');
      return;
    }
    const ownerId = ownerSelection?.id?.trim();
    if (!ownerId) {
      setFormError('Project owner is required');
      return;
    }
    if (!formData.startDate) {
      setFormError('Start date is required');
      return;
    }
    if (formData.type === 'CLIENT' && !formData.clientName.trim()) {
      setFormError('Client name is required for client projects');
      return;
    }

    const payload: ProjectCreateRequest = {
      projectCode: formData.projectCode.trim().toUpperCase(),
      name: formData.name.trim(),
      status: formData.status,
      priority: formData.priority as any,
      projectManagerId: ownerId,
      startDate: formData.startDate,
      expectedEndDate: formData.expectedEndDate ? formData.expectedEndDate : undefined,
      clientName: formData.type === 'CLIENT' ? formData.clientName.trim() : undefined,
      description: formData.description?.trim() || undefined,
    };

    setSaving(true);
    try {
      await hrmsProjectService.createProject(payload);
      setShowCreateModal(false);
      setCurrentPage(0);
      fetchProjects();
    } catch (err) {
      const apiError = parseApiError(err);
      setFormError(apiError.message || 'Failed to create project. Please try again.');
      setFormErrorDetails(apiError.details || []);
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => [
    {
      key: 'project',
      header: 'Project',
      accessor: (project: HrmsProject) => (
        <div className="space-y-1">
          <div className="font-semibold text-surface-900 dark:text-surface-100">{project.name}</div>
          <div className="text-xs text-surface-500 dark:text-surface-400">
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
      key: 'priority',
      header: 'Priority',
      accessor: (project: HrmsProject) => {
        const badge = PRIORITY_BADGE[project.priority] || { label: project.priority, variant: 'secondary' };
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
          <div className="text-sm text-surface-900 dark:text-surface-100">
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
        <div className="text-sm text-surface-700 dark:text-surface-300">
          {formatDate(project.startDate)}
          {' → '}
          {project.endDate ? formatDate(project.endDate) : project.expectedEndDate ? `${formatDate(project.expectedEndDate)} (Exp)` : '—'}
        </div>
      ),
      mobilePriority: 'hidden' as const,
    },
  ], []);

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Projects' }]} activeMenuItem="projects">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
              Projects & Allocations
            </h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Track projects and manage team allocations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              leftIcon={<Download className="h-4 w-4" />}
              isLoading={exporting}
            >
              Export
            </Button>
            {canCreateProject && (
              <Button onClick={handleOpenCreate} leftIcon={<Plus className="h-4 w-4" />}>
                New Project
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Card className="border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950/20">
            <CardContent className="flex items-center justify-between gap-3">
              <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchProjects}>
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
                icon={<Search className="h-4 w-4" />}
              />
              <Select
                label="Status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as ProjectStatus | '');
                  setCurrentPage(0);
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
            <ResponsiveTable
              columns={columns}
              data={projects}
              keyExtractor={(project) => project.id}
              isLoading={loading}
              emptyMessage="No projects found for the selected filters."
            />
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
        <form onSubmit={handleCreateProject}>
          <ModalBody className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                <p>{formError}</p>
                {formErrorDetails.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {formErrorDetails.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Project code"
                value={formData.projectCode}
                onChange={(event) => setFormData((prev) => ({ ...prev, projectCode: event.target.value }))}
                placeholder="e.g. PRJ-2024-001"
                required
              />
              <Input
                label="Project name"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="e.g. Mobile app revamp"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Type"
                value={formData.type}
                onChange={(event) => setFormData((prev) => ({ ...prev, type: event.target.value as ProjectType }))}
              >
                <option value="CLIENT">Client</option>
                <option value="INTERNAL">Internal</option>
              </Select>
              <OwnerTypeahead
                label="Owner"
                value={ownerSelection}
                onChange={setOwnerSelection}
                placeholder="Search owners..."
                disabled={!canChooseOwner}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Start date"
                type="date"
                value={formData.startDate}
                onChange={(event) => setFormData((prev) => ({ ...prev, startDate: event.target.value }))}
                required
              />
              <Input
                label="Expected end date"
                type="date"
                value={formData.expectedEndDate}
                onChange={(event) => setFormData((prev) => ({ ...prev, expectedEndDate: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Status"
                value={formData.status}
                onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value as ProjectStatus }))}
                required
              >
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
              </Select>
              <Select
                label="Priority"
                value={formData.priority}
                onChange={(event) => setFormData((prev) => ({ ...prev, priority: event.target.value }))}
                required
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </Select>
            </div>

            {formData.type === 'CLIENT' && (
              <Input
                label="Client name"
                value={formData.clientName}
                onChange={(event) => setFormData((prev) => ({ ...prev, clientName: event.target.value }))}
                placeholder="e.g. Acme Corp"
                required
              />
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-200">
                Description (optional)
              </label>
              <Textarea
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Add a short description or scope notes"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Create Project
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </AppLayout>
  );
}
