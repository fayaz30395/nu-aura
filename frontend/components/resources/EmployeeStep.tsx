'use client';

import React from 'react';
import {Input} from '@/components/ui/Input';
import {AlertTriangle, Check, Loader2, Percent, Trash2, User,} from 'lucide-react';
import {Employee} from '@/lib/types/hrms/employee';
import {Project, ProjectEmployee} from '@/lib/types/hrms/project';

// ─── Types (re-exported so CreateAllocationModal can import them) ──────
export interface EmployeeAllocation {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  role: string;
  allocationPercentage: number;
  startDate: string;
  endDate: string;
  availableCapacity: number;
  existingAllocations: number;
}

export type EmployeeCapacityMap = Map<string, { total: number; projects: ProjectEmployee[] }>;

// ─── Props ────────────────────────────────────────────────────────────
export interface EmployeeStepProps {
  createdProject: Project | null;
  resourcesNeeded: number;
  allocations: EmployeeAllocation[];
  employees: Employee[];
  employeeSearch: string;
  onEmployeeSearchChange: (value: string) => void;
  showEmployeeDropdown: boolean;
  onShowEmployeeDropdownChange: (value: boolean) => void;
  employeeCapacities: EmployeeCapacityMap;
  loadingCapacity: string | null;
  onAddEmployee: (employee: Employee) => void;
  onRemoveEmployee: (employeeId: string) => void;
  onAllocationChange: (employeeId: string, field: keyof EmployeeAllocation, value: string | number) => void;
}

/**
 * Step 2 of the CreateAllocationModal wizard.
 * Displays:
 * - Project summary card with allocation progress bar
 * - Employee search + dropdown
 * - Allocation table with role, percentage, dates
 *
 * All state and handlers live in the parent (CreateAllocationModal).
 */
