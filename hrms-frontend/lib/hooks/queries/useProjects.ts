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
