'use client';

import React from 'react';
import {cn} from '@/lib/utils';
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
      <div className="flex gap-2 p-1 bg-[var(--surface-sunken)] rounded-[var(--r-md)]">
        <button
          type="button"
          onClick={() => onUseExistingProjectChange(false)}
          className={cn(
            'flex-1 py-2 px-4 rounded-[var(--r-sm)] text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
            !useExistingProject
              ? 'bg-[var(--surface)] shadow-sm text-[var(--accent)]'
              : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
          )}
        >
          <Plus className="inline-block h-4 w-4 mr-2"/>
          Create New Project
        </button>
        <button
          type="button"
          onClick={() => onUseExistingProjectChange(true)}
          className={cn(
            'flex-1 py-2 px-4 rounded-[var(--r-sm)] text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
            useExistingProject
              ? 'bg-[var(--surface)] shadow-sm text-[var(--accent)]'
              : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
          )}
        >
          <Briefcase className="inline-block h-4 w-4 mr-2"/>
          Select Existing Project
        </button>
      </div>

      {useExistingProject ? (
        /* Existing Project Selection */
        <div className="space-y-4">
          <div>
            <label className="block text-aura-micro uppercase text-[var(--text-1)] font-semibold mb-2">
              Select Project
            </label>
            <select
              aria-label="Select Project"
              value={selectedProjectId}
              onChange={(e) => onSelectedProjectIdChange(e.target.value)}
              className="w-full rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-[var(--text-1)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
            <div className="bg-[var(--surface-sunken)] rounded-[var(--r-md)] p-4 border border-[var(--border-soft)]">
              <h4 className="font-semibold text-[var(--text-1)] mb-3">{selectedProject.name}</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-2)]">
                <div><span className="font-medium">Code:</span> {selectedProject.projectCode}</div>
                <div><span className="font-medium">Status:</span> {selectedProject.status}</div>
                <div><span className="font-medium">Client:</span> {selectedProject.clientName || 'N/A'}</div>
                <div><span className="font-medium">Manager:</span> {selectedProject.projectManagerName || 'N/A'}</div>
                <div><span className="font-medium">Start:</span> <span className="num">{selectedProject.startDate}</span></div>
                <div><span className="font-medium">End:</span> <span className="num">{selectedProject.expectedEndDate || 'N/A'}</span></div>
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
              <label className="block text-aura-micro uppercase text-[var(--text-1)] font-semibold mb-1">
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
              <label className="block text-aura-micro uppercase text-[var(--text-1)] font-semibold mb-1">
                Project ID/Code *
              </label>
              <Input
                type="text"
                placeholder="e.g., PRJ-001"
                value={projectData.projectCode}
                onChange={(e) => onProjectDataChange({...projectData, projectCode: e.target.value.toUpperCase()})}
                required
                className="num"
              />
            </div>
          </div>

          {/* Row 2: Start & End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-aura-micro uppercase text-[var(--text-1)] font-semibold mb-1">
                <Calendar className="inline-block h-4 w-4 mr-2" aria-hidden="true"/>
                Start Date *
              </label>
              <Input
                type="date"
                value={projectData.startDate}
                onChange={(e) => onProjectDataChange({...projectData, startDate: e.target.value})}
                required
                className="num"
              />
            </div>
            <div>
              <label className="block text-aura-micro uppercase text-[var(--text-1)] font-semibold mb-1">
                <Calendar className="inline-block h-4 w-4 mr-2" aria-hidden="true"/>
                End Date
              </label>
              <Input
                type="date"
                value={projectData.expectedEndDate}
                onChange={(e) => onProjectDataChange({...projectData, expectedEndDate: e.target.value})}
                min={projectData.startDate}
                className="num"
              />
            </div>
          </div>

          {/* Row 3: Resources Needed & Manager */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-aura-micro uppercase text-[var(--text-1)] font-semibold mb-1">
                <Users className="inline-block h-4 w-4 mr-2" aria-hidden="true"/>
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
                className="num"
              />
              <p className="text-aura-micro text-[var(--text-3)] mt-2">
                How many employees will be allocated to this project?
              </p>
            </div>
            <div>
              <label className="block text-aura-micro uppercase text-[var(--text-1)] font-semibold mb-1">
                <User className="inline-block h-4 w-4 mr-2" aria-hidden="true"/>
                Project Manager
              </label>
              <select
                aria-label="Project Manager"
                value={projectData.projectManagerId}
                onChange={(e) => onProjectDataChange({...projectData, projectManagerId: e.target.value})}
                className="w-full rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-[var(--text-1)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
              <label className="block text-aura-micro uppercase text-[var(--text-1)] font-semibold mb-1">
                <DollarSign className="inline-block h-4 w-4 mr-2" aria-hidden="true"/>
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
                  className="flex-1 num"
                />
                <select
                  value={projectData.currency}
                  onChange={(e) => onProjectDataChange({...projectData, currency: e.target.value})}
                  className="w-24 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-input)] px-2 text-[var(--text-1)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
          <div className="border-t border-[var(--border-soft)] pt-4">
            <h4 className="text-sm font-semibold text-[var(--text-1)] mb-4 flex items-center">
              <Building2 className="h-4 w-4 mr-2" aria-hidden="true"/>
              Client Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-aura-micro uppercase text-[var(--text-1)] font-semibold mb-1">
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
                <label className="block text-aura-micro uppercase text-[var(--text-1)] font-semibold mb-1">
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
              <label className="block text-aura-micro uppercase text-[var(--text-1)] font-semibold mb-1">
                Client Notes
              </label>
              <textarea
                placeholder="Any additional notes about the client or project requirements..."
                value={projectData.clientNotes}
                onChange={(e) => onProjectDataChange({...projectData, clientNotes: e.target.value})}
                className="w-full rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2 text-sm min-h-[80px] text-[var(--text-1)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
