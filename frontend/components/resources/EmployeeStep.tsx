'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import {
  AlertTriangle,
  Check,
  Loader2,
  User,
  Percent,
  Trash2,
} from 'lucide-react';
import { Employee } from '@/lib/types/employee';
import { Project, ProjectEmployee } from '@/lib/types/project';

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
      <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 border border-primary-200 dark:border-primary-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-medium text-primary-800 dark:text-primary-200">{createdProject?.name}</h4>
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

      {/* Allocation Status Messages */}
      {!isComplete && remainingAllocation > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
          <Percent className="inline-block h-4 w-4 mr-2" />
          <strong>{remainingAllocation}%</strong> allocation remaining to reach {totalAllocationNeeded}%.
          <div className="mt-2 text-xs opacity-90 space-y-1">
            <div className="font-medium">Possible combinations:</div>
            <div className="flex flex-wrap gap-2">
              {remainingAllocation >= 100 && (
                <span className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">{Math.floor(remainingAllocation / 100)} × 100%</span>
              )}
              {remainingAllocation >= 50 && (
                <span className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">{Math.floor(remainingAllocation / 50)} × 50%</span>
              )}
              {remainingAllocation >= 25 && (
                <span className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">{Math.floor(remainingAllocation / 25)} × 25%</span>
              )}
              {remainingAllocation >= 20 && (
                <span className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">{Math.floor(remainingAllocation / 20)} × 20%</span>
              )}
              {remainingAllocation >= 10 && remainingAllocation < 20 && (
                <span className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">{Math.floor(remainingAllocation / 10)} × 10%</span>
              )}
            </div>
          </div>
        </div>
      )}
      {isOverAllocated && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="inline-block h-4 w-4 mr-2" />
          Over-allocated by {currentAllocation - totalAllocationNeeded}%. You have allocated more than the {resourcesNeeded} resource{resourcesNeeded !== 1 ? 's' : ''} needed.
        </div>
      )}
      {isComplete && !isOverAllocated && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
          <Check className="inline-block h-4 w-4 mr-2" />
          Allocation complete! {currentAllocation}% allocated across {allocations.length} employee{allocations.length !== 1 ? 's' : ''}.
        </div>
      )}

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
            onEmployeeSearchChange(e.target.value);
            onShowEmployeeDropdownChange(true);
          }}
          onFocus={() => onShowEmployeeDropdownChange(true)}
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
                    onClick={() => onAddEmployee(emp)}
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
                <th className="px-4 py-3 text-left font-medium text-surface-700 dark:text-surface-300">Employee</th>
                <th className="px-4 py-3 text-left font-medium text-surface-700 dark:text-surface-300">Role</th>
                <th className="px-4 py-3 text-center font-medium text-surface-700 dark:text-surface-300">Allocation %</th>
                <th className="px-4 py-3 text-center font-medium text-surface-700 dark:text-surface-300">Start Date</th>
                <th className="px-4 py-3 text-center font-medium text-surface-700 dark:text-surface-300">End Date</th>
                <th className="px-4 py-3 text-center font-medium text-surface-700 dark:text-surface-300 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((allocation) => {
                const totalWithThis = allocation.existingAllocations + allocation.allocationPercentage;
                const isAtCapacity = allocation.allocationPercentage >= allocation.availableCapacity;
                const isNearCapacity = allocation.availableCapacity - allocation.allocationPercentage <= 10;

                return (
                  <tr key={allocation.employeeId} className="border-t border-surface-200 dark:border-surface-700">
                    <td className="px-4 py-3">
                      <div className="font-medium text-surface-800 dark:text-surface-200">{allocation.employeeName}</div>
                      <div className="text-xs text-surface-500">{allocation.employeeCode}</div>
                      {/* Capacity indicator */}
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                          <div className="h-full flex">
                            <div className="h-full bg-surface-400 dark:bg-surface-500" style={{ width: `${allocation.existingAllocations}%` }} />
                            <div
                              className={`h-full ${isAtCapacity ? 'bg-amber-500' : isNearCapacity ? 'bg-yellow-500' : 'bg-primary-500'}`}
                              style={{ width: `${allocation.allocationPercentage}%` }}
                            />
                          </div>
                        </div>
                        <span className={`text-xs font-medium whitespace-nowrap ${isAtCapacity ? 'text-amber-600' : 'text-surface-500'}`}>
                          {totalWithThis}%
                        </span>
                      </div>
                      {allocation.existingAllocations > 0 && (
                        <div className="text-xs text-surface-400 mt-0.5">{allocation.existingAllocations}% in other projects</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        placeholder="e.g., Developer"
                        value={allocation.role}
                        onChange={(e) => onAllocationChange(allocation.employeeId, 'role', e.target.value)}
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
                            onChange={(e) => onAllocationChange(allocation.employeeId, 'allocationPercentage', parseInt(e.target.value) || 0)}
                            className={`w-20 text-center text-sm ${isAtCapacity ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : ''}`}
                          />
                          <Percent className="h-4 w-4 text-surface-400" />
                        </div>
                        <div className={`text-xs ${isAtCapacity ? 'text-amber-600 font-medium' : 'text-surface-400'}`}>
                          max: {allocation.availableCapacity}%
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="date"
                        value={allocation.startDate}
                        onChange={(e) => onAllocationChange(allocation.employeeId, 'startDate', e.target.value)}
                        className="text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="date"
                        value={allocation.endDate}
                        onChange={(e) => onAllocationChange(allocation.employeeId, 'endDate', e.target.value)}
                        min={allocation.startDate}
                        className="text-sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveEmployee(allocation.employeeId)}
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
  );
}
