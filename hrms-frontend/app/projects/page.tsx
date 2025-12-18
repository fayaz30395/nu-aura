'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderKanban,
  Search,
  Plus,
  Calendar,
  Users,
  DollarSign,
  AlertCircle,
  Loader2,
  Edit,
  Trash2,
  Eye,
  Building,
  User,
  LayoutList,
  LayoutGrid,
  ArrowUpDown,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Percent,
  ExternalLink,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Card,
  CardContent,
  Button,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  EmployeeSearchAutocomplete,
} from '@/components/ui';
import { projectService } from '@/lib/services/project.service';
import { Project, ProjectEmployee, CreateProjectRequest, UpdateProjectRequest, AssignEmployeeRequest } from '@/lib/types/project';

type ViewMode = 'list' | 'board';
type ProjectStatus = 'PLANNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type SortField = 'name' | 'priority' | 'startDate' | 'expectedEndDate' | 'status';
type SortDirection = 'asc' | 'desc';

// Team member type for resource allocation
interface TeamMember {
  id?: string;
  name: string;
  avatar?: string;
  allocation: number;
  role: string;
  startDate: string;
  endDate: string;
  ratePerHour: number;
  rateCategory: string;
  billableType: string;
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bgColor: string }> = {
  PLANNED: { label: 'To-Do', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  IN_PROGRESS: { label: 'Active', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900' },
  ON_HOLD: { label: 'On Hold', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900' },
  COMPLETED: { label: 'Completed', color: 'text-teal-700 dark:text-teal-300', bgColor: 'bg-teal-100 dark:bg-teal-900' },
  CANCELLED: { label: 'Overdue', color: 'text-pink-700 dark:text-pink-300', bgColor: 'bg-pink-100 dark:bg-pink-900' },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bgColor: string }> = {
  LOW: { label: 'Low', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900' },
  MEDIUM: { label: 'Medium', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900' },
  HIGH: { label: 'High', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900' },
  CRITICAL: { label: 'Critical', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900' },
};

const ROLES = ['Lead', 'Product Owner', 'Project Manager', 'Developer', 'Designer', 'QA Engineer', 'DevOps', 'Business Analyst'];
const RATE_CATEGORIES = ['On-Site', 'Remote', 'Offshore', 'Nearshore'];
const BILLABLE_TYPES = ['Billable', 'Non-Billable', 'Internal'];

const formatDate = (date: string | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number | undefined, currency: string = 'USD') => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'team'>('basic');

  // Form state
  const [formData, setFormData] = useState<CreateProjectRequest>({
    projectCode: '',
    name: '',
    description: '',
    startDate: '',
    expectedEndDate: '',
    status: 'PLANNED',
    priority: 'MEDIUM',
    clientName: '',
    budget: undefined,
    currency: 'USD',
  });

  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projectTeamMembers, setProjectTeamMembers] = useState<ProjectEmployee[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [addResourceModalOpen, setAddResourceModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [newResource, setNewResource] = useState<AssignEmployeeRequest>({
    employeeId: '',
    role: 'Developer',
    allocationPercentage: 100,
    startDate: '',
    endDate: '',
  });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (searchQuery.trim()) {
        response = await projectService.searchProjects(searchQuery, currentPage, 20);
      } else {
        response = await projectService.getAllProjects(
          currentPage,
          20,
          statusFilter || undefined,
          priorityFilter || undefined
        );
      }
      setProjects(response.content);
      setTotalElements(response.totalElements);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError(err.response?.data?.message || 'Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, priorityFilter, currentPage]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const resetForm = () => {
    setFormData({
      projectCode: '',
      name: '',
      description: '',
      startDate: '',
      expectedEndDate: '',
      status: 'PLANNED',
      priority: 'MEDIUM',
      clientName: '',
      budget: undefined,
      currency: 'USD',
    });
    setTeamMembers([]);
    setIsEditing(false);
    setSelectedProject(null);
    setActiveTab('basic');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (project: Project) => {
    setSelectedProject(project);
    setIsEditing(true);
    setFormData({
      projectCode: project.projectCode,
      name: project.name,
      description: project.description || '',
      startDate: project.startDate,
      expectedEndDate: project.expectedEndDate || '',
      status: project.status,
      priority: project.priority,
      clientName: project.clientName || '',
      budget: project.budget,
      currency: project.currency || 'USD',
    });
    setActiveTab('basic');
    setShowAddModal(true);
  };

  const handleViewDetails = (project: Project) => {
    setSelectedProject(project);
    setShowDetailModal(true);
  };

  const handleDeleteClick = (project: Project) => {
    setSelectedProject(project);
    setShowDeleteModal(true);
  };

  const handleManageResources = async (project: Project) => {
    setSelectedProject(project);
    setShowResourceModal(true);
    setLoadingTeam(true);
    try {
      const members = await projectService.getTeamMembers(project.id);
      setProjectTeamMembers(members);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setProjectTeamMembers([]);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleAssignResource = async () => {
    if (!selectedProject || !selectedEmployee) return;
    try {
      const resourceToAssign: AssignEmployeeRequest = {
        ...newResource,
        employeeId: selectedEmployee.id,
      };
      await projectService.assignEmployee(selectedProject.id, resourceToAssign);
      const members = await projectService.getTeamMembers(selectedProject.id);
      setProjectTeamMembers(members);
      setAddResourceModalOpen(false);
      setSelectedEmployee(null);
      setNewResource({
        employeeId: '',
        role: 'Developer',
        allocationPercentage: 100,
        startDate: '',
        endDate: '',
      });
    } catch (err: any) {
      console.error('Error assigning resource:', err);
      setError(err.response?.data?.message || 'Failed to assign resource');
    }
  };

  const handleRemoveResource = async (employeeId: string) => {
    if (!selectedProject) return;
    try {
      await projectService.removeEmployee(selectedProject.id, employeeId);
      const members = await projectService.getTeamMembers(selectedProject.id);
      setProjectTeamMembers(members);
    } catch (err: any) {
      console.error('Error removing resource:', err);
      setError(err.response?.data?.message || 'Failed to remove resource');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing && selectedProject) {
        const updateData: UpdateProjectRequest = {
          name: formData.name,
          description: formData.description,
          startDate: formData.startDate,
          expectedEndDate: formData.expectedEndDate || undefined,
          status: formData.status,
          priority: formData.priority,
          clientName: formData.clientName || undefined,
          budget: formData.budget,
          currency: formData.currency,
        };
        await projectService.updateProject(selectedProject.id, updateData);
      } else {
        await projectService.createProject(formData);
      }
      setShowAddModal(false);
      resetForm();
      fetchProjects();
    } catch (err: any) {
      console.error('Error saving project:', err);
      setError(err.response?.data?.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;
    setDeleting(true);
    try {
      await projectService.deleteProject(selectedProject.id);
      setShowDeleteModal(false);
      setSelectedProject(null);
      fetchProjects();
    } catch (err: any) {
      console.error('Error deleting project:', err);
      setError(err.response?.data?.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const addTeamMember = () => {
    setTeamMembers([
      ...teamMembers,
      {
        name: '',
        allocation: 100,
        role: 'Developer',
        startDate: formData.startDate,
        endDate: formData.expectedEndDate || '',
        ratePerHour: 0,
        rateCategory: 'Remote',
        billableType: 'Billable',
      },
    ]);
  };

  const updateTeamMember = (index: number, field: keyof TeamMember, value: any) => {
    const updated = [...teamMembers];
    updated[index] = { ...updated[index], [field]: value };
    setTeamMembers(updated);
  };

  const removeTeamMember = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  // Sort projects locally
  const sortedProjects = [...projects].sort((a, b) => {
    let aVal: any, bVal: any;
    switch (sortField) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'priority':
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        aVal = priorityOrder[a.priority as Priority] || 4;
        bVal = priorityOrder[b.priority as Priority] || 4;
        break;
      case 'startDate':
        aVal = new Date(a.startDate).getTime();
        bVal = new Date(b.startDate).getTime();
        break;
      case 'expectedEndDate':
        aVal = a.expectedEndDate ? new Date(a.expectedEndDate).getTime() : Infinity;
        bVal = b.expectedEndDate ? new Date(b.expectedEndDate).getTime() : Infinity;
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      default:
        return 0;
    }
    if (sortDirection === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    }
    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
  });

  // Stats by status
  const statusCounts = {
    PLANNED: projects.filter((p) => p.status === 'PLANNED').length,
    IN_PROGRESS: projects.filter((p) => p.status === 'IN_PROGRESS').length,
    ON_HOLD: projects.filter((p) => p.status === 'ON_HOLD').length,
    COMPLETED: projects.filter((p) => p.status === 'COMPLETED').length,
    CANCELLED: projects.filter((p) => p.status === 'CANCELLED').length,
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Projects' },
  ];

  if (loading && projects.length === 0) {
    return (
      <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="projects">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <span className="ml-2 text-surface-600 dark:text-surface-400">Loading projects...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="projects">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
              Project Management
            </h1>
            <p className="text-surface-600 dark:text-surface-400">
              Manage projects and resource allocation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => {}}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={handleOpenAddModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Project
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
                <Button size="sm" variant="outline" onClick={fetchProjects} className="ml-auto">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search, Filters and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700">
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700">
              <ArrowUpDown className="h-4 w-4" />
              Sort
            </button>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="px-4 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="PLANNED">To-Do</option>
              <option value="IN_PROGRESS">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Overdue</option>
            </select>
          </div>
          <div className="flex items-center gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-lg">
            <button
              onClick={() => setViewMode('board')}
              className={`p-2 rounded ${viewMode === 'board' ? 'bg-white dark:bg-surface-700 shadow' : ''}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-surface-700 shadow' : ''}`}
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Board View - Status Cards */}
        {viewMode === 'board' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800">
              <CardContent className="p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">To-Do Projects</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{String(statusCounts.PLANNED).padStart(2, '0')}</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Active Projects</div>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{String(statusCounts.IN_PROGRESS).padStart(2, '0')}</div>
              </CardContent>
            </Card>
            <Card className="bg-pink-50 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800">
              <CardContent className="p-4">
                <div className="text-sm text-pink-600 dark:text-pink-400 mb-1">Overdue Projects</div>
                <div className="text-3xl font-bold text-pink-900 dark:text-pink-100">{String(statusCounts.CANCELLED + statusCounts.ON_HOLD).padStart(2, '0')}</div>
              </CardContent>
            </Card>
            <Card className="bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800">
              <CardContent className="p-4">
                <div className="text-sm text-teal-600 dark:text-teal-400 mb-1">Completed Projects</div>
                <div className="text-3xl font-bold text-teal-900 dark:text-teal-100">{String(statusCounts.COMPLETED).padStart(2, '0')}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Project Cards in Board View */}
        {viewMode === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sortedProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/projects/${project.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-surface-900 dark:text-white line-clamp-1">{project.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${PRIORITY_CONFIG[project.priority as Priority]?.bgColor} ${PRIORITY_CONFIG[project.priority as Priority]?.color}`}>
                      {PRIORITY_CONFIG[project.priority as Priority]?.label}
                    </span>
                  </div>
                  <p className="text-sm text-surface-600 dark:text-surface-400 line-clamp-2 mb-3">
                    {project.description || 'No description'}
                  </p>
                  <div className="space-y-2 text-xs text-surface-500">
                    <div className="flex justify-between">
                      <span>Kick-start</span>
                      <span>{formatDate(project.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Deadline</span>
                      <span>{formatDate(project.expectedEndDate)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
                    <div className="flex -space-x-2">
                      {/* Team member avatars placeholder */}
                      <div className="w-6 h-6 rounded-full bg-primary-500 border-2 border-white dark:border-surface-800 flex items-center justify-center text-white text-xs">
                        <User className="h-3 w-3" />
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_CONFIG[project.status as ProjectStatus]?.bgColor} ${STATUS_CONFIG[project.status as ProjectStatus]?.color}`}>
                      {STATUS_CONFIG[project.status as ProjectStatus]?.label}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* List View - Table */}
        {viewMode === 'list' && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                      <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                        <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-surface-900 dark:hover:text-white">
                          Project Name
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                        <button onClick={() => handleSort('priority')} className="flex items-center gap-1 hover:text-surface-900 dark:hover:text-white">
                          Priority
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">Manager</th>
                      <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                        <button onClick={() => handleSort('startDate')} className="flex items-center gap-1 hover:text-surface-900 dark:hover:text-white">
                          Kick-start
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                        <button onClick={() => handleSort('expectedEndDate')} className="flex items-center gap-1 hover:text-surface-900 dark:hover:text-white">
                          Deadline
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">Team Members</th>
                      <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">
                        <button onClick={() => handleSort('status')} className="flex items-center gap-1 hover:text-surface-900 dark:hover:text-white">
                          Status
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-surface-600 dark:text-surface-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProjects.map((project) => (
                      <tr key={project.id} className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                              <FolderKanban className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                              <p className="font-medium text-surface-900 dark:text-white">{project.name}</p>
                              <p className="text-xs text-surface-500">{project.projectCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${PRIORITY_CONFIG[project.priority as Priority]?.bgColor} ${PRIORITY_CONFIG[project.priority as Priority]?.color}`}>
                            {PRIORITY_CONFIG[project.priority as Priority]?.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
                              <User className="h-3 w-3 text-surface-500" />
                            </div>
                            <span className="text-sm text-surface-700 dark:text-surface-300">
                              {project.projectManagerName || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-surface-600 dark:text-surface-400">
                          {formatDate(project.startDate)}
                        </td>
                        <td className="p-4 text-sm text-surface-600 dark:text-surface-400">
                          {formatDate(project.expectedEndDate)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <div className="flex -space-x-2">
                              <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-surface-900 flex items-center justify-center text-white text-xs">J</div>
                              <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white dark:border-surface-900 flex items-center justify-center text-white text-xs">A</div>
                              <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-white dark:border-surface-900 flex items-center justify-center text-white text-xs">M</div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleManageResources(project);
                              }}
                              className="ml-2 text-xs text-primary-600 hover:text-primary-700"
                            >
                              +5
                            </button>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_CONFIG[project.status as ProjectStatus]?.bgColor} ${STATUS_CONFIG[project.status as ProjectStatus]?.color}`}>
                            {STATUS_CONFIG[project.status as ProjectStatus]?.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => router.push(`/projects/${project.id}`)}
                              className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 hover:text-primary-600"
                              title="View Tasks"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(project)}
                              className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
                              title="Edit Project"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(project)}
                              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-500 hover:text-red-600"
                              title="Delete Project"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t border-surface-200 dark:border-surface-700">
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  Showing {currentPage * 20 + 1} to {Math.min((currentPage + 1) * 20, totalElements)} of {totalElements} entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-surface-600 dark:text-surface-400 px-2">
                    Page {currentPage + 1} of {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && projects.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FolderKanban className="h-12 w-12 mx-auto text-surface-400 mb-4" />
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
                No Projects Found
              </h3>
              <p className="text-surface-600 dark:text-surface-400 mb-4">
                {searchQuery || statusFilter || priorityFilter
                  ? 'No projects match your search criteria.'
                  : 'Get started by creating your first project.'}
              </p>
              {!searchQuery && !statusFilter && !priorityFilter && (
                <Button onClick={handleOpenAddModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Project
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Project Modal with Tabs */}
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              {isEditing ? 'Edit Project' : 'Add New Project'}
            </h2>
          </ModalHeader>
          <form onSubmit={handleSubmit}>
            <div className="border-b border-surface-200 dark:border-surface-700">
              <div className="flex">
                <button
                  type="button"
                  onClick={() => setActiveTab('basic')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'basic'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                  }`}
                >
                  Basic Information
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('team')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'team'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                  }`}
                >
                  Team
                </button>
              </div>
            </div>
            <ModalBody>
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Project Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Project Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Client Name
                      </label>
                      <input
                        type="text"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Client Name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={formData.expectedEndDate}
                        onChange={(e) => setFormData({ ...formData, expectedEndDate: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Priority
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Project Value ($)
                      </label>
                      <input
                        type="number"
                        value={formData.budget || ''}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Billing Type
                      </label>
                      <select
                        className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="fixed">Fixed Price</option>
                        <option value="hourly">Time & Material</option>
                        <option value="retainer">Retainer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Client Referral
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Referral source"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Project description..."
                    />
                  </div>

                  {!isEditing && (
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Project Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.projectCode}
                        onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="PROJ001"
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'team' && (
                <div className="space-y-4">
                  {teamMembers.map((member, index) => (
                    <div key={index} className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-surface-500 mb-1">Name</label>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-surface-700 border border-surface-300 dark:border-surface-600 rounded"
                            placeholder="Select member"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-surface-500 mb-1">Allocation %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={member.allocation}
                            onChange={(e) => updateTeamMember(index, 'allocation', parseInt(e.target.value))}
                            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-surface-700 border border-surface-300 dark:border-surface-600 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-surface-500 mb-1">Role</label>
                          <select
                            value={member.role}
                            onChange={(e) => updateTeamMember(index, 'role', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-surface-700 border border-surface-300 dark:border-surface-600 rounded"
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-surface-500 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={member.startDate}
                            onChange={(e) => updateTeamMember(index, 'startDate', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-surface-700 border border-surface-300 dark:border-surface-600 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-surface-500 mb-1">End Date</label>
                          <input
                            type="date"
                            value={member.endDate}
                            onChange={(e) => updateTeamMember(index, 'endDate', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-surface-700 border border-surface-300 dark:border-surface-600 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-surface-500 mb-1">Rate/hr</label>
                          <input
                            type="number"
                            value={member.ratePerHour}
                            onChange={(e) => updateTeamMember(index, 'ratePerHour', parseFloat(e.target.value))}
                            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-surface-700 border border-surface-300 dark:border-surface-600 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-surface-500 mb-1">Rate Category</label>
                          <select
                            value={member.rateCategory}
                            onChange={(e) => updateTeamMember(index, 'rateCategory', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-white dark:bg-surface-700 border border-surface-300 dark:border-surface-600 rounded"
                          >
                            {RATE_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeTeamMember(index)}
                            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addTeamMember}
                    className="flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    <UserPlus className="h-4 w-4" />
                    + Add team member
                  </button>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              {activeTab === 'basic' ? (
                <Button type="button" onClick={() => setActiveTab('team')}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : isEditing ? (
                    'Update Project'
                  ) : (
                    'Add Project'
                  )}
                </Button>
              )}
            </ModalFooter>
          </form>
        </Modal>

        {/* Resource Management Modal */}
        <Modal isOpen={showResourceModal} onClose={() => setShowResourceModal(false)} size="xl">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              Resource Management - {selectedProject?.name}
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <select className="px-3 py-2 text-sm bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg">
                    <option value="">Allocation Status</option>
                    <option value="full">Full (100%)</option>
                    <option value="partial">Partial</option>
                    <option value="available">Available</option>
                  </select>
                  <select className="px-3 py-2 text-sm bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg">
                    <option value="">Role</option>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <Button size="sm" onClick={() => setAddResourceModalOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New Resource
                </Button>
              </div>

              <div className="overflow-x-auto border border-surface-200 dark:border-surface-700 rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700">
                      <th className="text-left p-3 text-sm font-medium text-surface-600 dark:text-surface-400">Resource Name</th>
                      <th className="text-left p-3 text-sm font-medium text-surface-600 dark:text-surface-400">Allocation</th>
                      <th className="text-left p-3 text-sm font-medium text-surface-600 dark:text-surface-400">Role</th>
                      <th className="text-left p-3 text-sm font-medium text-surface-600 dark:text-surface-400">Start Date</th>
                      <th className="text-left p-3 text-sm font-medium text-surface-600 dark:text-surface-400">End Date</th>
                      <th className="text-left p-3 text-sm font-medium text-surface-600 dark:text-surface-400">Status</th>
                      <th className="text-left p-3 text-sm font-medium text-surface-600 dark:text-surface-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTeam ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary-500" />
                          <p className="text-sm text-surface-500 mt-2">Loading team members...</p>
                        </td>
                      </tr>
                    ) : projectTeamMembers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center">
                          <Users className="h-8 w-8 mx-auto text-surface-400 mb-2" />
                          <p className="text-sm text-surface-500">No team members assigned yet</p>
                          <Button size="sm" className="mt-3" onClick={() => setAddResourceModalOpen(true)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add First Resource
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      projectTeamMembers.map((member) => {
                        const initials = member.employeeName
                          ? member.employeeName.split(' ').map((n) => n[0]).join('').toUpperCase()
                          : 'U';
                        const allocationColor = member.allocationPercentage >= 100 ? 'bg-green-500' :
                          member.allocationPercentage >= 50 ? 'bg-amber-500' : 'bg-red-500';
                        return (
                          <tr key={member.id} className="border-b border-surface-100 dark:border-surface-800">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm">
                                  {initials}
                                </div>
                                <div>
                                  <span className="text-sm text-surface-900 dark:text-white block">{member.employeeName || 'Unknown'}</span>
                                  <span className="text-xs text-surface-500">{member.employeeCode}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                                  <div className={`h-full ${allocationColor}`} style={{ width: `${Math.min(member.allocationPercentage, 100)}%` }} />
                                </div>
                                <span className="text-sm text-surface-600 dark:text-surface-400">{member.allocationPercentage}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-surface-600 dark:text-surface-400">{member.role || '-'}</td>
                            <td className="p-3 text-sm text-surface-600 dark:text-surface-400">{formatDate(member.startDate)}</td>
                            <td className="p-3 text-sm text-surface-600 dark:text-surface-400">{formatDate(member.endDate)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${member.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                                {member.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleRemoveResource(member.employeeId)}
                                  className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                  title="Remove from project"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-sm text-surface-500">
                <span>Showing {projectTeamMembers.length} team member{projectTeamMembers.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowResourceModal(false)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>

        {/* Add Resource Modal */}
        <Modal isOpen={addResourceModalOpen} onClose={() => setAddResourceModalOpen(false)} size="md">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              Add New Resource
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <EmployeeSearchAutocomplete
                value={selectedEmployee}
                onChange={setSelectedEmployee}
                label="Employee"
                required
                placeholder="Search employees by name or ID..."
                excludeIds={projectTeamMembers.map((m) => m.employeeId)}
              />
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Role
                </label>
                <select
                  value={newResource.role}
                  onChange={(e) => setNewResource({ ...newResource, role: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Allocation %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newResource.allocationPercentage}
                  onChange={(e) => setNewResource({ ...newResource, allocationPercentage: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={newResource.startDate}
                    onChange={(e) => setNewResource({ ...newResource, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newResource.endDate}
                    onChange={(e) => setNewResource({ ...newResource, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setAddResourceModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignResource} disabled={!selectedEmployee || !newResource.startDate}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </ModalFooter>
        </Modal>

        {/* Project Detail Modal */}
        <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} size="lg">
          <ModalHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900">
                <FolderKanban className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-surface-500 font-mono">{selectedProject?.projectCode}</p>
                <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
                  {selectedProject?.name}
                </h2>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            {selectedProject && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_CONFIG[selectedProject.status as ProjectStatus]?.bgColor} ${STATUS_CONFIG[selectedProject.status as ProjectStatus]?.color}`}>
                    {STATUS_CONFIG[selectedProject.status as ProjectStatus]?.label}
                  </span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${PRIORITY_CONFIG[selectedProject.priority as Priority]?.bgColor} ${PRIORITY_CONFIG[selectedProject.priority as Priority]?.color}`}>
                    {PRIORITY_CONFIG[selectedProject.priority as Priority]?.label} Priority
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-surface-500 mb-1">Description</h4>
                  <p className="text-surface-700 dark:text-surface-300">
                    {selectedProject.description || 'No description provided'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Start Date
                    </p>
                    <p className="text-lg font-semibold text-surface-900 dark:text-white">
                      {formatDate(selectedProject.startDate)}
                    </p>
                  </div>
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Expected End Date
                    </p>
                    <p className="text-lg font-semibold text-surface-900 dark:text-white">
                      {formatDate(selectedProject.expectedEndDate)}
                    </p>
                  </div>
                </div>

                {(selectedProject.clientName || selectedProject.budget) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedProject.clientName && (
                      <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                        <p className="text-sm text-surface-500 flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Client
                        </p>
                        <p className="text-lg font-semibold text-surface-900 dark:text-white">
                          {selectedProject.clientName}
                        </p>
                      </div>
                    )}
                    {selectedProject.budget !== undefined && selectedProject.budget !== null && (
                      <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                        <p className="text-sm text-surface-500 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Budget
                        </p>
                        <p className="text-lg font-semibold text-surface-900 dark:text-white">
                          {formatCurrency(selectedProject.budget, selectedProject.currency)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedProject.projectManagerName && (
                  <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <p className="text-sm text-surface-500 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Project Manager
                    </p>
                    <p className="text-lg font-semibold text-surface-900 dark:text-white">
                      {selectedProject.projectManagerName}
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
              if (selectedProject) handleManageResources(selectedProject);
            }}>
              <Users className="h-4 w-4 mr-2" />
              Manage Resources
            </Button>
            <Button onClick={() => {
              setShowDetailModal(false);
              if (selectedProject) handleOpenEditModal(selectedProject);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
          </ModalFooter>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="sm">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              Delete Project
            </h2>
          </ModalHeader>
          <ModalBody>
            <p className="text-surface-600 dark:text-surface-400">
              Are you sure you want to delete <strong>{selectedProject?.name}</strong>? This action cannot be undone.
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
