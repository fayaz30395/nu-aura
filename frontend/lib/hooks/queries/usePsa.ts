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
import type { PSAResourceAllocationRequest } from '@/lib/services/psa.service';
import { useToast } from '@/components/notifications/ToastProvider';

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
  const toast = useToast();

  return useMutation({
    mutationFn: (data: Partial<PSAProject>) => psaService.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: psaKeys.projects() });
      toast.success('Project Created', 'PSA project has been created successfully');
    },
    onError: (error: Error) => {
      toast.error('Operation Failed', error.message || 'Failed to create project');
    },
  });
}

export function useUpdatePsaProject() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PSAProject> }) =>
      psaService.updateProject(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: psaKeys.project(id) });
      queryClient.invalidateQueries({ queryKey: psaKeys.projects() });
      toast.success('Project Updated', 'Project details have been updated');
    },
    onError: (error: Error) => {
      toast.error('Operation Failed', error.message || 'Failed to update project');
    },
  });
}

export function useDeletePsaProject() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => psaService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: psaKeys.projects() });
      toast.success('Project Deleted', 'Project has been removed');
    },
    onError: (error: Error) => {
      toast.error('Operation Failed', error.message || 'Failed to delete project');
    },
  });
}

export function useAllocateResources() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ projectId, allocation }: { projectId: string; allocation: PSAResourceAllocationRequest }) =>
      psaService.allocateResources(projectId, allocation),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: psaKeys.project(projectId) });
      queryClient.invalidateQueries({ queryKey: psaKeys.projects() });
      toast.success('Resource Allocated', 'Resource has been allocated to the project');
    },
    onError: (error: Error) => {
      toast.error('Allocation Failed', error.message || 'Failed to allocate resource');
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
  const toast = useToast();

  return useMutation({
    mutationFn: (data: Partial<PSATimesheet>) => psaService.createTimesheet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheets() });
      toast.success('Timesheet Created', 'PSA timesheet has been created');
    },
    onError: (error: Error) => {
      toast.error('Operation Failed', error.message || 'Failed to create timesheet');
    },
  });
}

export function useSubmitPsaTimesheet() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => psaService.submitTimesheet(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheet(id) });
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheets() });
      toast.success('Timesheet Submitted', 'Timesheet has been submitted for approval');
    },
    onError: (error: Error) => {
      toast.error('Submission Failed', error.message || 'Failed to submit timesheet');
    },
  });
}

export function useApprovePsaTimesheet() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, approverId }: { id: string; approverId: string }) =>
      psaService.approveTimesheet(id, approverId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheet(id) });
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheets() });
      toast.success('Timesheet Approved', 'Timesheet has been approved');
    },
    onError: (error: Error) => {
      toast.error('Approval Failed', error.message || 'Failed to approve timesheet');
    },
  });
}

export function useRejectPsaTimesheet() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      psaService.rejectTimesheet(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheet(id) });
      queryClient.invalidateQueries({ queryKey: psaKeys.timesheets() });
      toast.info('Timesheet Rejected', 'Timesheet has been rejected');
    },
    onError: (error: Error) => {
      toast.error('Rejection Failed', error.message || 'Failed to reject timesheet');
    },
  });
}

export function useAddPsaTimeEntry() {
  const queryClient = useQueryClient();
  const toast = useToast();

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
      toast.success('Time Entry Added', 'Time entry has been recorded');
    },
    onError: (error: Error) => {
      toast.error('Operation Failed', error.message || 'Failed to add time entry');
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
  const toast = useToast();

  return useMutation({
    mutationFn: (data: Partial<PSAInvoice>) => psaService.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: psaKeys.invoices() });
      toast.success('Invoice Created', 'New invoice has been created');
    },
    onError: (error: Error) => {
      toast.error('Operation Failed', error.message || 'Failed to create invoice');
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PSAInvoice> }) =>
      psaService.updateInvoice(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: psaKeys.invoice(id) });
      queryClient.invalidateQueries({ queryKey: psaKeys.invoices() });
      toast.success('Invoice Updated', 'Invoice details have been updated');
    },
    onError: (error: Error) => {
      toast.error('Operation Failed', error.message || 'Failed to update invoice');
    },
  });
}

export function useApproveInvoice() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => psaService.approveInvoice(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: psaKeys.invoice(id) });
      queryClient.invalidateQueries({ queryKey: psaKeys.invoices() });
      toast.success('Invoice Approved', 'Invoice has been approved');
    },
    onError: (error: Error) => {
      toast.error('Approval Failed', error.message || 'Failed to approve invoice');
    },
  });
}
