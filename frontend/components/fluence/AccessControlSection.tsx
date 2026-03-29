'use client';

import { useState } from 'react';
import { MultiSelect } from '@mantine/core';
import { Building2, Users, Shield, Info } from 'lucide-react';
import { useActiveDepartments } from '@/lib/hooks/queries/useDepartments';
import { useEmployeeSearch } from '@/lib/hooks/queries/useEmployees';
import { Card, CardContent } from '@/components/ui/Card';
import type { Department } from '@/lib/types/employee';
import type { Employee } from '@/lib/types/employee';

interface AccessControlSectionProps {
  /** Current visibility value */
  visibility: string;
  /** Currently selected department IDs for sharing */
  sharedWithDepartmentIds: string[];
  /** Currently selected employee IDs for sharing */
  sharedWithEmployeeIds: string[];
  /** Called when department IDs change */
  onDepartmentIdsChange: (ids: string[]) => void;
  /** Called when employee IDs change */
  onEmployeeIdsChange: (ids: string[]) => void;
  /** Whether the form is disabled */
  disabled?: boolean;
}

/**
 * Access control section for Fluence content creation/editing.
 *
 * Shows department and employee sharing pickers when visibility is:
 * - DEPARTMENT: auto-scoped to creator's department, but can share with others
 * - RESTRICTED: must explicitly choose who can see it
 */
export default function AccessControlSection({
  visibility,
  sharedWithDepartmentIds,
  sharedWithEmployeeIds,
  onDepartmentIdsChange,
  onEmployeeIdsChange,
  disabled = false,
}: AccessControlSectionProps) {
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const { data: departmentsData } = useActiveDepartments();
  const { data: employeeSearchData } = useEmployeeSearch(employeeSearchQuery, 0, 20, employeeSearchQuery.length > 1);

  const departments = departmentsData || [];
  const searchedEmployees = employeeSearchData?.content || [];

  // Only show for DEPARTMENT and RESTRICTED visibility
  const showDepartmentSharing = visibility === 'DEPARTMENT' || visibility === 'RESTRICTED';
  const showEmployeeSharing = visibility === 'DEPARTMENT' || visibility === 'RESTRICTED';

  if (!showDepartmentSharing && !showEmployeeSharing) {
    return null;
  }

  const departmentOptions = departments.map((dept: Department) => ({
    value: dept.id,
    label: dept.name,
  }));

  const employeeOptions = searchedEmployees.map((emp: Employee) => ({
    value: emp.id,
    label: `${emp.fullName || `${emp.firstName} ${emp.lastName || ''}`}${emp.workEmail ? ` (${emp.workEmail})` : ''}`,
  }));

  return (
    <Card className="border-accent-200 dark:border-accent-800 bg-accent-50/50 dark:bg-accent-950/20">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-accent-700 dark:text-accent-300">
          <Shield className="w-4 h-4" />
          Access Control
        </div>

        {visibility === 'DEPARTMENT' && (
          <div className="flex items-start gap-2 text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-lg p-4">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              This content will be visible to members of your department by default.
              You can grant additional access to other departments or specific employees below.
            </p>
          </div>
        )}

        {visibility === 'RESTRICTED' && (
          <div className="flex items-start gap-2 text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-lg p-4">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Only you and the people/departments you specify below will be able to see this content.
            </p>
          </div>
        )}

        {/* Share with departments */}
        {showDepartmentSharing && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Share with Departments
            </label>
            <MultiSelect
              data={departmentOptions}
              value={sharedWithDepartmentIds}
              onChange={onDepartmentIdsChange}
              placeholder="Select departments to share with..."
              searchable
              clearable
              disabled={disabled}
              nothingFoundMessage="No departments found"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              All members of selected departments will have read access
            </p>
          </div>
        )}

        {/* Share with specific employees */}
        {showEmployeeSharing && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Share with Specific People
            </label>
            <MultiSelect
              data={employeeOptions}
              value={sharedWithEmployeeIds}
              onChange={onEmployeeIdsChange}
              placeholder="Search and select employees..."
              searchable
              clearable
              disabled={disabled}
              onSearchChange={setEmployeeSearchQuery}
              nothingFoundMessage={employeeSearchQuery.length > 1 ? 'No employees found' : 'Type to search...'}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Selected people will have individual access regardless of their department
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
