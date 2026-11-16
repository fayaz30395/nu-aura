'use client';

import {useCallback, useMemo, useState} from 'react';
import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {apiClient} from '@/lib/api/client';
import {
  DEFAULT_DIRECTORY_FILTERS,
  type DirectoryDepartment,
  type DirectorySearchFilters,
  type DirectorySearchResult,
} from '../_components/directory-options';

export function useDirectorySearch() {
  const [filters, setFilters] = useState<DirectorySearchFilters>(DEFAULT_DIRECTORY_FILTERS);

  const {data: departmentResponse} = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: async () => {
      const response = await apiClient.get<{content: DirectoryDepartment[]}>('/departments', {
        params: {page: 0, size: 100},
      });
      return response.data.content || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const departments = useMemo(() => departmentResponse ?? [], [departmentResponse]);

  const searchQuery = useQuery({
    queryKey: ['employees', 'directory', filters],
    queryFn: async (): Promise<DirectorySearchResult> => {
      const response = await apiClient.post<DirectorySearchResult>('/employees/directory/search', filters);
      return {
        content: response.data.content || [],
        totalPages: response.data.totalPages || 0,
        totalElements: response.data.totalElements || 0,
      };
    },
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });

  const setFilter = useCallback(
    <K extends keyof DirectorySearchFilters>(key: K, value: DirectorySearchFilters[K]) => {
      setFilters((prev) => ({...prev, [key]: value}));
    },
    []
  );

  const resetPage = useCallback(() => setFilters((prev) => ({...prev, page: 0})), []);

  const clearFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      departmentIds: [],
      jobRoles: [],
      levels: [],
      employmentTypes: [],
      statuses: ['ACTIVE'],
      page: 0,
    }));
  }, []);

  const hasActiveFilters =
    filters.departmentIds.length > 0 || filters.jobRoles.length > 0 || filters.levels.length > 0;

  return {filters, setFilter, resetPage, clearFilters, hasActiveFilters, departments, searchQuery};
}