export function EmployeeStep({
                               createdProject,
                               resourcesNeeded,
                               allocations,
                               employees,
                               employeeSearch,
                               onEmployeeSearchChange,
                               showEmployeeDropdown,
                               onShowEmployeeDropdownChange,
                               employeeCapacities,
                               loadingCapacity,
                               onAddEmployee,
                               onRemoveEmployee,
                               onAllocationChange,
                             }: EmployeeStepProps) {
  const totalAllocationNeeded = resourcesNeeded * 100;
  const currentAllocation = allocations.reduce((sum, a) => sum + a.allocationPercentage, 0);
  const remainingAllocation = totalAllocationNeeded - currentAllocation;
  const allocationProgress = Math.min(100, (currentAllocation / totalAllocationNeeded) * 100);
  const isComplete = currentAllocation >= totalAllocationNeeded;
  const isOverAllocated = currentAllocation > totalAllocationNeeded;

  const filteredEmployees = employees.filter(
    (emp) =>
      !allocations.some((a) => a.employeeId === emp.id) &&
      (emp.firstName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.lastName?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(employeeSearch.toLowerCase()))
  );

  return (
    <>
      {/* Project Summary */}
      <div
        className='bg-accent-subtle rounded-lg p-4 border border-[var(--accent-primary)]'>
        <div className="row-between mb-4">
          <div>
            <h4 className='font-medium text-accent'>{createdProject?.name}</h4>
            <p className='text-sm text-accent'>
              {createdProject?.projectCode} | {createdProject?.clientName || 'No Client'}
            </p>
          </div>
          <div className="text-right">
            <div className='text-sm text-accent'>
              {createdProject?.startDate} - {createdProject?.expectedEndDate || 'Ongoing'}
            </div>
          </div>
        </div>

        {/* Allocation Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className='text-accent'>
              {resourcesNeeded} Resource{resourcesNeeded !== 1 ? 's' : ''} Needed = {totalAllocationNeeded}% Total Allocation
            </span>
            <span
              className={isComplete ? (isOverAllocated ? 'text-status-warning-text font-medium' : 'text-status-success-text font-medium') : 'text-accent'}>
              {currentAllocation}% / {totalAllocationNeeded}%
            </span>
          </div>
          <div className='w-full bg-accent-subtle rounded-full h-2.5'>
            <div
              className={`h-2.5 rounded-full transition-all ${
                isOverAllocated ? "bg-status-warning-bg" : isComplete ? "bg-status-success-bg" : "bg-accent"
              }`}
              style={{width: `${Math.min(100, allocationProgress)}%`}}
            />
          </div>
          <div className='text-xs text-accent'>
            {allocations.length} employee{allocations.length !== 1 ? 's' : ''} added
          </div>
        </div>
      </div>
      {/* Allocation Status Messages */}
      {!isComplete && remainingAllocation > 0 && (
        <div
          className='bg-accent-subtle rounded-lg p-4 border border-[var(--accent-primary)] text-sm text-accent'>
          <Percent className="inline-block h-4 w-4 mr-2"/>
          <strong>{remainingAllocation}%</strong> allocation remaining to reach {totalAllocationNeeded}%.
          <div className="mt-2 text-xs opacity-90 space-y-1">
            <div className="font-medium">Possible combinations:</div>
            <div className="flex flex-wrap gap-2">
              {remainingAllocation >= 100 && (
                <span
                  className='bg-accent-subtle px-2 py-0.5 rounded'>{Math.floor(remainingAllocation / 100)} × 100%</span>
              )}
              {remainingAllocation >= 50 && (
                <span
                  className='bg-accent-subtle px-2 py-0.5 rounded'>{Math.floor(remainingAllocation / 50)} × 50%</span>
              )}
              {remainingAllocation >= 25 && (
                <span
                  className='bg-accent-subtle px-2 py-0.5 rounded'>{Math.floor(remainingAllocation / 25)} × 25%</span>
              )}
              {remainingAllocation >= 20 && (
                <span
                  className='bg-accent-subtle px-2 py-0.5 rounded'>{Math.floor(remainingAllocation / 20)} × 20%</span>
              )}
              {remainingAllocation >= 10 && remainingAllocation < 20 && (
                <span
                  className='bg-accent-subtle px-2 py-0.5 rounded'>{Math.floor(remainingAllocation / 10)} × 10%</span>
              )}
            </div>
          </div>
        </div>
      )}
      {isOverAllocated && (
        <div
          className='bg-status-warning-bg rounded-lg p-4 border border-status-warning-border text-sm text-status-warning-text'>
          <AlertTriangle className="inline-block h-4 w-4 mr-2"/>
          Over-allocated by {currentAllocation - totalAllocationNeeded}%. You have allocated more than
          the {resourcesNeeded} resource{resourcesNeeded !== 1 ? 's' : ''} needed.
        </div>
      )}
      {isComplete && !isOverAllocated && (
        <div
          className='bg-status-success-bg rounded-lg p-4 border border-status-success-border text-sm text-status-success-text'>
          <Check className="inline-block h-4 w-4 mr-2"/>
          Allocation complete! {currentAllocation}% allocated
          across {allocations.length} employee{allocations.length !== 1 ? 's' : ''}.
        </div>
      )}
      {/* Add Employee Search */}
      <div className="relative">
        <label className='block text-sm font-medium text-secondary mb-2'>
          <User className="inline-block h-4 w-4 mr-1"/>
          Add Employees
        </label>
        <Input
          type="text"
          placeholder="Search employees by name or ID..."
          value={employeeSearch}
          onChange={(e) => {
            onEmployeeSearchChange(e.target.value);
            onShowEmployeeDropdownChange(true);
          }}
          onFocus={() => onShowEmployeeDropdownChange(true)}
        />
        {showEmployeeDropdown && employeeSearch && (
          <div
            className='absolute z-10 w-full mt-1 max-h-60 overflow-y-auto bg-[var(--bg-input)] border border-subtle rounded-lg shadow-[var(--shadow-dropdown)]'>
            {filteredEmployees.length === 0 ? (
              <div className='px-4 py-4 text-sm text-muted'>No employees found</div>
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
                    onClick={() => onAddEmployee(emp)}
                    disabled={isLoading || isFullyAllocated}
                    className={`w-full px-4 py-2.5 text-left text-sm row-between ${
                      isFullyAllocated
                        ? "bg-base opacity-60 cursor-not-allowed"
                        : "hover:bg-surface"
                    }`}
                  >
                    <div>
                      <div className="font-medium">
                        {emp.employeeCode} - {emp.firstName} {emp.lastName}
                      </div>
                      <div className='text-xs text-muted'>{emp.designation}</div>
                    </div>
                    <div className="text-right">
                      {isLoading ? (
                        <Loader2 className='h-4 w-4 animate-spin text-accent'/>
                      ) : availableCapacity !== null ? (
                        <div className={`text-xs font-medium ${
                          isFullyAllocated
                            ? "text-status-danger-text"
                            : availableCapacity <= 25
                              ? "text-status-warning-text"
                              : "text-status-success-text"
                        }`}>
                          {isFullyAllocated ? (
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3"/>
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
        <div className='border border-subtle rounded-lg overflow-hidden'>
          <table className="w-full text-sm">
            <thead className='bg-base'>
            <tr>
              <th className='px-4 py-2 text-left font-medium text-secondary'>Employee</th>
              <th className='px-4 py-2 text-left font-medium text-secondary'>Role</th>
              <th className='px-4 py-2 text-center font-medium text-secondary'>Allocation %</th>
              <th className='px-4 py-2 text-center font-medium text-secondary'>Start Date</th>
              <th className='px-4 py-2 text-center font-medium text-secondary'>End Date</th>
              <th className='px-4 py-2 text-center font-medium text-secondary w-12'></th>
            </tr>
            </thead>
            <tbody>
            {allocations.map((allocation) => {
              const totalWithThis = allocation.existingAllocations + allocation.allocationPercentage;
              const isAtCapacity = allocation.allocationPercentage >= allocation.availableCapacity;
              const isNearCapacity = allocation.availableCapacity - allocation.allocationPercentage <= 10;

              return (
                <tr key={allocation.employeeId} className='border-t border-subtle'>
                  <td className="px-4 py-4">
                    <div className='font-medium text-primary'>{allocation.employeeName}</div>
                    <div className='text-xs text-muted'>{allocation.employeeCode}</div>
                    {/* Capacity indicator */}
                    <div className="mt-1 flex items-center gap-2">
                      <div className='flex-1 h-1.5 bg-elevated rounded-full overflow-hidden'>
                        <div className="h-full flex">
                          <div className='h-full bg-card'
                               style={{width: `${allocation.existingAllocations}%`}}/>
                          <div
                            className={`h-full ${isAtCapacity ? "bg-status-warning-bg" : isNearCapacity ? "bg-status-warning-bg" : "bg-accent"}`}
                            style={{width: `${allocation.allocationPercentage}%`}}
                          />
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium whitespace-nowrap ${isAtCapacity ? "text-status-warning-text" : "text-muted"}`}>
                          {totalWithThis}%
                        </span>
                    </div>
                    {allocation.existingAllocations > 0 && (
                      <div className='text-xs text-muted mt-0.5'>{allocation.existingAllocations}% in other
                        projects</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Input
                      type="text"
                      placeholder="e.g., Developer"
                      value={allocation.role}
                      onChange={(e) => onAllocationChange(allocation.employeeId, 'role', e.target.value)}
                      className="text-sm"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="5"
                          max={allocation.availableCapacity}
                          value={allocation.allocationPercentage}
                          onChange={(e) => onAllocationChange(allocation.employeeId, 'allocationPercentage', parseInt(e.target.value) || 0)}
                          className={`w-20 text-center text-sm ${isAtCapacity ? "border-status-warning-border bg-status-warning-bg" : ''}`}
                        />
                        <Percent className='h-4 w-4 text-muted'/>
                      </div>
                      <div
                        className={`text-xs ${isAtCapacity ? "text-status-warning-text font-medium" : "text-muted"}`}>
                        max: {allocation.availableCapacity}%
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Input
                      type="date"
                      value={allocation.startDate}
                      onChange={(e) => onAllocationChange(allocation.employeeId, 'startDate', e.target.value)}
                      className="text-sm"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <Input
                      type="date"
                      value={allocation.endDate}
                      onChange={(e) => onAllocationChange(allocation.employeeId, 'endDate', e.target.value)}
                      min={allocation.startDate}
                      className="text-sm"
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveEmployee(allocation.employeeId)}
                      className='p-1.5 text-status-danger-text hover:bg-status-danger-bg rounded'
                    >
                      <Trash2 className="h-4 w-4"/>
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
        <div className='text-center py-8 text-muted'>
          <User className="h-12 w-12 mx-auto mb-4 opacity-30"/>
          <p>No employees added yet</p>
          <p className="text-sm">Search and add employees to allocate to this project</p>
        </div>
      )}
    </>
  );
}
