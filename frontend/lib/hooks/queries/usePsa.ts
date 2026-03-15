'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { psaService } from '@/lib/services/psa.service';
import {
  PSAProject,
  PSATimesheet,
  PSATimeEntry,
  PSAInvoice,
  ProjectStatus,
  TimesheetStatus,
} from '@/lib/types/psa';

// Query key factory
export const psaKeys = {
  all: ['psa'] as const,
  projects: () => [...psaKeys.all, 'projects'] as const,
  project: (id: string) => [...psaKeys.projects(), id] as const,
  timesheets: () => [...psaKeys.all, 'timesheets'] as const,
  timesheetsByEmployee: (employeeId: string) =>
    [...psaKeys.timesheets(), 'employee', employeeId] as const,
  timesheet: (id: string) => [...psaKeys.timesheets(), id] as const,
  timesheetEntries: (timesheetId: string) =>
    [...psaKeys.timesheet(timesheetId), 'entries'] as const,
  invoices: () => [...psaKeys.all, 'invoices'] as const,
  invoicesByProject: (projectId: string) =>
    [...psaKeys.invoices(), 'project', projectId] as const,
  invoicesByClient: (clientId: string) =>
    [...psaKeys.invoices(), 'client', clientId] as const,
  invoice: (id: string) => [...psaKeys.invoices(), id] as const,
};

// Projects
export function usePsaProjects(enabled: boolean = true) {
  return useQuery({
    queryKey: psaKeys.projects(),
    queryFn: () => psaService.getAllProjects(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePsaProject(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: psaKeys.project(id),
    queryFn: () => psaService.getProject(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePsaProjectsByStatus(status: ProjectStatus, enabled: boolean = true) {
  return useQuery({
    queryKey: [...psaKeys.projects(), 'status', status],
    queryFn: () => psaService.getProjectsByStatus(status),
    enabled: enabled && !!status,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePsaProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<PSAProject>) => psaService.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: psaKeys.projects() });
    },
  });
}

export function useUpdatePsaProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PSAProject> }) =>
      psaService.updateProject(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: psaKeys.project(id) });
      queryClient.invalidateQueries({ queryKey: psaKeys.projects() });
    },
  });
}

export function useDeletePsaProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => psaService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: psaKeys.projects() });
    },
  });
}

export function useAllocateResources() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, allocation }: { projectId: string; allocation: unknown }) =>
      psaService.allocateResources(projectId, allocation),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: psaKeys.project(projectId) });
      queryClient.invalidateQueries({ queryKey: psaKeys.projects() });
    },
  });
}

// Timesheets
export function usePsaTimesheets(enabled: boolean = true) {
  return useQuery({
    queryKey: psaKeys.timesheets(),
    queryFn: async () => {
      // Note: service doesn't have getAllTimesheets, using empty array as fallback
      return [] as PSATimesheet[];
    },
    enabled,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function usePsaEmployeeTimesheets(employeeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: psaKeys.timesheetsByEmployee(employeeId),
    queryFn: () => psaService.getEmployeeTimesheets(employeeId),
    enabled: enabled && !!employeeId,
    staleTime: 3 * 60 * 1000,
  });
}

export function usePsaTimesheet(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: psaKeys.timesheet(id),
    queryFn: () => psaService.getTimesheet(id),
    enabled: enabled && !!id,
    staleTime: 3 * 60 * 1000,
  });
}

export function usePsaTimesheetEntries(timesheetId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: psaKeys.timesheetEntries(timesheetId),
    queryFn: () => psaService.getTimesheetEntries(timesheetId),
    enabled: enabled && !!timesheetId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreatePsaTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<PSATimesheet>) => psaService.createTimesheet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheets() });
    },
  });
}

export function useSubmitPsaTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => psaService.submitTimesheet(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheet(id) });
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheets() });
    },
  });
}

export function useApprovePsaTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approverId }: { id: string; approverId: string }) =>
      psaService.approveTimesheet(id, approverId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheet(id) });
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheets() });
    },
  });
}

export function useRejectPsaTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      psaService.rejectTimesheet(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheet(id) });
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheets() });
    },
  });
}

export function useAddPsaTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      timesheetId,
      entry,
    }: {
      timesheetId: string;
      entry: Partial<PSATimeEntry>;
    }) => psaService.addTimeEntry(timesheetId, entry),
    onSuccess: (_, { timesheetId }) => {
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheet(timesheetId) });
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheetEntries(timesheetId) });
    },
  });
}

// Invoices
export function usePsaInvoices(enabled: boolean = true) {
  return useQuery({
    queryKey: psaKeys.invoices(),
    queryFn: async () => {
      // Note: service doesn't have getAllInvoices, using empty array as fallback
      return [] as PSAInvoice[];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePsaProjectInvoices(projectId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: psaKeys.invoicesByProject(projectId),
    queryFn: () => psaService.getProjectInvoices(projectId),
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePsaClientInvoices(clientId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: psaKeys.invoicesByClient(clientId),
    queryFn: () => psaService.getClientInvoices(clientId),
    enabled: enabled && !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePsaInvoice(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: psaKeys.invoice(id),
    queryFn: () => psaService.getInvoice(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<PSAInvoice>) => psaService.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: psaKeys.invoices() });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PSAInvoice> }) =>
      psaService.updateInvoice(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: psaKeys.invoice(id) });
      queryClient.invalidateQueries({ queryKey: psaKeys.invoices() });
    },
  });
}

export function useApproveInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => psaService.approveInvoice(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: psaKeys.invoice(id) });
      queryClient.invalidateQueries({ queryKey: psaKeys.invoices() });
    },
  });
}
