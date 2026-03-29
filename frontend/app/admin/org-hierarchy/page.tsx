'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Employee } from '@/lib/types/employee';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import { getInitials } from '@/lib/utils';
import { useEmployees } from '@/lib/hooks/queries/useEmployees';

interface EmployeeNode extends Employee {
  subordinates?: EmployeeNode[];
}

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

const buildEmployeeTree = (employees: Employee[]): EmployeeNode[] => {
  const employeeMap = new Map<string, EmployeeNode>();
  const rootEmployees: EmployeeNode[] = [];

  // Create map of all employees
  employees.forEach(emp => {
    employeeMap.set(emp.id, { ...emp, subordinates: [] });
  });

  // Build tree structure
  employees.forEach(emp => {
    const employee = employeeMap.get(emp.id)!;

    if (emp.managerId && employeeMap.has(emp.managerId)) {
      // Employee has a manager - add as subordinate
      const manager = employeeMap.get(emp.managerId)!;
      if (!manager.subordinates) {
        manager.subordinates = [];
      }
      manager.subordinates.push(employee);
    } else {
      // No manager or manager not found - this is a root employee
      rootEmployees.push(employee);
    }
  });

  return rootEmployees;
};

export default function OrgHierarchyPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [hierarchy, setHierarchy] = useState<EmployeeNode[]>([]);

  // React Query hook
  const { data: employeesData, isLoading, error } = useEmployees(0, 1000);
  const employees = employeesData?.content || [];
  const loading = isLoading;

  // Build hierarchy when employees data changes
  if (employees.length > 0 && hierarchy.length === 0) {
    const tree = buildEmployeeTree(employees);
    setHierarchy(tree);
    // Auto-expand root level
    if (expandedNodes.size === 0) {
      setExpandedNodes(new Set(tree.map(e => e.id)));
    }
  }

  // R2-008 FIX: return null immediately after router.push() so the component
  // stops rendering and doesn't briefly expose privileged UI before navigation.
  if (hasHydrated && isReady && isAuthenticated && !hasAnyRole(...ADMIN_ACCESS_ROLES)) {
    router.push('/me/dashboard');
    return null;
  }

  if (hasHydrated && isReady && !isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };



  const getLevelColor = (level?: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      'CXO': { bg: 'bg-accent-250', border: 'border-accent-500', text: 'text-accent-900' },
      'SVP': { bg: 'bg-accent-50', border: 'border-accent-300', text: 'text-accent-700' },
      'VP': { bg: 'bg-accent-50', border: 'border-accent-300', text: 'text-accent-700' },
      'DIRECTOR': { bg: 'bg-accent-50', border: 'border-accent-300', text: 'text-accent-700' },
      'SENIOR_MANAGER': { bg: 'bg-accent-50', border: 'border-accent-300', text: 'text-accent-700' },
      'MANAGER': { bg: 'bg-success-50', border: 'border-success-300', text: 'text-success-700' },
      'LEAD': { bg: 'bg-warning-50', border: 'border-warning-300', text: 'text-warning-700' },
      'SENIOR': { bg: 'bg-warning-50', border: 'border-warning-300', text: 'text-warning-700' },
      'MID': { bg: 'bg-danger-50', border: 'border-danger-300', text: 'text-danger-700' },
      'ENTRY': { bg: 'bg-accent-250', border: 'border-accent-500', text: 'text-accent-900' },
    };
    return level && colors[level] ? colors[level] : { bg: 'bg-[var(--bg-secondary)]/50', border: 'border-[var(--border-main)] dark:border-[var(--border-main)]', text: 'text-[var(--text-secondary)]' };
  };

  const renderEmployeeCard = (employee: EmployeeNode, level: number = 0) => {
    const hasSubordinates = employee.subordinates && employee.subordinates.length > 0;
    const isExpanded = expandedNodes.has(employee.id);
    const colors = getLevelColor(employee.level);

    return (
      <div key={employee.id} className="flex flex-col items-center">
        {/* Employee Card - KEKA Style */}
        <div className="relative">
          <div
            className={`
              ${colors.bg} ${colors.border} ${colors.text}
              border-2 rounded-xl shadow-lg hover:shadow-xl transition-all
              w-80 overflow-hidden cursor-pointer
              ${hasSubordinates ? 'mb-12' : 'mb-6'}
            `}
            onClick={() => hasSubordinates && toggleNode(employee.id)}
          >
            {/* Header with Employee Photo */}
            <div className="bg-white bg-opacity-60 border-b border-current border-opacity-20 p-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className={`
                    h-16 w-16 rounded-full ${colors.bg} border-2 ${colors.border}
                    flex items-center justify-center font-bold text-xl
                  `}>
                    {getInitials(employee.fullName)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-success-500 border-2 border-white rounded-full h-4 w-4"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base truncate">
                    {employee.fullName}
                  </div>
                  <div className="text-xs opacity-75 truncate">
                    {employee.designation || 'Employee'}
                  </div>
                  <div className="text-xs opacity-60 truncate">
                    {employee.employeeCode}
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs opacity-75 mb-1">
                    {employee.workEmail}
                  </p>
                  {employee.phoneNumber && (
                    <p className="text-xs opacity-60">
                      {employee.phoneNumber}
                    </p>
                  )}
                </div>
                {hasSubordinates && (
                  <button
                    className="ml-2 flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-30 transition-colors"
                  >
                    <svg
                      className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Additional Info */}
              <div className="flex flex-wrap gap-2 mt-3">
                {employee.level && (
                  <span className="px-2 py-1 text-xs font-medium rounded-md bg-white bg-opacity-50">
                    {employee.level.replace(/_/g, ' ')}
                  </span>
                )}
                {employee.employmentType && (
                  <span className="px-2 py-1 text-xs rounded-md bg-white bg-opacity-30">
                    {employee.employmentType.replace(/_/g, ' ')}
                  </span>
                )}
                {employee.status && (
                  <span className={`px-2 py-1 text-xs font-medium rounded-md ${employee.status === 'ACTIVE' ? 'bg-success-100 text-success-800' :
                      employee.status === 'ON_LEAVE' ? 'bg-warning-100 text-warning-800' :
                        employee.status === 'ON_NOTICE' ? 'bg-warning-100 text-warning-800' :
                          'bg-danger-100 text-danger-800'
                    }`}>
                    {employee.status.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {/* Team Size */}
              {hasSubordinates && (
                <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-current border-opacity-20">
                  <svg className="h-5 w-5 opacity-60" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <span className="font-semibold">{employee.subordinates!.length}</span>
                  <span className="text-sm opacity-75">direct report{employee.subordinates!.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Connector line to subordinates */}
          {hasSubordinates && isExpanded && (
            <div className="absolute left-1/2 -translate-x-1/2 h-8 w-0.5 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]600"></div>
          )}
        </div>

        {/* Subordinates - Horizontal Layout */}
        {hasSubordinates && isExpanded && (
          <div className="relative">
            {/* Horizontal line connecting subordinates */}
            {employee.subordinates!.length > 1 && (
              <div
                className="absolute top-0 h-0.5 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]600"
                style={{
                  left: '50%',
                  right: '50%',
                  width: `${(employee.subordinates!.length - 1) * 360}px`,
                  marginLeft: `-${((employee.subordinates!.length - 1) * 360) / 2}px`,
                  transform: 'translateY(-2px)'
                }}
              />
            )}

            <div className="flex justify-center space-x-8 pt-2">
              {employee.subordinates!.map((subordinate) => (
                <div key={subordinate.id} className="relative">
                  {/* Vertical line to subordinate */}
                  <div className="absolute left-1/2 -translate-x-1/2 -top-2 h-8 w-0.5 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]600"></div>
                  {renderEmployeeCard(subordinate, level + 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold skeuo-emboss flex items-center space-x-4">
            <svg className="h-8 w-8 text-accent-700" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span>Organization Chart</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Employee reporting structure and team hierarchy
          </p>
        </div>

        {/* Controls */}
        <div className="skeuo-card bg-[var(--bg-card)] rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                const allIds = new Set<string>();
                const collectIds = (emps: EmployeeNode[]) => {
                  emps.forEach(emp => {
                    allIds.add(emp.id);
                    if (emp.subordinates && emp.subordinates.length > 0) {
                      collectIds(emp.subordinates);
                    }
                  });
                };
                collectIds(hierarchy);
                setExpandedNodes(allIds);
              }}
              className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors flex items-center space-x-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span>Expand All</span>
            </button>
            <button
              onClick={() => setExpandedNodes(new Set())}
              className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]/50 transition-colors flex items-center space-x-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6m0 0L4 11m5-5l5 5" />
              </svg>
              <span>Collapse All</span>
            </button>
          </div>

          <div className="text-sm text-[var(--text-secondary)]">
            {hierarchy.length > 0 && (
              <span>
                <strong>{hierarchy.reduce((sum, emp) => {
                  const countAll = (e: EmployeeNode): number => {
                    return 1 + (e.subordinates?.reduce((s, sub) => s + countAll(sub), 0) || 0);
                  };
                  return sum + countAll(emp);
                }, 0)}</strong> total employees
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="skeuo-card bg-[var(--bg-card)] rounded-xl p-8 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-accent-700 mx-auto"></div>
                <p className="mt-6 text-[var(--text-secondary)] font-medium">Loading organization chart...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 text-danger-500 mb-4">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-danger-600 font-medium mb-4">{error instanceof Error ? error.message : 'Failed to load organization hierarchy'}</p>
              </div>
            </div>
          ) : hierarchy.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 text-[var(--text-muted)] mb-4">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-[var(--text-secondary)] font-medium mb-2">No employees found</p>
                <p className="text-sm text-[var(--text-secondary)]">Add employees to build your organization chart</p>
              </div>
            </div>
          ) : (
            <div className="min-w-max py-8">
              <div className="flex flex-col items-center space-y-16">
                {hierarchy.map(root => renderEmployeeCard(root))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
