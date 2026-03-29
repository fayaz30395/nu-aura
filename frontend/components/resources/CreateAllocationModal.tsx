'use client';

import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/utils/logger';
import {
  AlertTriangle,
  Check,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { employeeService } from '@/lib/services/employee.service';
import { projectService } from '@/lib/services/project.service';
import { Employee } from '@/lib/types/employee';
import { Project, CreateProjectRequest, AssignEmployeeRequest, ProjectEmployee } from '@/lib/types/project';
import { ProjectStep } from './ProjectStep';
import { EmployeeStep } from './EmployeeStep';
import type { EmployeeAllocation, EmployeeCapacityMap } from './EmployeeStep';

// ─── Types ────────────────────────────────────────────────────────────
interface CreateAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedEmployeeId?: string;
  preselectedProjectId?: string;
}

type Step = 'project' | 'employees';

// ─── CreateAllocationModal (Wizard Orchestrator) ──────────────────────
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

  const [resourcesNeeded, setResourcesNeeded] = useState<number>(1);
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

  // Load employees and projects when modal opens
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
          logger.error('Failed to load data:', err);
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

  // ─── Employee capacity helpers ───────────────────────────────────────
  const getEmployeeAvailableCapacity = (employeeId: string): number => {
    const capacity = employeeCapacities.get(employeeId);
    if (!capacity) return 100;
    return Math.max(0, 100 - capacity.total);
  };

  const fetchEmployeeCapacity = async (employeeId: string): Promise<number> => {
    if (employeeCapacities.has(employeeId)) return getEmployeeAvailableCapacity(employeeId);

    try {
      setLoadingCapacity(employeeId);
      const allocs = await projectService.getEmployeeAllocations(employeeId);
      const activeAllocations = allocs.filter((a: ProjectEmployee) => a.isActive);
      const totalAllocated = activeAllocations.reduce((sum: number, a: ProjectEmployee) => sum + a.allocationPercentage, 0);

      setEmployeeCapacities((prev) => {
        const newMap = new Map(prev);
        newMap.set(employeeId, { total: totalAllocated, projects: activeAllocations });
        return newMap;
      });

      return Math.max(0, 100 - totalAllocated);
    } catch (err) {
      logger.error('Failed to fetch employee capacity:', err);
      return 100;
    } finally {
      setLoadingCapacity(null);
    }
  };

  // ─── Employee allocation handlers ────────────────────────────────────
  const handleAddEmployee = async (employee: Employee) => {
    const availableCapacity = await fetchEmployeeCapacity(employee.id);

    if (availableCapacity <= 0) {
      setError(`${employee.firstName} ${employee.lastName} is fully allocated (100%) across other projects.`);
      return;
    }

    const totalAllocationNeeded = resourcesNeeded * 100;
    const currentAllocation = allocations.reduce((sum, a) => sum + a.allocationPercentage, 0);
    const remainingProjectAllocation = Math.max(0, totalAllocationNeeded - currentAllocation);
    const suggestedAllocation = Math.min(availableCapacity, remainingProjectAllocation || availableCapacity, 100);
    const finalAllocation = Math.max(5, suggestedAllocation);
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
        if (field === 'allocationPercentage') {
          const numValue = typeof value === 'string' ? parseInt(value) || 0 : value;
          const clampedValue = Math.min(numValue, a.availableCapacity);
          return { ...a, [field]: clampedValue };
        }
        return { ...a, [field]: value };
      })
    );
  };

  // ─── Step navigation handlers ────────────────────────────────────────
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalHeader onClose={handleClose}>
        <div className="flex items-center gap-2">
          <span>Add Allocation</span>
          <div className="flex items-center gap-2 text-sm font-normal text-surface-500">
            <span className={step === 'project' ? 'text-accent-700 font-medium' : ''}>1. Project</span>
            <ArrowRight className="h-4 w-4" />
            <span className={step === 'employees' ? 'text-accent-700 font-medium' : ''}>2. Employees</span>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-5">
        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-accent-700" />
          </div>
        ) : step === 'project' ? (
          <ProjectStep
            useExistingProject={useExistingProject}
            onUseExistingProjectChange={setUseExistingProject}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectedProjectIdChange={setSelectedProjectId}
            projectData={projectData}
            onProjectDataChange={setProjectData}
            resourcesNeeded={resourcesNeeded}
            onResourcesNeededChange={setResourcesNeeded}
            employees={employees}
          />
        ) : (
          <EmployeeStep
            createdProject={createdProject}
            resourcesNeeded={resourcesNeeded}
            allocations={allocations}
            employees={employees}
            employeeSearch={employeeSearch}
            onEmployeeSearchChange={setEmployeeSearch}
            showEmployeeDropdown={showEmployeeDropdown}
            onShowEmployeeDropdownChange={setShowEmployeeDropdown}
            employeeCapacities={employeeCapacities}
            loadingCapacity={loadingCapacity}
            onAddEmployee={handleAddEmployee}
            onRemoveEmployee={handleRemoveEmployee}
            onAllocationChange={handleAllocationChange}
          />
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-danger-50 dark:bg-danger-900/20 p-4 text-danger-700 dark:text-danger-300 flex items-center gap-2">
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
            <Button type="button" variant="outline" onClick={() => setStep('project')} disabled={submitting}>
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
