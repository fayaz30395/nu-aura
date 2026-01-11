'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertTriangle, Check, Loader2, User, Briefcase, Percent, Calendar, Plus, X, MapPin } from 'lucide-react';
import { resourceManagementService } from '@/lib/services/resource-management.service';
import { employeeService } from '@/lib/services/employee.service';
import { projectService } from '@/lib/services/project.service';
import { Employee } from '@/lib/types/employee';
import { Project, CreateProjectRequest } from '@/lib/types/project';
import { AllocationValidationResult, CreateAllocationApprovalRequest, EmployeeCapacity } from '@/lib/types/resource-management';

interface CreateAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedEmployeeId?: string;
  preselectedProjectId?: string;
}

export function CreateAllocationModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedEmployeeId,
  preselectedProjectId,
}: CreateAllocationModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<AllocationValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Employee availability for selected date range
  const [employeeAvailability, setEmployeeAvailability] = useState<number | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const [formData, setFormData] = useState<{
    employeeId: string;
    projectId: string;
    clientName: string;
    allocationPercentage: number;
    role: string;
    startDate: string;
    endDate: string;
    location: string;
    reason: string;
  }>({
    employeeId: preselectedEmployeeId || '',
    projectId: preselectedProjectId || '',
    clientName: '',
    allocationPercentage: 50,
    role: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    location: '',
    reason: '',
  });

  const [employeeSearch, setEmployeeSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  // Create Project state
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProject, setNewProject] = useState<CreateProjectRequest>({
    projectCode: '',
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    clientName: '',
  });

  // Get unique clients from projects
  const clients = useMemo(() => {
    const clientSet = new Set<string>();
    projects.forEach((p) => {
      if (p.clientName) clientSet.add(p.clientName);
    });
    return Array.from(clientSet).sort();
  }, [projects]);

  // Filter projects by selected client
  const filteredProjectsByClient = useMemo(() => {
    if (!formData.clientName) return projects;
    return projects.filter((p) => p.clientName === formData.clientName);
  }, [projects, formData.clientName]);

  // Load employees and projects
  useEffect(() => {
    if (isOpen) {
      setLoadingData(true);
      Promise.all([
        employeeService.getAllEmployees(0, 100),
        projectService.getAllProjects(0, 100),
      ])
        .then(([empData, projData]) => {
          setEmployees(empData.content);
          setProjects(projData.content);
        })
        .catch((err) => {
          console.error('Failed to load data:', err);
          setError('Failed to load employees and projects');
        })
        .finally(() => setLoadingData(false));
    }
  }, [isOpen]);

  // Fetch employee availability when employee and dates change
  useEffect(() => {
    if (formData.employeeId && formData.startDate && formData.endDate) {
      setLoadingAvailability(true);
      resourceManagementService
        .getEmployeeCapacity(formData.employeeId, formData.startDate)
        .then((capacity: EmployeeCapacity) => {
          setEmployeeAvailability(capacity.availableCapacity);
        })
        .catch(() => {
          // If API fails, assume 100% available
          setEmployeeAvailability(100);
        })
        .finally(() => setLoadingAvailability(false));
    } else if (formData.employeeId && formData.startDate) {
      // If only start date is set, still fetch availability
      setLoadingAvailability(true);
      resourceManagementService
        .getEmployeeCapacity(formData.employeeId, formData.startDate)
        .then((capacity: EmployeeCapacity) => {
          setEmployeeAvailability(capacity.availableCapacity);
        })
        .catch(() => {
          setEmployeeAvailability(100);
        })
        .finally(() => setLoadingAvailability(false));
    } else {
      setEmployeeAvailability(null);
    }
  }, [formData.employeeId, formData.startDate, formData.endDate]);

  // Validate allocation when employee, project, or percentage changes
  useEffect(() => {
    if (formData.employeeId && formData.projectId && formData.allocationPercentage > 0) {
      setValidating(true);
      const timeout = setTimeout(() => {
        resourceManagementService
          .validateAllocation(
            formData.employeeId,
            formData.projectId,
            formData.allocationPercentage
          )
          .then(setValidation)
          .catch(() => setValidation(null))
          .finally(() => setValidating(false));
      }, 500);
      return () => clearTimeout(timeout);
    } else {
      setValidation(null);
    }
  }, [formData.employeeId, formData.projectId, formData.allocationPercentage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const request: CreateAllocationApprovalRequest = {
        employeeId: formData.employeeId,
        projectId: formData.projectId,
        allocationPercentage: formData.allocationPercentage,
        role: formData.role || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        reason: formData.reason || undefined,
      };

      await resourceManagementService.createAllocationRequest(request);
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create allocation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      employeeId: '',
      projectId: '',
      clientName: '',
      allocationPercentage: 50,
      role: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      location: '',
      reason: '',
    });
    setValidation(null);
    setError(null);
    setEmployeeSearch('');
    setProjectSearch('');
    setEmployeeAvailability(null);
    setShowCreateProject(false);
    setNewProject({
      projectCode: '',
      name: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      clientName: '',
    });
    onClose();
  };

  const handleCreateProject = async () => {
    if (!newProject.projectCode || !newProject.name) {
      setError('Project code and name are required');
      return;
    }

    setCreatingProject(true);
    setError(null);

    try {
      const createdProject = await projectService.createProject(newProject);
      // Add to projects list and select it
      setProjects((prev) => [createdProject, ...prev]);
      setFormData((prev) => ({
        ...prev,
        projectId: createdProject.id,
        clientName: createdProject.clientName || prev.clientName,
      }));
      setShowCreateProject(false);
      setNewProject({
        projectCode: '',
        name: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        clientName: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreatingProject(false);
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.firstName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.lastName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.employeeCode?.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const filteredProjects = filteredProjectsByClient.filter(
    (proj) =>
      proj.name?.toLowerCase().includes(projectSearch.toLowerCase()) ||
      proj.projectCode?.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const selectedEmployee = employees.find((e) => e.id === formData.employeeId);
  const selectedProject = projects.find((p) => p.id === formData.projectId);

  // Check if dates are selected (Nu-TMS workflow: dates first)
  const datesSelected = formData.startDate && formData.endDate;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalHeader onClose={handleClose}>Add Allocation</ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-5">
          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : (
            <>
              {/* Step 1: Select Dates First (Nu-TMS Workflow) */}
              <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
                <h4 className="text-sm font-medium text-surface-800 dark:text-surface-200 mb-3">
                  Step 1: Select Date Range
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-surface-600 dark:text-surface-400">
                      <Calendar className="inline-block h-3 w-3 mr-1" />
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-surface-600 dark:text-surface-400">
                      <Calendar className="inline-block h-3 w-3 mr-1" />
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      min={formData.startDate}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Employee Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                  <User className="inline-block h-4 w-4 mr-1" />
                  Step 2: Select Employee
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search with employee ID for details..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="max-h-40 overflow-y-auto border border-surface-200 dark:border-surface-700 rounded-lg">
                    {filteredEmployees.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-surface-500">No employees found</div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, employeeId: emp.id });
                            setEmployeeSearch('');
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-between ${
                            formData.employeeId === emp.id
                              ? 'bg-primary-50 dark:bg-primary-900/30'
                              : ''
                          }`}
                        >
                          <span>
                            {emp.employeeCode} - {emp.firstName} {emp.lastName}
                          </span>
                          {formData.employeeId === emp.id && (
                            <Check className="h-4 w-4 text-primary-600" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                {selectedEmployee && (
                  <div className="text-sm text-surface-600 dark:text-surface-400 bg-surface-50 dark:bg-surface-800 rounded-lg p-3">
                    <div className="font-medium">{selectedEmployee.firstName} {selectedEmployee.lastName}</div>
                    {selectedEmployee.designation && (
                      <div className="text-xs text-surface-500">{selectedEmployee.designation}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Availability Display (shown after employee and dates selected) */}
              {formData.employeeId && formData.startDate && formData.endDate && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Availability for Selected Period
                  </h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-blue-700 dark:text-blue-300">
                        <th className="py-1">Start Date</th>
                        <th className="py-1">End Date</th>
                        <th className="py-1">Availability</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-blue-900 dark:text-blue-100">
                        <td className="py-1">{formData.startDate}</td>
                        <td className="py-1">{formData.endDate}</td>
                        <td className="py-1 font-medium">
                          {loadingAvailability ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            `${employeeAvailability ?? 100}%`
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Step 3: Client & Project Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                    <Briefcase className="inline-block h-4 w-4 mr-1" />
                    Step 3: Select Client & Project
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateProject(!showCreateProject)}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {showCreateProject ? (
                      <>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Create New Project
                      </>
                    )}
                  </Button>
                </div>

                {/* Create Project Form */}
                {showCreateProject ? (
                  <div className="border border-primary-200 dark:border-primary-800 rounded-lg p-4 bg-primary-50/50 dark:bg-primary-900/20 space-y-3">
                    <h4 className="text-sm font-medium text-surface-800 dark:text-surface-200">New Project Details</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-surface-600 dark:text-surface-400 mb-1">Project Code *</label>
                        <Input
                          type="text"
                          placeholder="e.g., PRJ-001"
                          value={newProject.projectCode}
                          onChange={(e) => setNewProject({ ...newProject, projectCode: e.target.value.toUpperCase() })}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-surface-600 dark:text-surface-400 mb-1">Project Name *</label>
                        <Input
                          type="text"
                          placeholder="Project name"
                          value={newProject.name}
                          onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-surface-600 dark:text-surface-400 mb-1">Client Name</label>
                        <Input
                          type="text"
                          placeholder="Client name"
                          value={newProject.clientName || ''}
                          onChange={(e) => setNewProject({ ...newProject, clientName: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-surface-600 dark:text-surface-400 mb-1">Start Date</label>
                        <Input
                          type="date"
                          value={newProject.startDate}
                          onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-surface-600 dark:text-surface-400 mb-1">Status</label>
                        <select
                          value={newProject.status}
                          onChange={(e) => setNewProject({ ...newProject, status: e.target.value as CreateProjectRequest['status'] })}
                          className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                        >
                          <option value="PLANNED">Planned</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="ON_HOLD">On Hold</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-surface-600 dark:text-surface-400 mb-1">Priority</label>
                        <select
                          value={newProject.priority}
                          onChange={(e) => setNewProject({ ...newProject, priority: e.target.value as CreateProjectRequest['priority'] })}
                          className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleCreateProject}
                      disabled={creatingProject || !newProject.projectCode || !newProject.name}
                      className="w-full"
                    >
                      {creatingProject ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Project...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Project
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Client Selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-surface-600 dark:text-surface-400 mb-1">Client</label>
                        <select
                          value={formData.clientName}
                          onChange={(e) => setFormData({ ...formData, clientName: e.target.value, projectId: '' })}
                          className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                        >
                          <option value="">All Clients</option>
                          {clients.map((client) => (
                            <option key={client} value={client}>{client}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-surface-600 dark:text-surface-400 mb-1">Project</label>
                        <select
                          value={formData.projectId}
                          onChange={(e) => {
                            const project = projects.find((p) => p.id === e.target.value);
                            setFormData({
                              ...formData,
                              projectId: e.target.value,
                              clientName: project?.clientName || formData.clientName,
                            });
                          }}
                          className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
                        >
                          <option value="">Select Project</option>
                          {filteredProjects.map((proj) => (
                            <option key={proj.id} value={proj.id}>
                              {proj.name} ({proj.projectCode})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Alternative: Search Projects */}
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Or search projects..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="mb-2"
                      />
                      {projectSearch && (
                        <div className="max-h-32 overflow-y-auto border border-surface-200 dark:border-surface-700 rounded-lg absolute z-10 bg-white dark:bg-surface-800 w-full shadow-lg">
                          {filteredProjects.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-surface-500">
                              No projects found.{' '}
                              <button
                                type="button"
                                onClick={() => setShowCreateProject(true)}
                                className="text-primary-600 hover:underline"
                              >
                                Create a new project
                              </button>
                            </div>
                          ) : (
                            filteredProjects.map((proj) => (
                              <button
                                key={proj.id}
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    projectId: proj.id,
                                    clientName: proj.clientName || formData.clientName,
                                  });
                                  setProjectSearch('');
                                }}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-between ${
                                  formData.projectId === proj.id
                                    ? 'bg-primary-50 dark:bg-primary-900/30'
                                    : ''
                                }`}
                              >
                                <span>
                                  {proj.name}
                                  <span className="ml-2 text-surface-500">({proj.projectCode})</span>
                                </span>
                                {formData.projectId === proj.id && (
                                  <Check className="h-4 w-4 text-primary-600" />
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {selectedProject && (
                      <div className="text-sm text-surface-600 dark:text-surface-400 bg-surface-50 dark:bg-surface-800 rounded-lg p-3">
                        Selected: <strong>{selectedProject.name}</strong> ({selectedProject.projectCode})
                        {selectedProject.clientName && (
                          <span className="text-xs ml-2">- {selectedProject.clientName}</span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Step 4: Allocation Details */}
              <div className="grid grid-cols-2 gap-4">
                {/* Allocation Percentage */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                    <Percent className="inline-block h-4 w-4 mr-1" />
                    Allocation %
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="5"
                      max={employeeAvailability ?? 100}
                      value={formData.allocationPercentage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allocationPercentage: Math.min(
                            employeeAvailability ?? 100,
                            Math.max(5, parseInt(e.target.value) || 5)
                          ),
                        })
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-surface-500">
                      (max: {employeeAvailability ?? 100}%)
                    </span>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                    <MapPin className="inline-block h-4 w-4 mr-1" />
                    Location
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Chennai-India"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                  Role (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Developer, Tech Lead, QA"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
              </div>

              {/* Validation Result */}
              {validating && (
                <div className="flex items-center gap-2 text-sm text-surface-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validating allocation...
                </div>
              )}
              {validation && !validating && (
                <div
                  className={`rounded-lg p-4 ${
                    validation.requiresApproval
                      ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                      : validation.isValid
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {validation.requiresApproval ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    ) : validation.isValid ? (
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p
                        className={`font-medium ${
                          validation.requiresApproval
                            ? 'text-amber-700 dark:text-amber-300'
                            : validation.isValid
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-red-700 dark:text-red-300'
                        }`}
                      >
                        {validation.message}
                      </p>
                      <div className="mt-2 text-sm text-surface-600 dark:text-surface-400 space-y-1">
                        <p>Current allocation: {validation.currentTotalAllocation}%</p>
                        <p>Proposed: +{validation.proposedAllocation}%</p>
                        <p className="font-medium">Resulting: {validation.resultingAllocation}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reason (required if requires approval) */}
              {validation?.requiresApproval && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                    Reason for Over-allocation
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-4 py-2 text-surface-900 dark:text-surface-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    rows={3}
                    placeholder="Please provide a reason for this over-allocation request..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    required={validation.requiresApproval}
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={
              !formData.employeeId ||
              !formData.projectId ||
              !formData.startDate ||
              !formData.endDate ||
              submitting ||
              loadingData ||
              (validation?.requiresApproval && !formData.reason)
            }
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Allocating...
              </>
            ) : validation?.requiresApproval ? (
              'Submit for Approval'
            ) : (
              'Allocate'
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
