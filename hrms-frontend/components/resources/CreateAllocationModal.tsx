'use client';

import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertTriangle, Check, Loader2, User, Briefcase, Percent, Calendar } from 'lucide-react';
import { resourceManagementService } from '@/lib/services/resource-management.service';
import { employeeService } from '@/lib/services/employee.service';
import { projectService } from '@/lib/services/project.service';
import { Employee } from '@/lib/types/employee';
import { Project } from '@/lib/types/project';
import { AllocationValidationResult, CreateAllocationApprovalRequest } from '@/lib/types/resource-management';

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

  const [formData, setFormData] = useState<{
    employeeId: string;
    projectId: string;
    allocationPercentage: number;
    role: string;
    startDate: string;
    endDate: string;
    reason: string;
  }>({
    employeeId: preselectedEmployeeId || '',
    projectId: preselectedProjectId || '',
    allocationPercentage: 50,
    role: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    reason: '',
  });

  const [employeeSearch, setEmployeeSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  // Load employees and projects
  useEffect(() => {
    if (isOpen) {
      setLoadingData(true);
      Promise.all([
        employeeService.getAllEmployees(0, 100),
        projectService.getAllProjects(0, 100, 'ACTIVE'),
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
      allocationPercentage: 50,
      role: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      reason: '',
    });
    setValidation(null);
    setError(null);
    setEmployeeSearch('');
    setProjectSearch('');
    onClose();
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.firstName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.lastName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.employeeCode?.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const filteredProjects = projects.filter(
    (proj) =>
      proj.name?.toLowerCase().includes(projectSearch.toLowerCase()) ||
      proj.projectCode?.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const selectedEmployee = employees.find((e) => e.id === formData.employeeId);
  const selectedProject = projects.find((p) => p.id === formData.projectId);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalHeader onClose={handleClose}>Create Allocation</ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-6">
          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : (
            <>
              {/* Employee Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                  <User className="inline-block h-4 w-4 mr-1" />
                  Employee
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search employees..."
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
                            {emp.firstName} {emp.lastName}
                            <span className="ml-2 text-surface-500">({emp.employeeCode})</span>
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
                    Selected: <strong>{selectedEmployee.firstName} {selectedEmployee.lastName}</strong>
                    {selectedEmployee.designation && ` - ${selectedEmployee.designation}`}
                  </div>
                )}
              </div>

              {/* Project Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                  <Briefcase className="inline-block h-4 w-4 mr-1" />
                  Project
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="max-h-40 overflow-y-auto border border-surface-200 dark:border-surface-700 rounded-lg">
                    {filteredProjects.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-surface-500">No projects found</div>
                    ) : (
                      filteredProjects.map((proj) => (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, projectId: proj.id });
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
                </div>
                {selectedProject && (
                  <div className="text-sm text-surface-600 dark:text-surface-400 bg-surface-50 dark:bg-surface-800 rounded-lg p-3">
                    Selected: <strong>{selectedProject.name}</strong> ({selectedProject.projectCode})
                  </div>
                )}
              </div>

              {/* Allocation Percentage */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                  <Percent className="inline-block h-4 w-4 mr-1" />
                  Allocation Percentage
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={formData.allocationPercentage}
                    onChange={(e) =>
                      setFormData({ ...formData, allocationPercentage: parseInt(e.target.value) })
                    }
                    className="flex-1"
                  />
                  <div className="w-20">
                    <Input
                      type="number"
                      min="5"
                      max="100"
                      value={formData.allocationPercentage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allocationPercentage: Math.min(100, Math.max(5, parseInt(e.target.value) || 5)),
                        })
                      }
                    />
                  </div>
                  <span className="text-sm text-surface-600 dark:text-surface-400">%</span>
                </div>
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

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                    <Calendar className="inline-block h-4 w-4 mr-1" />
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                    <Calendar className="inline-block h-4 w-4 mr-1" />
                    End Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate}
                  />
                </div>
              </div>

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
              submitting ||
              loadingData ||
              (validation?.requiresApproval && !formData.reason)
            }
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : validation?.requiresApproval ? (
              'Submit for Approval'
            ) : (
              'Create Allocation'
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
