'use client';

import React from 'react';
import {Layers} from 'lucide-react';
import {EmptyState} from '@/components/ui';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {formatCurrency, formatDate, getStatusColor, SalaryStructure} from './types';

interface SalaryStructuresTabProps {
  salaryStructures: SalaryStructure[];
  loading: boolean;
  structureFilter: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ALL';
  onFilterChange: (filter: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ALL') => void;
  onCreateStructure: () => void;
  onEditStructure: (structure: SalaryStructure) => void;
  onDeleteStructure: (structure: SalaryStructure) => void;
}

export function SalaryStructuresTab({
                                      salaryStructures,
                                      loading,
                                      structureFilter,
                                      onFilterChange,
                                      onCreateStructure,
                                      onEditStructure,
                                      onDeleteStructure,
                                    }: SalaryStructuresTabProps) {
  const filtered = salaryStructures.filter(
    (structure) => structureFilter === 'ALL' || structure.status === structureFilter
  );

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Filter by Status
            </label>
            <select
              value={structureFilter}
              onChange={(e) => onFilterChange(e.target.value as 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ALL')}
              className="px-4 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>
        <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
          <button
            onClick={onCreateStructure}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            Create Structure
          </button>
        </PermissionGate>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">Loading salary structures...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-8 w-8"/>}
          title="No Salary Structures Yet"
          description="Define salary structures with allowances and deductions for your employees"
          action={{label: 'Create Structure', onClick: onCreateStructure}}
          iconColor="grape"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((structure) => (
            <div key={structure.id}
                 className="bg-[var(--bg-card)] rounded-lg shadow-[var(--shadow-elevated)] p-6 hover:shadow-[var(--shadow-dropdown)] transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{structure.employeeName}</h3>
                  <p className="text-body-secondary">
                    Effective: {formatDate(structure.effectiveDate)}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(structure.status)}`}>
                  {structure.status}
                </span>
              </div>

              <div className="mb-6 pb-6 border-b">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--text-secondary)]">Base Salary</span>
                    <p className="font-semibold text-lg">{formatCurrency(structure.baseSalary)}</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Total CTC</span>
                    <p className="font-semibold text-lg">{formatCurrency(structure.totalCTC)}</p>
                  </div>
                </div>
              </div>

              {structure.allowances && structure.allowances.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-2 text-success-700">Allowances</h4>
                  <div className="space-y-1">
                    {structure.allowances.map((allow, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">{allow.name}</span>
                        <span className="text-success-600 font-medium">{formatCurrency(allow.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {structure.deductions && structure.deductions.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-2 text-danger-700">Deductions</h4>
                  <div className="space-y-1">
                    {structure.deductions.map((ded, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">{ded.name}</span>
                        <span className="text-danger-600 font-medium">{formatCurrency(ded.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                  <button
                    onClick={() => onEditStructure(structure)}
                    className="flex-1 px-4 py-2 bg-accent-50 dark:bg-accent-950/30 text-accent-700 dark:text-accent-400 rounded hover:bg-accent-100 text-sm font-medium"
                  >
                    Edit
                  </button>
                </PermissionGate>
                <PermissionGate permission={Permissions.PAYROLL_PROCESS}>
                  <button
                    onClick={() => onDeleteStructure(structure)}
                    className="flex-1 px-4 py-2 bg-danger-50 dark:bg-danger-900/40 text-danger-600 dark:text-danger-400 rounded hover:bg-danger-100 dark:hover:bg-danger-900/60 text-sm font-medium"
                  >
                    Delete
                  </button>
                </PermissionGate>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
