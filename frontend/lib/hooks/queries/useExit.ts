'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreateExitProcessRequest,
  UpdateExitProcessRequest,
  ExitStatus,
} from '@/lib/types/exit';
import { exitService } from '@/lib/services/exit.service';

// Query Key Factory
export const exitKeys = {
  all: ['exit'] as const,
  processes: () => [...exitKeys.all, 'processes'] as const,
  processesPaginated: (page: number, size: number) =>
    [...exitKeys.processes(), 'paginated', { page, size }] as const,
  processById: (id: string) => [...exitKeys.processes(), 'detail', id] as const,
  processByEmployeeId: (employeeId: string) =>
    [...exitKeys.processes(), 'employee', employeeId] as const,
  processByStatus: (status: ExitStatus) =>
    [...exitKeys.processes(), 'status', status] as const,
  dashboard: () => [...exitKeys.all, 'dashboard'] as const,
};

// Query Hooks

/**
 * Fetch paginated exit processes
 */
export function useExitProcesses(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: exitKeys.processesPaginated(page, size),
    queryFn: () => exitService.getAllExitProcesses(page, size),
  });
}

/**
 * Fetch a single exit process by ID
 */
export function useExitProcess(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: exitKeys.processById(id),
    queryFn: () => exitService.getExitProcess(id),
    enabled,
  });
}

/**
 * Fetch exit process by employee ID
 */
export function useExitProcessByEmployee(employeeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: exitKeys.processByEmployeeId(employeeId),
    queryFn: () => exitService.getExitProcessByEmployee(employeeId),
    enabled,
  });
}

/**
 * Fetch exit processes by status
 */
export function useExitProcessesByStatus(status: ExitStatus) {
  return useQuery({
    queryKey: exitKeys.processByStatus(status),
    queryFn: () => exitService.getExitProcessesByStatus(status),
  });
}

/**
 * Fetch exit dashboard metrics
 */
export function useExitDashboard() {
  return useQuery({
    queryKey: exitKeys.dashboard(),
    queryFn: () => exitService.getDashboard(),
  });
}

// Mutation Hooks

/**
 * Create a new exit process
 */
export function useCreateExitProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExitProcessRequest) => exitService.createExitProcess(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exitKeys.processes() });
      queryClient.invalidateQueries({ queryKey: exitKeys.dashboard() });
    },
  });
}

/**
 * Update an exit process
 */
export function useUpdateExitProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExitProcessRequest }) =>
      exitService.updateExitProcess(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: exitKeys.processes() });
      queryClient.invalidateQueries({ queryKey: exitKeys.processById(data.id) });
      queryClient.invalidateQueries({ queryKey: exitKeys.dashboard() });
    },
  });
}

/**
 * Update exit process status
 */
export function useUpdateExitStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ExitStatus }) =>
      exitService.updateExitStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: exitKeys.processes() });
      queryClient.invalidateQueries({ queryKey: exitKeys.processById(data.id) });
      queryClient.invalidateQueries({ queryKey: exitKeys.dashboard() });
    },
  });
}

/**
 * Delete an exit process
 */
export function useDeleteExitProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => exitService.deleteExitProcess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exitKeys.processes() });
      queryClient.invalidateQueries({ queryKey: exitKeys.dashboard() });
    },
  });
}
