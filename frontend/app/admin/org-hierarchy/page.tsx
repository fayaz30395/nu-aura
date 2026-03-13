'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { employeeService } from '@/lib/services/employee.service';
import { Employee } from '@/lib/types/employee';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Roles } from '@/lib/hooks/usePermissions';
import { getInitials } from '@/lib/utils';

interface EmployeeNode extends Employee {
  subordinates?: EmployeeNode[];
}

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

export default function OrgHierarchyPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const { hasAnyRole, isReady } = usePermissions();

  const [hierarchy, setHierarchy] = useState<EmployeeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!hasHydrated || !isReady) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!hasAnyRole(...ADMIN_ACCESS_ROLES)) {
      router.push('/me/dashboard');
      return;
    }

    loadHierarchy();
  }, [hasHydrated, isReady, isAuthenticated, router, hasAnyRole]);

  const loadHierarchy = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all employees
      const employeesData = await employeeService.getAllEmployees(0, 1000);
      const employees = employeesData.content;

      // Build employee hierarchy tree
      const employeeTree = buildEmployeeTree(employees);
      setHierarchy(employeeTree);

      // Auto-expand root level
      const rootIds = new Set(employeeTree.map(e => e.id));
      setExpandedNodes(rootIds);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load organization hierarchy');
      console.error('Error loading org hierarchy:', err);
    } finally {
      setLoading(false);
    }
  };

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
      'CXO': { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
      'SVP': { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700' },
      'VP': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
      'DIRECTOR': { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700' },
      'SENIOR_MANAGER': { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700' },
      'MANAGER': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
      'LEAD': { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700' },
      'SENIOR': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
      'MID': { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
      'ENTRY': { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700' },
    };
    return level && colors[level] ? colors[level] : { bg: 'bg-surface-50 dark:bg-surface-800/50', border: 'border-surface-300 dark:border-surface-600', text: 'text-surface-700 dark:text-surface-300' };
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
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className={`
                    h-16 w-16 rounded-full ${colors.bg} border-2 ${colors.border}
                    flex items-center justify-center font-bold text-xl
                  `}>
                    {getInitials(employee.fullName)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white rounded-full h-4 w-4"></div>
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
                  <span className={`px-2 py-1 text-xs font-medium rounded-md ${employee.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      employee.status === 'ON_LEAVE' ? 'bg-yellow-100 text-yellow-800' :
                        employee.status === 'ON_NOTICE' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
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
            <div className="absolute left-1/2 -translate-x-1/2 h-8 w-0.5 bg-surface-300 dark:bg-surface-600"></div>
          )}
        </div>

        {/* Subordinates - Horizontal Layout */}
        {hasSubordinates && isExpanded && (
          <div className="relative">
            {/* Horizontal line connecting subordinates */}
            {employee.subordinates!.length > 1 && (
              <div
                className="absolute top-0 h-0.5 bg-surface-300 dark:bg-surface-600"
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
                  <div className="absolute left-1/2 -translate-x-1/2 -top-2 h-8 w-0.5 bg-surface-300 dark:bg-surface-600"></div>
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
          <h1 className="text-3xl font-bold text-surface-800 dark:text-surface-200 flex items-center space-x-3">
            <svg className="h-8 w-8 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span>Organization Chart</span>
          </h1>
          <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
            Employee reporting structure and team hierarchy
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-surface-900 rounded-xl shadow-md p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={loadHierarchy}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2 shadow-sm"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
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
              className="px-4 py-2 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors flex items-center space-x-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span>Expand All</span>
            </button>
            <button
              onClick={() => setExpandedNodes(new Set())}
              className="px-4 py-2 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors flex items-center space-x-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6m0 0L4 11m5-5l5 5" />
              </svg>
              <span>Collapse All</span>
            </button>
          </div>

          <div className="text-sm text-surface-600 dark:text-surface-400">
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
        <div className="bg-white dark:bg-surface-900 rounded-xl shadow-md p-8 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto"></div>
                <p className="mt-6 text-surface-600 dark:text-surface-400 font-medium">Loading organization chart...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 text-red-500 mb-4">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-600 font-medium mb-4">{error}</p>
                <button
                  onClick={loadHierarchy}
                  className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : hierarchy.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-surface-600 dark:text-surface-400 font-medium mb-2">No employees found</p>
                <p className="text-sm text-surface-600 dark:text-surface-400">Add employees to build your organization chart</p>
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
