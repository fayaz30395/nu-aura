'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { psaService } from '@/lib/services/hrms/psa.service';
import {
  PSATimesheet,
  PSATimeEntry,
  PSAInvoice,
} from '@/lib/types/hrms/psa';
import { useToast } from '@/components/notifications/ToastProvider';

// Query key factory
export const psaKeys = {
  all: ['psa'] as const,
  timesheets: () => [...psaKeys.all, 'timesheets'] as const,
  timesheetsByEmployee: (employeeId: string) =>
    [...psaKeys.timesheets(), 'employee', employeeId] as const,
  timesheetsByProject: (projectId: string) =>
    [...psaKeys.timesheets(), 'project', projectId] as const,
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

// ─── Timesheets ───────────────────────────────────────────────────────────────

export function usePsaEmployeeTimesheets(employeeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: psaKeys.timesheetsByEmployee(employeeId),
    queryFn: () => psaService.getEmployeeTimesheets(employeeId),
    enabled: enabled && !!employeeId,
    staleTime: 3 * 60 * 1000,
  });
}

export function usePsaProjectTimesheets(projectId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: psaKeys.timesheetsByProject(projectId),
    queryFn: () => psaService.getProjectTimesheets(projectId),
    enabled: enabled && !!projectId,
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
      toast.success('Timesheet Created', 'Timesheet has been created');
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

// ─── Invoices ─────────────────────────────────────────────────────────────────

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
