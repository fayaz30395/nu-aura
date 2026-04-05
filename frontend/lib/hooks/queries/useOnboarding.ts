'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {OnboardingStatus} from '@/lib/types/hire/onboarding';
import {onboardingService} from '@/lib/services/hire/onboarding.service';

// Query Key Factory
export const onboardingKeys = {
  all: ['onboarding'] as const,
  processes: () => [...onboardingKeys.all, 'processes'] as const,
  processesPaginated: (page: number, size: number) =>
    [...onboardingKeys.processes(), 'paginated', {page, size}] as const,
  processByStatus: (status: OnboardingStatus) =>
    [...onboardingKeys.processes(), 'status', status] as const,
  processById: (id: string) =>
    [...onboardingKeys.processes(), 'detail', id] as const,
  processByEmployeeId: (employeeId: string) =>
    [...onboardingKeys.processes(), 'employee', employeeId] as const,
  processTasksById: (processId: string) =>
    [...onboardingKeys.processes(), 'tasks', processId] as const,
  templates: () => [...onboardingKeys.all, 'templates'] as const,
  templateById: (templateId: string) =>
    [...onboardingKeys.templates(), 'detail', templateId] as const,
  templateTasksById: (templateId: string) =>
    [...onboardingKeys.templates(), 'tasks', templateId] as const,
};

// Query Hooks

/**
 * Fetch paginated onboarding processes
 */
export function useOnboardingProcesses(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: onboardingKeys.processesPaginated(page, size),
    queryFn: () => onboardingService.getAllProcesses(page, size),
  });
}

/**
 * Fetch a single onboarding process by ID
 */
export function useOnboardingProcess(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: onboardingKeys.processById(id),
    queryFn: () => onboardingService.getProcessById(id),
    enabled,
  });
}

/**
 * Fetch onboarding process by Employee ID
 */
export function useOnboardingProcessByEmployee(
  employeeId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: onboardingKeys.processByEmployeeId(employeeId),
    queryFn: () => onboardingService.getProcessByEmployeeId(employeeId),
    enabled,
  });
}

/**
 * Fetch onboarding processes by status
 */
export function useOnboardingProcessesByStatus(status: OnboardingStatus) {
  return useQuery({
    queryKey: onboardingKeys.processByStatus(status),
    queryFn: () => onboardingService.getProcessesByStatus(status),
  });
}

/**
 * Fetch all onboarding templates
 */
export function useOnboardingTemplates() {
  return useQuery({
    queryKey: onboardingKeys.templates(),
    queryFn: () => onboardingService.getAllTemplates(),
  });
}

/**
 * Fetch a single onboarding template by ID
 */
export function useOnboardingTemplate(
  templateId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: onboardingKeys.templateById(templateId),
    queryFn: () => onboardingService.getTemplateById(templateId),
    enabled,
  });
}

/**
 * Fetch tasks for a specific onboarding template
 */
export function useOnboardingTemplateTasks(
  templateId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: onboardingKeys.templateTasksById(templateId),
    queryFn: () => onboardingService.getTemplateTasks(templateId),
    enabled,
  });
}

/**
 * Fetch tasks for a specific onboarding process
 */
export function useOnboardingProcessTasks(
  processId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: onboardingKeys.processTasksById(processId),
    queryFn: () => onboardingService.getProcessTasks(processId),
    enabled,
  });
}

// Mutation Hooks

/**
 * Create a new onboarding process
 */
export function useCreateOnboardingProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof onboardingService.createProcess>[0]) =>
      onboardingService.createProcess(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: onboardingKeys.processes()});
    },
  });
}

/**
 * Update onboarding process status
 */
export function useUpdateOnboardingProcessStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   id,
                   status,
                 }: {
      id: string;
      status: OnboardingStatus;
    }) => onboardingService.updateStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: onboardingKeys.processes()});
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.processById(data.id),
      });
    },
  });
}

/**
 * Update onboarding process progress
 */
export function useUpdateOnboardingProcessProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   id,
                   percentage,
                 }: {
      id: string;
      percentage: number;
    }) => onboardingService.updateProgress(id, percentage),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: onboardingKeys.processes()});
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.processById(data.id),
      });
    },
  });
}

/**
 * Create a new onboarding template
 */
export function useCreateOnboardingTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Parameters<typeof onboardingService.createTemplate>[0]
    ) => onboardingService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: onboardingKeys.templates()});
    },
  });
}

/**
 * Update an existing onboarding template
 */
export function useUpdateOnboardingTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   templateId,
                   data,
                 }: {
      templateId: string;
      data: Parameters<typeof onboardingService.updateTemplate>[1];
    }) => onboardingService.updateTemplate(templateId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: onboardingKeys.templates()});
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.templateById(data.id),
      });
    },
  });
}

/**
 * Delete an onboarding template
 */
export function useDeleteOnboardingTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      onboardingService.deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: onboardingKeys.templates()});
    },
  });
}

/**
 * Add a task to an onboarding template
 */
export function useAddOnboardingTemplateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   templateId,
                   data,
                 }: {
      templateId: string;
      data: Parameters<typeof onboardingService.addTemplateTask>[1];
    }) => onboardingService.addTemplateTask(templateId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.templateTasksById(variables.templateId),
      });
    },
  });
}

/**
 * Update an onboarding template task
 */
export function useUpdateOnboardingTemplateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   templateId,
                   taskId,
                   data,
                 }: {
      templateId: string;
      taskId: string;
      data: Parameters<typeof onboardingService.updateTemplateTask>[2];
    }) => onboardingService.updateTemplateTask(templateId, taskId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.templateTasksById(variables.templateId),
      });
    },
  });
}

/**
 * Delete an onboarding template task
 */
export function useDeleteOnboardingTemplateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   templateId,
                   taskId,
                 }: {
      templateId: string;
      taskId: string;
    }) => onboardingService.deleteTemplateTask(templateId, taskId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.templateTasksById(variables.templateId),
      });
    },
  });
}

/**
 * Update the status of an onboarding task
 */
export function useUpdateOnboardingTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   taskId,
                   status,
                   remarks,
                 }: {
      taskId: string;
      status: string;
      remarks?: string;
    }) => onboardingService.updateTaskStatus(taskId, status, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: onboardingKeys.all,
      });
    },
  });
}
