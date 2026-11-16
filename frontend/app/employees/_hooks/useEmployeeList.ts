'use client';

import {useEffect, useMemo, useState} from 'react';
import type {FilterCondition} from '@/components/ui/AdvancedFilterPanel';
import {loadColumnVisibility} from '@/components/ui/ColumnVisibilityToggle';
import {useEmployees} from '@/lib/hooks/queries/useEmployees';
import type {Employee} from '@/lib/types/hrms/employee';
import {
  applyAdvancedFilters,
  EMPLOYEE_LIST_PAGE_SIZE,
  EMPLOYEE_TABLE_COLUMNS,
  EMPLOYEE_TABLE_ID,
  SORT_ORDER,
  type SortKey,
} from '../_components/employee-list-config';

// Keep list output scoped to active employees to match the UX contract for
// write-path checks and avoid showing soft-deleted rows in the directory.
const STATUS_FILTER = 'ACTIVE';

/** List state for the employees directory: server query, client refinements, selection and sort. */
export function useEmployeeList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [deptFilter, setDeptFilter] = useState('All');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [deletedEmployeeIds, setDeletedEmployeeIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => loadColumnVisibility(EMPLOYEE_TABLE_ID, EMPLOYEE_TABLE_COLUMNS)
  );
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');

  const employeesQuery = useEmployees(
    currentPage, EMPLOYEE_LIST_PAGE_SIZE, sortBy, sortDirection,
    searchQuery || undefined, STATUS_FILTER
  );

  // useEmployees has no placeholderData, so keep the last page on screen while a new
  // search/sort/page key loads instead of flashing the skeleton.
  const [lastData, setLastData] = useState(employeesQuery.data);
  if (employeesQuery.data && employeesQuery.data !== lastData) {
    setLastData(employeesQuery.data);
  }
  const data = employeesQuery.isError ? employeesQuery.data : (employeesQuery.data ?? lastData);
  const query = {
    data,
    isPending: data === undefined && employeesQuery.isPending,
    isError: employeesQuery.isError,
    error: employeesQuery.error,
    isFetching: employeesQuery.isFetching,
    refetch: employeesQuery.refetch,
  };

  const employees = useMemo(() => data?.content ?? [], [data]);
  const totalPages = data?.totalPages ?? 1;
  const totalElements = data?.totalElements ?? 0;

  // Department chips refine the currently-loaded page client-side; the employees
  // query contract has no department filter.
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of employees) {
      const name = e.departmentName ?? 'Unassigned';
      counts[name] = (counts[name] ?? 0) + 1;
    }
    return counts;
  }, [employees]);

  const deptOptions = useMemo(() => {
    const fromData = Array.from(new Set(employees.map((e) => e.departmentName).filter(Boolean) as string[])).sort();
    return ['All', ...fromData];
  }, [employees]);

  const locationCount = useMemo(() => {
    const locs = new Set<string>();
    for (const e of employees) {
      const loc = e.city ?? e.country;
      if (loc) locs.add(loc);
    }
    return locs.size;
  }, [employees]);

  const visibleEmployees = useMemo(() => {
    const notDeleted = employees.filter(
      (employee) => employee.status !== 'TERMINATED' && !deletedEmployeeIds.has(employee.id)
    );
    const deptFiltered = deptFilter === 'All'
      ? notDeleted
      : notDeleted.filter((e) => e.departmentName === deptFilter);
    return applyAdvancedFilters(deptFiltered, filterConditions, filterLogic);
  }, [employees, deptFilter, deletedEmployeeIds, filterConditions, filterLogic]);

  useEffect(() => {
    if (deletedEmployeeIds.size === 0) return;
    setDeletedEmployeeIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const deletedId of prev) {
        if (!employees.some((employee) => employee.id === deletedId)) {
          next.delete(deletedId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [employees, deletedEmployeeIds]);

  // Search is part of the query key, so resetting the page is all that's needed to refetch.
  const submitSearch = () => setCurrentPage(0);

  const cycleSort = () => {
    if (sortDirection === 'DESC') {
      setSortDirection('ASC');
    } else {
      const idx = SORT_ORDER.indexOf(sortBy);
      setSortBy(SORT_ORDER[(idx + 1) % SORT_ORDER.length]);
      setSortDirection('DESC');
    }
    setCurrentPage(0);
  };

  const markDeleted = (employee: Employee) => {
    setDeletedEmployeeIds((prev) => new Set(prev).add(employee.id));
  };

  const hasActiveFilters = searchQuery.trim() !== '' || deptFilter !== 'All' || filterConditions.length > 0;

  const clearFilters = () => {
    setSearchQuery('');
    setDeptFilter('All');
    setFilterConditions([]);
    setCurrentPage(0);
  };

  return {
    query,
    searchQuery,
    setSearchQuery,
    submitSearch,
    currentPage,
    setCurrentPage,
    totalPages,
    totalElements,
    deptFilter,
    setDeptFilter,
    deptCounts,
    deptOptions,
    locationCount,
    visibleEmployees,
    selected,
    setSelected,
    sortBy,
    sortDirection,
    cycleSort,
    visibleColumns,
    setVisibleColumns,
    filterConditions,
    setFilterConditions,
    setFilterLogic,
    hasActiveFilters,
    clearFilters,
    markDeleted,
  };
}

export type EmployeeListState = ReturnType<typeof useEmployeeList>;
