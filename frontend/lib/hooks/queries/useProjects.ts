'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '@/lib/services/project.service';
import { CreateProjectRequest, UpdateProjectRequest, AssignEmployeeRequest } from '@/lib/types/project';

// Query keys for cache management
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (page: number, size: number, status?: string, priority?: string) =>
    [...projectKeys.lists(), { page, size, status, priority }] as const,
  search: (query: string, page: number, size: number) =>
    [...projectKeys.all, 'search', { query, page, size }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  team: (id: string) => [...projectKeys.all, 'team', id] as const,
  employeeProjects: (employeeId: string) =>
    [...projectKeys.all, 'employee', employeeId] as const,
};

// Get paginated list of projects
export function useProjects(
  page: number = 0,
  size: number = 20,
  status?: string,
  priority?: string
) {
  return useQuery({
    queryKey: projectKeys.list(page, size, status, priority),
    queryFn: () => projectService.getAllProjects(page, size, status, priority),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Search projects
export function useProjectSearch(
  query: string,
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: projectKeys.search(query, page, size),
    queryFn: () => projectService.searchProjects(query, page, size),
    enabled: enabled && query.length > 0,
    staleTime: 30 * 1000, // 30 seconds for search
  });
}

// Get single project
export function useProject(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectService.getProject(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get project team members
export function useProjectTeam(projectId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: projectKeys.team(projectId),
    queryFn: () => projectService.getTeamMembers(projectId),
    enabled: enabled && !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

// Get employee's projects
export function useEmployeeProjects(employeeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: projectKeys.employeeProjects(employeeId),
    queryFn: () => projectService.getEmployeeProjects(employeeId),
    enabled: enabled && !!employeeId,
    staleTime: 2 * 60 * 1000,
  });
}

// Create project mutation
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectService.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Update project mutation
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectRequest }) =>
      projectService.updateProject(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Delete project mutation
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Assign employee to project
export function useAssignEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: AssignEmployeeRequest }) =>
      projectService.assignEmployee(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.team(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

// Remove employee from project
export function useRemoveEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, employeeId }: { projectId: string; employeeId: string }) =>
      projectService.removeEmployee(projectId, employeeId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.team(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

// Prefetch project (for hover prefetching)
export function usePrefetchProject() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: projectKeys.detail(id),
      queryFn: () => projectService.getProject(id),
      staleTime: 5 * 60 * 1000,
    });
  };
}

// HRMS Project specific hooks (using hrmsProjectService)
export const hrmsProjectKeys = {
  all: ['hrmsProjects'] as const,
  lists: () => [...hrmsProjectKeys.all, 'list'] as const,
  list: (page: number, size: number, filters?: Record<string, string | undefined>) =>
    [...hrmsProjectKeys.lists(), { page, size, ...filters }] as const,
  details: () => [...hrmsProjectKeys.all, 'detail'] as const,
  detail: (id: string) => [...hrmsProjectKeys.details(), id] as const,
  allocations: (projectId: string) =>
    [...hrmsProjectKeys.all, 'allocations', projectId] as const,
};

// Get HRMS paginated list of projects
export function useHrmsProjects(
  page: number = 0,
  size: number = 20,
  filters?: { status?: string; priority?: string; type?: string; ownerId?: string; search?: string }
) {
  return useQuery({
    queryKey: hrmsProjectKeys.list(page, size, filters),
    queryFn: () => {
      const hrmsProjectService = require('@/lib/services/hrms-project.service').hrmsProjectService;
      return hrmsProjectService.listProjects(page, size, filters);
    },
    staleTime: 2 * 60 * 1000,
  });
}

// Get single HRMS project
export function useHrmsProject(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: hrmsProjectKeys.detail(id),
    queryFn: () => {
      const hrmsProjectService = require('@/lib/services/hrms-project.service').hrmsProjectService;
      return hrmsProjectService.getProject(id);
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Create HRMS project
export function useCreateHrmsProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: unknown) => {
      const hrmsProjectService = require('@/lib/services/hrms-project.service').hrmsProjectService;
      return hrmsProjectService.createProject(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hrmsProjectKeys.lists() });
    },
  });
}

// Activate HRMS project
export function useActivateHrmsProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      const hrmsProjectService = require('@/lib/services/hrms-project.service').hrmsProjectService;
      return hrmsProjectService.activateProject(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: hrmsProjectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: hrmsProjectKeys.lists() });
    },
  });
}

