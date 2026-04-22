'use client';

import React from 'react';
import {Input} from '@/components/ui/Input';
import {Briefcase, Building2, Calendar, DollarSign, Plus, User, Users,} from 'lucide-react';
import {Employee} from '@/lib/types/hrms/employee';
import {CreateProjectRequest, Project} from '@/lib/types/hrms/project';

// ─── Props ────────────────────────────────────────────────────────────
export interface ProjectStepProps {
  // Toggle between new/existing project mode
  useExistingProject: boolean;
  onUseExistingProjectChange: (value: boolean) => void;

  // Existing project selection
  projects: Project[];
  selectedProjectId: string;
  onSelectedProjectIdChange: (id: string) => void;

  // New project form
  projectData: CreateProjectRequest;
  onProjectDataChange: (data: CreateProjectRequest) => void;

  // Resources needed (for new project)
  resourcesNeeded: number;
  onResourcesNeededChange: (n: number) => void;

  // Employees list (for project manager select)
  employees: Employee[];
}

/**
 * Step 1 of the CreateAllocationModal wizard.
 * Lets the user either select an existing project or fill in a new project form.
 * All state lives in the parent (CreateAllocationModal); this component is purely presentational.
 */
export function ProjectStep({
                              useExistingProject,
                              onUseExistingProjectChange,
                              projects,
                              selectedProjectId,
                              onSelectedProjectIdChange,
                              projectData,
                              onProjectDataChange,
                              resourcesNeeded,
                              onResourcesNeededChange,
                              employees,
                            }: ProjectStepProps) {
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <>
      {/* Toggle between new/existing project */}
      <div className='flex gap-4 p-1 bg-surface rounded-lg'>
        <button
          type="button"
          onClick={() => onUseExistingProjectChange(false)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            !useExistingProject
              ? 'bg-[var(--bg-surface)] shadow text-accent-700'
              : 'text-surface-600 dark:text-surface-400 hover:text-surface-900'
          }`}
        >
          <Plus className="inline-block h-4 w-4 mr-2"/>
          Create New Project
        </button>
        <button
          type="button"
          onClick={() => onUseExistingProjectChange(true)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            useExistingProject
              ? 'bg-[var(--bg-surface)] shadow text-accent-700'
              : 'text-surface-600 dark:text-surface-400 hover:text-surface-900'
          }`}
        >
          <Briefcase className="inline-block h-4 w-4 mr-2"/>
          Select Existing Project
        </button>
      </div>
      {useExistingProject ? (
        /* Existing Project Selection */
        (<div className="space-y-4">
          <div>
            <label className='block text-sm font-medium text-secondary mb-2'>
              Select Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectedProjectIdChange(e.target.value)}
              className='w-full rounded-lg border border-subtle bg-[var(--bg-input)] px-4 py-2.5'
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
            <div
              className='bg-base rounded-lg p-4 border border-subtle'>
              <h4 className='font-medium text-primary mb-2'>{selectedProject.name}</h4>
              <div className='grid grid-cols-2 gap-2 text-sm text-secondary'>
                <div>Code: {selectedProject.projectCode}</div>
                <div>Status: {selectedProject.status}</div>
                <div>Client: {selectedProject.clientName || 'N/A'}</div>
                <div>Manager: {selectedProject.projectManagerName || 'N/A'}</div>
                <div>Start: {selectedProject.startDate}</div>
                <div>End: {selectedProject.expectedEndDate || 'N/A'}</div>
              </div>
            </div>
          )}
        </div>)
      ) : (
        /* New Project Form */
        (<div className="space-y-4">
          {/* Row 1: Name & Code */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className='block text-sm font-medium text-secondary mb-1'>
                Project Name *
              </label>
              <Input
                type="text"
                placeholder="e.g., Website Redesign"
                value={projectData.name}
                onChange={(e) => onProjectDataChange({...projectData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-secondary mb-1'>
                Project ID/Code *
              </label>
              <Input
                type="text"
                placeholder="e.g., PRJ-001"
                value={projectData.projectCode}
                onChange={(e) => onProjectDataChange({...projectData, projectCode: e.target.value.toUpperCase()})}
                required
              />
            </div>
          </div>
          {/* Row 2: Start & End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className='block text-sm font-medium text-secondary mb-1'>
                <Calendar className="inline-block h-4 w-4 mr-1"/>
                Start Date *
              </label>
              <Input
                type="date"
                value={projectData.startDate}
                onChange={(e) => onProjectDataChange({...projectData, startDate: e.target.value})}
                required
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-secondary mb-1'>
                <Calendar className="inline-block h-4 w-4 mr-1"/>
                End Date
              </label>
              <Input
                type="date"
                value={projectData.expectedEndDate}
                onChange={(e) => onProjectDataChange({...projectData, expectedEndDate: e.target.value})}
                min={projectData.startDate}
              />
            </div>
          </div>
          {/* Row 3: Resources Needed & Manager */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className='block text-sm font-medium text-secondary mb-1'>
                <Users className="inline-block h-4 w-4 mr-1"/>
                Resources Needed *
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                placeholder="Number of employees needed"
                value={resourcesNeeded}
                onChange={(e) => onResourcesNeededChange(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
              <p className='text-xs text-muted mt-1'>
                How many employees will be allocated to this project?
              </p>
            </div>
            <div>
              <label className='block text-sm font-medium text-secondary mb-1'>
                <User className="inline-block h-4 w-4 mr-1"/>
                Project Manager
              </label>
              <select
                value={projectData.projectManagerId}
                onChange={(e) => onProjectDataChange({...projectData, projectManagerId: e.target.value})}
                className='w-full rounded-lg border border-subtle bg-[var(--bg-input)] px-4 py-2.5'
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
              <label className='block text-sm font-medium text-secondary mb-1'>
                <DollarSign className="inline-block h-4 w-4 mr-1"/>
                Budget
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={projectData.budget || ''}
                  onChange={(e) => onProjectDataChange({
                    ...projectData,
                    budget: parseFloat(e.target.value) || undefined
                  })}
                  className="flex-1"
                />
                <select
                  value={projectData.currency}
                  onChange={(e) => onProjectDataChange({...projectData, currency: e.target.value})}
                  className='w-24 rounded-lg border border-subtle bg-[var(--bg-input)] px-2'
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
          <div className='border-t border-subtle pt-4'>
            <h4 className='text-sm font-medium text-primary mb-4 flex items-center'>
              <Building2 className="h-4 w-4 mr-2"/>
              Client Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className='block text-sm font-medium text-secondary mb-1'>
                  Client Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Acme Corp"
                  value={projectData.clientName}
                  onChange={(e) => onProjectDataChange({...projectData, clientName: e.target.value})}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-secondary mb-1'>
                  Client Contact
                </label>
                <Input
                  type="text"
                  placeholder="e.g., john@acme.com"
                  value={projectData.clientContact}
                  onChange={(e) => onProjectDataChange({...projectData, clientContact: e.target.value})}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className='block text-sm font-medium text-secondary mb-1'>
                Client Notes
              </label>
              <textarea
                placeholder="Any additional notes about the client or project requirements..."
                value={projectData.clientNotes}
                onChange={(e) => onProjectDataChange({...projectData, clientNotes: e.target.value})}
                className='w-full rounded-lg border border-subtle bg-[var(--bg-input)] px-4 py-2 text-sm min-h-[80px]'
              />
            </div>
          </div>
        </div>)
      )}
    </>
  );
}
