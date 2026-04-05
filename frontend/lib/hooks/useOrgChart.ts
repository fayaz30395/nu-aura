'use client';

import {useQuery} from '@tanstack/react-query';
import {useMemo} from 'react';
import {OrgChartNode, orgChartService, OrgChartStats} from '@/lib/services/hrms/orgChart.service';
import {Department, Employee} from '@/lib/types/hrms/employee';

// ── Query Keys ──────────────────────────────────────────────────────────────

export const orgChartKeys = {
  all: ['org-chart'] as const,
  employees: () => [...orgChartKeys.all, 'employees'] as const,
  departments: () => [...orgChartKeys.all, 'departments'] as const,
  subordinates: (id: string) => [...orgChartKeys.all, 'subordinates', id] as const,
};

// ── Hooks ───────────────────────────────────────────────────────────────────

/** Fetch all employees for the org chart (up to 1000). */
export function useOrgChartEmployees() {
  return useQuery<Employee[]>({
    queryKey: orgChartKeys.employees(),
    queryFn: () => orgChartService.getOrgChartEmployees(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch active departments for filtering. */
export function useOrgChartDepartments() {
  return useQuery<Department[]>({
    queryKey: orgChartKeys.departments(),
    queryFn: () => orgChartService.getActiveDepartments(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Lazy-load subordinates for a specific manager (for 1000+ orgs). */
export function useOrgChartSubordinates(managerId: string, enabled: boolean = false) {
  return useQuery<Employee[]>({
    queryKey: orgChartKeys.subordinates(managerId),
    queryFn: () => orgChartService.getSubordinates(managerId),
    enabled: enabled && !!managerId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Derived Data Hook ───────────────────────────────────────────────────────

interface UseOrgChartTreeOptions {
  departmentFilter?: string;
  searchQuery?: string;
  maxDepth?: number;
}

interface UseOrgChartTreeReturn {
  tree: OrgChartNode[];
  stats: OrgChartStats;
  flatNodes: OrgChartNode[];
  highlightedNodeId: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Main composite hook: fetches data, builds tree, computes stats.
 * Pure computation is memoized so re-renders without param changes are free.
 */
export function useOrgChartTree(options: UseOrgChartTreeOptions = {}): UseOrgChartTreeReturn {
  const {departmentFilter, searchQuery, maxDepth} = options;

  const {
    data: employees = [],
    isLoading: empLoading,
    error: empError,
  } = useOrgChartEmployees();

  const {
    data: departments = [],
    isLoading: deptLoading,
  } = useOrgChartDepartments();

  const tree = useMemo(() => {
    if (employees.length === 0) return [];
    let built = orgChartService.buildTree(employees, departmentFilter);

    // Prune tree to maxDepth if specified
    if (maxDepth !== undefined && maxDepth > 0) {
      const prune = (nodes: OrgChartNode[], currentMax: number): OrgChartNode[] => {
        if (currentMax <= 0) return nodes.map(n => ({...n, children: [] as OrgChartNode[]}));
        return nodes.map(n => ({
          ...n,
          children: prune(n.children, currentMax - 1),
        }));
      };
      built = prune(built, maxDepth - 1);
    }

    return built;
  }, [employees, departmentFilter, maxDepth]);

  const flatNodes = useMemo(() => orgChartService.flattenTree(tree), [tree]);

  const stats = useMemo(
    () => orgChartService.computeStats(tree, employees.length, departments.length),
    [tree, employees.length, departments.length],
  );

  // Find the first node matching the search query
  const highlightedNodeId = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return null;
    const q = searchQuery.toLowerCase().trim();
    const match = flatNodes.find(
      n =>
        n.employee.fullName.toLowerCase().includes(q) ||
        (n.employee.designation ?? '').toLowerCase().includes(q) ||
        (n.employee.employeeCode ?? '').toLowerCase().includes(q),
    );
    return match?.employee.id ?? null;
  }, [flatNodes, searchQuery]);

  return {
    tree,
    stats,
    flatNodes,
    highlightedNodeId,
    isLoading: empLoading || deptLoading,
    error: empError instanceof Error ? empError : null,
  };
}
