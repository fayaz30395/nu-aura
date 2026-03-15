'use client';

import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  AlertTriangle,
  Check,
  Loader2,
  User,
  Users,
  Briefcase,
  Percent,
  Calendar,
  Plus,
  Trash2,
  DollarSign,
  Building2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { employeeService } from '@/lib/services/employee.service';
import { projectService } from '@/lib/services/project.service';
import { Employee } from '@/lib/types/employee';
import { Project, CreateProjectRequest, AssignEmployeeRequest, ProjectEmployee } from '@/lib/types/project';

interface CreateAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedEmployeeId?: string;
  preselectedProjectId?: string;
}

interface EmployeeAllocation {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  role: string;
  allocationPercentage: number;
  startDate: string;
  endDate: string;
  availableCapacity: number; // How much % is available for this employee
  existingAllocations: number; // Total % already allocated across other projects
}

// Map to store employee's existing allocations (employeeId -> total allocated %)
type EmployeeCapacityMap = Map<string, { total: number; projects: ProjectEmployee[] }>;

type Step = 'project' | 'employees';

export function CreateAllocationModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedProjectId,
}: CreateAllocationModalProps) {
  const [step, setStep] = useState<Step>('project');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Project form state
  const [projectData, setProjectData] = useState<CreateProjectRequest>({
    projectCode: '',
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: '',
    status: 'PLANNED',
    priority: 'MEDIUM',
    projectManagerId: '',
    clientName: '',
    clientContact: '',
    clientNotes: '',
    budget: undefined,
    currency: 'USD',
  });

  // Number of resources needed for the project
  const [resourcesNeeded, setResourcesNeeded] = useState<number>(1);

  // For existing project selection
  const [useExistingProject, setUseExistingProject] = useState(!!preselectedProjectId);
  const [selectedProjectId, setSelectedProjectId] = useState(preselectedProjectId || '');
  const [createdProject, setCreatedProject] = useState<Project | null>(null);

  // Employee allocations state
  const [allocations, setAllocations] = useState<EmployeeAllocation[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  // Track employee capacities (existing allocations across all projects)
  const [employeeCapacities, setEmployeeCapacities] = useState<EmployeeCapacityMap>(new Map());
  const [loadingCapacity, setLoadingCapacity] = useState<string | null>(null);

  // Load employees and projects
  useEffect(() => {
    if (isOpen) {
      setLoadingData(true);
      setError(null);
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
          const errorMessage = err?.response?.data?.message || err?.message || 'Unknown error';
          const statusCode = err?.response?.status;
          if (statusCode === 403) {
            setError('Access denied. You may not have permission to view employees or projects.');
          } else if (statusCode === 401) {
            setError('Session expired. Please log in again.');
          } else {
            setError(`Failed to load data: ${errorMessage}`);
          }
        })
        .finally(() => setLoadingData(false));
    }
  }, [isOpen]);

  // Filter employees for search
  const filteredEmployees = employees.filter(
    (emp) =>
      !allocations.some((a) => a.employeeId === emp.id) &&
      (emp.firstName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.lastName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(employeeSearch.toLowerCase()))
  );

  // Get employee's available capacity (100% - existing allocations)
  const getEmployeeAvailableCapacity = (employeeId: string): number => {
    const capacity = employeeCapacities.get(employeeId);
    if (!capacity) return 100; // Default to 100% if not loaded yet
    return Math.max(0, 100 - capacity.total);
  };

  // Fetch employee's existing allocations
  const fetchEmployeeCapacity = async (employeeId: string): Promise<number> => {
    // Check cache first
    if (employeeCapacities.has(employeeId)) {
      return getEmployeeAvailableCapacity(employeeId);
    }

    try {
      setLoadingCapacity(employeeId);
      const allocations = await projectService.getEmployeeAllocations(employeeId);
      // Only count active allocations
      const activeAllocations = allocations.filter((a) => a.isActive);
      const totalAllocated = activeAllocations.reduce((sum, a) => sum + a.allocationPercentage, 0);

      setEmployeeCapacities((prev) => {
        const newMap = new Map(prev);
        newMap.set(employeeId, { total: totalAllocated, projects: activeAllocations });
        return newMap;
      });

      return Math.max(0, 100 - totalAllocated);
    } catch (err) {
      console.error('Failed to fetch employee capacity:', err);
      return 100; // Default to 100% on error
    } finally {
      setLoadingCapacity(null);
    }
  };

  const handleAddEmployee = async (employee: Employee) => {
    // Fetch employee's available capacity
    const availableCapacity = await fetchEmployeeCapacity(employee.id);

    if (availableCapacity <= 0) {
      setError(`${employee.firstName} ${employee.lastName} is fully allocated (100%) across other projects.`);
      return;
    }

    // Calculate remaining allocation needed for this project
    const totalAllocationNeeded = resourcesNeeded * 100;
    const currentAllocation = allocations.reduce((sum, a) => sum + a.allocationPercentage, 0);
    const remainingProjectAllocation = Math.max(0, totalAllocationNeeded - currentAllocation);

    // Suggest allocation: minimum of (remaining project need, employee available capacity, 100%)
    const suggestedAllocation = Math.min(availableCapacity, remainingProjectAllocation || availableCapacity, 100);
    const finalAllocation = Math.max(5, suggestedAllocation); // At least 5%

    const existingTotal = 100 - availableCapacity;

    const newAllocation: EmployeeAllocation = {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeCode: employee.employeeCode || '',
      role: '',
      allocationPercentage: finalAllocation,
      startDate: projectData.startDate,
      endDate: projectData.expectedEndDate || '',
      availableCapacity: availableCapacity,
      existingAllocations: existingTotal,
    };
    setAllocations([...allocations, newAllocation]);
    setEmployeeSearch('');
    setShowEmployeeDropdown(false);
    setError(null);
  };

  const handleRemoveEmployee = (employeeId: string) => {
    setAllocations(allocations.filter((a) => a.employeeId !== employeeId));
  };

  const handleAllocationChange = (employeeId: string, field: keyof EmployeeAllocation, value: string | number) => {
    setAllocations(
      allocations.map((a) => {
        if (a.employeeId !== employeeId) return a;

        // If changing allocation percentage, validate against available capacity
        if (field === 'allocationPercentage') {
          const numValue = typeof value === 'string' ? parseInt(value) || 0 : value;
          const maxAllowed = a.availableCapacity;
          const clampedValue = Math.min(numValue, maxAllowed);
          return { ...a, [field]: clampedValue };
        }

        return { ...a, [field]: value };
      })
    );
  };

  const handleCreateProject = async () => {
    if (!projectData.projectCode || !projectData.name) {
      setError('Project Code and Name are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await projectService.createProject(projectData);
      setCreatedProject(created);
      setStep('employees');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectExistingProject = () => {
    if (!selectedProjectId) {
      setError('Please select a project');
      return;
    }
    const project = projects.find((p) => p.id === selectedProjectId);
    if (project) {
      setCreatedProject(project);
      setStep('employees');
    }
  };

  const handleSubmitAllocations = async () => {
    if (allocations.length === 0) {
      setError('Please add at least one employee');
      return;
    }

    const projectId = createdProject?.id || selectedProjectId;
    if (!projectId) {
      setError('No project selected');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Assign all employees to the project
      for (const allocation of allocations) {
        const request: AssignEmployeeRequest = {
          employeeId: allocation.employeeId,
          role: allocation.role || undefined,
          allocationPercentage: allocation.allocationPercentage,
          startDate: allocation.startDate,
          endDate: allocation.endDate || undefined,
        };
        await projectService.assignEmployee(projectId, request);
      }

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign employees');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('project');
    setProjectData({
      projectCode: '',
      name: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      expectedEndDate: '',
      status: 'PLANNED',
      priority: 'MEDIUM',
      projectManagerId: '',
      clientName: '',
      clientContact: '',
      clientNotes: '',
      budget: undefined,
      currency: 'USD',
    });
    setResourcesNeeded(1);
    setAllocations([]);
    setError(null);
    setEmployeeSearch('');
    setCreatedProject(null);
    setSelectedProjectId('');
    setUseExistingProject(false);
    onClose();
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalHeader onClose={handleClose}>
        <div className="flex items-center gap-3">
          <span>Add Allocation</span>
          <div className="flex items-center gap-2 text-sm font-normal text-surface-500">
            <span className={step === 'project' ? 'text-primary-600 font-medium' : ''}>
              1. Project
            </span>
            <ArrowRight className="h-4 w-4" />
            <span className={step === 'employees' ? 'text-primary-600 font-medium' : ''}>
              2. Employees
            </span>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-5">
        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : step === 'project' ? (
          <>
            {/* Toggle between new/existing project */}
            <div className="flex gap-4 p-1 bg-surface-100 dark:bg-surface-800 rounded-lg">
              <button
                type="button"
                onClick={() => setUseExistingProject(false)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  !useExistingProject
                    ? 'bg-[var(--bg-surface)] shadow text-primary-600'
                    : 'text-surface-600 dark:text-surface-400 hover:text-surface-900'
                }`}
              >
                <Plus className="inline-block h-4 w-4 mr-2" />
                Create New Project
              </button>
              <button
                type="button"
                onClick={() => setUseExistingProject(true)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  useExistingProject
                    ? 'bg-[var(--bg-surface)] shadow text-primary-600'
                    : 'text-surface-600 dark:text-surface-400 hover:text-surface-900'
                }`}
              >
                <Briefcase className="inline-block h-4 w-4 mr-2" />
                Select Existing Project
              </button>
            </div>

            {useExistingProject ? (
              /* Existing Project Selection */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Select Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-[var(--bg-input)] px-4 py-2.5"
                  >
                    <option value="">Choose a project...</option>
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name} ({proj.projectCode}) - {proj.clientName || 'No Client'}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProject && (
                  <div className="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
                    <h4 className="font-medium text-surface-800 dark:text-surface-200 mb-2">
                      {selectedProject.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-surface-600 dark:text-surface-400">
                      <div>Code: {selectedProject.projectCode}</div>
                      <div>Status: {selectedProject.status}</div>
                      <div>Client: {selectedProject.clientName || 'N/A'}</div>
                      <div>Manager: {selectedProject.projectManagerName || 'N/A'}</div>
                      <div>Start: {selectedProject.startDate}</div>
                      <div>End: {selectedProject.expectedEndDate || 'N/A'}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* New Project Form */
              <div className="space-y-4">
                {/* Row 1: Name & Code */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Project Name *
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., Website Redesign"
                      value={projectData.name}
                      onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Project ID/Code *
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., PRJ-001"
                      value={projectData.projectCode}
                      onChange={(e) => setProjectData({ ...projectData, projectCode: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Start & End Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      <Calendar className="inline-block h-4 w-4 mr-1" />
                      Start Date *
                    </label>
                    <Input
                      type="date"
                      value={projectData.startDate}
                      onChange={(e) => setProjectData({ ...projectData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      <Calendar className="inline-block h-4 w-4 mr-1" />
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={projectData.expectedEndDate}
                      onChange={(e) => setProjectData({ ...projectData, expectedEndDate: e.target.value })}
                      min={projectData.startDate}
                    />
                  </div>
                </div>

                {/* Row 3: Resources Needed & Manager */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      <Users className="inline-block h-4 w-4 mr-1" />
                      Resources Needed *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      placeholder="Number of employees needed"
                      value={resourcesNeeded}
                      onChange={(e) => setResourcesNeeded(Math.max(1, parseInt(e.target.value) || 1))}
                      required
                    />
                    <p className="text-xs text-surface-500 mt-1">
                      How many employees will be allocated to this project?
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      <User className="inline-block h-4 w-4 mr-1" />
                      Project Manager
                    </label>
                    <select
                      value={projectData.projectManagerId}
                      onChange={(e) => setProjectData({ ...projectData, projectManagerId: e.target.value })}
                      className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-[var(--bg-input)] px-4 py-2.5"
                    >
                      <option value="">Select Manager</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 4: Budget */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      <DollarSign className="inline-block h-4 w-4 mr-1" />
                      Budget
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={projectData.budget || ''}
                        onChange={(e) => setProjectData({ ...projectData, budget: parseFloat(e.target.value) || undefined })}
                        className="flex-1"
                      />
                      <select
                        value={projectData.currency}
                        onChange={(e) => setProjectData({ ...projectData, currency: e.target.value })}
                        className="w-24 rounded-lg border border-surface-300 dark:border-surface-600 bg-[var(--bg-input)] px-2"
                      >
                        <option value="USD">USD</option>
                        <option value="INR">INR</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Client Information Section */}
                <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
                  <h4 className="text-sm font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    Client Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Client Name
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g., Acme Corp"
                        value={projectData.clientName}
                        onChange={(e) => setProjectData({ ...projectData, clientName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Client Contact
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g., john@acme.com"
                        value={projectData.clientContact}
                        onChange={(e) => setProjectData({ ...projectData, clientContact: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                      Client Notes
                    </label>
                    <textarea
                      placeholder="Any additional notes about the client or project requirements..."
                      value={projectData.clientNotes}
                      onChange={(e) => setProjectData({ ...projectData, clientNotes: e.target.value })}
                      className="w-full rounded-lg border border-surface-300 dark:border-surface-600 bg-[var(--bg-input)] px-4 py-2 text-sm min-h-[80px]"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Step 2: Add Employees */
          <>
            {/* Calculate total allocation */}
            {(() => {
              const totalAllocationNeeded = resourcesNeeded * 100;
              const currentAllocation = allocations.reduce((sum, a) => sum + a.allocationPercentage, 0);
              const remainingAllocation = totalAllocationNeeded - currentAllocation;
              const allocationProgress = Math.min(100, (currentAllocation / totalAllocationNeeded) * 100);
              const isComplete = currentAllocation >= totalAllocationNeeded;
              const isOverAllocated = currentAllocation > totalAllocationNeeded;

              return (
                <>
                  {/* Project Summary */}
                  <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 border border-primary-200 dark:border-primary-800">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-primary-800 dark:text-primary-200">
                          {createdProject?.name}
                        </h4>
                        <p className="text-sm text-primary-600 dark:text-primary-400">
                          {createdProject?.projectCode} | {createdProject?.clientName || 'No Client'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-primary-600 dark:text-primary-400">
                          {createdProject?.startDate} - {createdProject?.expectedEndDate || 'Ongoing'}
                        </div>
                      </div>
                    </div>

                    {/* Allocation Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-primary-700 dark:text-primary-300">
                          {resourcesNeeded} Resource{resourcesNeeded !== 1 ? 's' : ''} Needed = {totalAllocationNeeded}% Total Allocation
                        </span>
                        <span className={isComplete ? (isOverAllocated ? 'text-amber-600 font-medium' : 'text-green-600 font-medium') : 'text-primary-600'}>
                          {currentAllocation}% / {totalAllocationNeeded}%
                        </span>
                      </div>
                      <div className="w-full bg-primary-200 dark:bg-primary-800 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${
                            isOverAllocated ? 'bg-amber-500' : isComplete ? 'bg-green-500' : 'bg-primary-600'
                          }`}
                          style={{ width: `${Math.min(100, allocationProgress)}%` }}
                        />
                      </div>
                      <div className="text-xs text-primary-500 dark:text-primary-400">
                        {allocations.length} employee{allocations.length !== 1 ? 's' : ''} added
                      </div>
                    </div>
                  </div>

                  {/* Allocation Status Message */}
                  {!isComplete && remainingAllocation > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                      <Percent className="inline-block h-4 w-4 mr-2" />
                      <strong>{remainingAllocation}%</strong> allocation remaining to reach {totalAllocationNeeded}%.
                      <div className="mt-2 text-xs opacity-90 space-y-1">
                        <div className="font-medium">Possible combinations:</div>
                        <div className="flex flex-wrap gap-2">
                          {remainingAllocation >= 100 && (
                            <span className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">
                              {Math.floor(remainingAllocation / 100)} × 100%
                            </span>
                          )}
                          {remainingAllocation >= 50 && (
                            <span className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">
                              {Math.floor(remainingAllocation / 50)} × 50%
                            </span>
                          )}
                          {remainingAllocation >= 25 && (
                            <span className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">
                              {Math.floor(remainingAllocation / 25)} × 25%
                            </span>
                          )}
                          {remainingAllocation >= 20 && (
                            <span className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">
                              {Math.floor(remainingAllocation / 20)} × 20%
                            </span>
                          )}
                          {remainingAllocation >= 10 && remainingAllocation < 20 && (
                            <span className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">
                              {Math.floor(remainingAllocation / 10)} × 10%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {isOverAllocated && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="inline-block h-4 w-4 mr-2" />
                      Over-allocated by {currentAllocation - totalAllocationNeeded}%. You have allocated more than the {resourcesNeeded} resource{resourcesNeeded !== 1 ? 's' : ''} needed.
                    </div>
                  )}
                  {isComplete && !isOverAllocated && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
                      <Check className="inline-block h-4 w-4 mr-2" />
                      Allocation complete! {currentAllocation}% allocated across {allocations.length} employee{allocations.length !== 1 ? 's' : ''}.
                    </div>
                  )}
                </>
              );
            })()}

            {/* Add Employee Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                <User className="inline-block h-4 w-4 mr-1" />
                Add Employees
              </label>
              <Input
                type="text"
                placeholder="Search employees by name or ID..."
                value={employeeSearch}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value);
                  setShowEmployeeDropdown(true);
                }}
                onFocus={() => setShowEmployeeDropdown(true)}
              />
              {showEmployeeDropdown && employeeSearch && (
                <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto bg-[var(--bg-input)] border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg">
                  {filteredEmployees.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-surface-500">No employees found</div>
                  ) : (
                    filteredEmployees.slice(0, 10).map((emp) => {
                      const capacityInfo = employeeCapacities.get(emp.id);
                      const availableCapacity = capacityInfo ? Math.max(0, 100 - capacityInfo.total) : null;
                      const isLoading = loadingCapacity === emp.id;
                      const isFullyAllocated = availableCapacity !== null && availableCapacity <= 0;

                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => handleAddEmployee(emp)}
                          disabled={isLoading || isFullyAllocated}
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between ${
                            isFullyAllocated
                              ? 'bg-surface-50 dark:bg-surface-900 opacity-60 cursor-not-allowed'
                              : 'hover:bg-surface-100 dark:hover:bg-surface-700'
                          }`}
                        >
                          <div>
                            <div className="font-medium">
                              {emp.employeeCode} - {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-xs text-surface-500">{emp.designation}</div>
                          </div>
                          <div className="text-right">
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                            ) : availableCapacity !== null ? (
                              <div className={`text-xs font-medium ${
                                isFullyAllocated
                                  ? 'text-red-500'
                                  : availableCapacity <= 25
                                    ? 'text-amber-500'
                                    : 'text-green-500'
                              }`}>
                                {isFullyAllocated ? (
                                  <span className="flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Fully Allocated
                                  </span>
                                ) : (
                                  `${availableCapacity}% available`
                                )}
                              </div>
                            ) : null}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Employee Allocations Table */}
            {allocations.length > 0 && (
              <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface-50 dark:bg-surface-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-surface-700 dark:text-surface-300">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-surface-700 dark:text-surface-300">
                        Role
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-surface-700 dark:text-surface-300">
                        Allocation %
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-surface-700 dark:text-surface-300">
                        Start Date
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-surface-700 dark:text-surface-300">
                        End Date
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-surface-700 dark:text-surface-300 w-12">

                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((allocation) => {
                      const totalWithThis = allocation.existingAllocations + allocation.allocationPercentage;
                      const isAtCapacity = allocation.allocationPercentage >= allocation.availableCapacity;
                      const isNearCapacity = allocation.availableCapacity - allocation.allocationPercentage <= 10;

                      return (
                        <tr
                          key={allocation.employeeId}
                          className="border-t border-surface-200 dark:border-surface-700"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-surface-800 dark:text-surface-200">
                              {allocation.employeeName}
                            </div>
                            <div className="text-xs text-surface-500">{allocation.employeeCode}</div>
                            {/* Capacity indicator */}
                            <div className="mt-1 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                                {/* Existing allocations (gray) */}
                                <div className="h-full flex">
                                  <div
                                    className="h-full bg-surface-400 dark:bg-surface-500"
                                    style={{ width: `${allocation.existingAllocations}%` }}
                                  />
                                  {/* This allocation (colored) */}
                                  <div
                                    className={`h-full ${
                                      isAtCapacity
                                        ? 'bg-amber-500'
                                        : isNearCapacity
                                          ? 'bg-yellow-500'
                                          : 'bg-primary-500'
                                    }`}
                                    style={{ width: `${allocation.allocationPercentage}%` }}
                                  />
                                </div>
                              </div>
                              <span className={`text-xs font-medium whitespace-nowrap ${
                                isAtCapacity ? 'text-amber-600' : 'text-surface-500'
                              }`}>
                                {totalWithThis}%
                              </span>
                            </div>
                            {allocation.existingAllocations > 0 && (
                              <div className="text-xs text-surface-400 mt-0.5">
                                {allocation.existingAllocations}% in other projects
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="text"
                              placeholder="e.g., Developer"
                              value={allocation.role}
                              onChange={(e) =>
                                handleAllocationChange(allocation.employeeId, 'role', e.target.value)
                              }
                              className="text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="5"
                                  max={allocation.availableCapacity}
                                  value={allocation.allocationPercentage}
                                  onChange={(e) =>
                                    handleAllocationChange(
                                      allocation.employeeId,
                                      'allocationPercentage',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className={`w-20 text-center text-sm ${
                                    isAtCapacity ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : ''
                                  }`}
                                />
                                <Percent className="h-4 w-4 text-surface-400" />
                              </div>
                              <div className={`text-xs ${
                                isAtCapacity ? 'text-amber-600 font-medium' : 'text-surface-400'
                              }`}>
                                max: {allocation.availableCapacity}%
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="date"
                              value={allocation.startDate}
                              onChange={(e) =>
                                handleAllocationChange(allocation.employeeId, 'startDate', e.target.value)
                              }
                              className="text-sm"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="date"
                              value={allocation.endDate}
                              onChange={(e) =>
                                handleAllocationChange(allocation.employeeId, 'endDate', e.target.value)
                              }
                              min={allocation.startDate}
                              className="text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveEmployee(allocation.employeeId)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {allocations.length === 0 && (
              <div className="text-center py-8 text-surface-500">
                <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No employees added yet</p>
                <p className="text-sm">Search and add employees to allocate to this project</p>
              </div>
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {step === 'project' ? (
          <>
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={useExistingProject ? handleSelectExistingProject : handleCreateProject}
              disabled={
                submitting ||
                (useExistingProject ? !selectedProjectId : !projectData.projectCode || !projectData.name)
              }
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {useExistingProject ? 'Loading...' : 'Creating...'}
                </>
              ) : (
                <>
                  Next: Add Employees
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('project')}
              disabled={submitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmitAllocations}
              disabled={submitting || allocations.length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Allocating...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Allocate {allocations.length} Employee{allocations.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