// Close HRMS project
export function useCloseHrmsProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, closeDate }: { id: string; closeDate?: string }) => {
      const hrmsProjectService = require('@/lib/services/hrms-project.service').hrmsProjectService;
      return hrmsProjectService.closeProject(id, closeDate);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: hrmsProjectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: hrmsProjectKeys.lists() });
    },
  });
}

// Export HRMS projects
export function useExportHrmsProjects() {
  return useMutation({
    mutationFn: (filters?: Record<string, string | undefined>) => {
      const hrmsProjectService = require('@/lib/services/hrms-project.service').hrmsProjectService;
      return hrmsProjectService.exportProjects(filters);
    },
  });
}

// Project Allocations hooks
export const allocationKeys = {
  all: ['allocations'] as const,
  projectAllocations: (projectId: string) =>
    [...allocationKeys.all, 'project', projectId] as const,
  allocationList: (projectId: string, page: number, size: number) =>
    [...allocationKeys.projectAllocations(projectId), 'list', { page, size }] as const,
  allocationSummary: () => [...allocationKeys.all, 'summary'] as const,
  summaryList: (
    scope: string,
    startDate: string,
    endDate: string,
    page: number,
    size: number
  ) =>
    [
      ...allocationKeys.allocationSummary(),
      { scope, startDate, endDate, page, size },
    ] as const,
};

// Get project allocations
export function useProjectAllocations(
  projectId: string,
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: allocationKeys.allocationList(projectId, page, size),
    queryFn: () => {
      const service = require('@/lib/services/hrms-project-allocation.service')
        .hrmsProjectAllocationService;
      return service.listProjectAllocations(projectId, page, size);
    },
    enabled: enabled && !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

// Assign employee to project
export function useAssignToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: {
        employeeId: string;
        role: string;
        allocationPercentage: number;
        startDate: string;
        endDate?: string;
      };
    }) => {
      const service = require('@/lib/services/hrms-project-allocation.service')
        .hrmsProjectAllocationService;
      return service.assignEmployee(projectId, data);
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: allocationKeys.projectAllocations(projectId),
      });
    },
  });
}

// End allocation
export function useEndAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      allocationId,
      endDate,
    }: {
      projectId: string;
      allocationId: string;
      endDate?: string;
    }) => {
      const service = require('@/lib/services/hrms-project-allocation.service')
        .hrmsProjectAllocationService;
      return service.endAllocation(projectId, allocationId, endDate);
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: allocationKeys.projectAllocations(projectId),
      });
    },
  });
}

// Export allocations
export function useExportAllocations() {
  return useMutation({
    mutationFn: (projectId: string) => {
      const service = require('@/lib/services/hrms-project-allocation.service')
        .hrmsProjectAllocationService;
      return service.exportProjectAllocations(projectId);
    },
  });
}

// Get allocation summary
export function useAllocationSummary(
  scope: 'SELF' | 'TEAM' | 'DEPARTMENT' | 'ORG',
  startDate: string,
  endDate: string,
  page: number = 0,
  size: number = 20,
  employeeSearch?: string,
  employeeId?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: allocationKeys.summaryList(scope, startDate, endDate, page, size),
    queryFn: () => {
      const service = require('@/lib/services/hrms-project-allocation.service')
        .hrmsProjectAllocationService;
      return service.listAllocationSummary(
        scope,
        startDate,
        endDate,
        page,
        size,
        employeeSearch,
        employeeId
      );
    },
    enabled,
    staleTime: 3 * 60 * 1000,
  });
}

// Export allocation summary
export function useExportAllocationSummary() {
  return useMutation({
    mutationFn: ({
      scope,
      startDate,
      endDate,
      employeeSearch,
      employeeId,
    }: {
      scope: 'SELF' | 'TEAM' | 'DEPARTMENT' | 'ORG';
      startDate: string;
      endDate: string;
      employeeSearch?: string;
      employeeId?: string;
    }) => {
      const service = require('@/lib/services/hrms-project-allocation.service')
        .hrmsProjectAllocationService;
      return service.exportAllocationSummary(
        scope,
        startDate,
        endDate,
        employeeSearch,
        employeeId
      );
    },
  });
}
