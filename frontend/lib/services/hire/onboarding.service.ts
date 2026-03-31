
import { apiClient } from '../../api/client';
import {
    OnboardingProcess,
    OnboardingProcessRequest,
    OnboardingStatus,
    OnboardingChecklistTemplate,
    OnboardingTemplateTask,
    OnboardingTask
} from '../../types/hire/onboarding';

export const onboardingService = {
    // Get all onboarding processes
    getAllProcesses: async (page = 0, size = 20) => {
        const response = await apiClient.get<{ content: OnboardingProcess[], totalElements: number }>('/onboarding/processes', {
            params: { page, size }
        });
        return response.data;
    },

    // Get process by ID
    getProcessById: async (id: string) => {
        const response = await apiClient.get<OnboardingProcess>(`/onboarding/processes/${id}`);
        return response.data;
    },

    // Get process by Employee ID
    getProcessByEmployeeId: async (employeeId: string) => {
        const response = await apiClient.get<OnboardingProcess>(`/onboarding/processes/employee/${employeeId}`);
        return response.data;
    },

    // Create new onboarding process
    createProcess: async (data: OnboardingProcessRequest) => {
        const response = await apiClient.post<OnboardingProcess>('/onboarding/processes', data);
        return response.data;
    },

    // Update process status
    updateStatus: async (id: string, status: OnboardingStatus) => {
        const response = await apiClient.patch<OnboardingProcess>(`/onboarding/processes/${id}/status`, null, {
            params: { status }
        });
        return response.data;
    },

    // Update process progress
    updateProgress: async (id: string, percentage: number) => {
        const response = await apiClient.patch<OnboardingProcess>(`/onboarding/processes/${id}/progress`, null, {
            params: { completionPercentage: percentage }
        });
        return response.data;
    },

    // Get processes by status
    getProcessesByStatus: async (status: OnboardingStatus) => {
        const response = await apiClient.get<OnboardingProcess[]>(`/onboarding/processes/status/${status}`);
        return response.data;
    },

    // Get all onboarding templates
    getAllTemplates: async () => {
        const response = await apiClient.get<OnboardingChecklistTemplate[]>('/onboarding/templates');
        return response.data;
    },

    // Get template by ID
    getTemplateById: async (templateId: string) => {
        const response = await apiClient.get<OnboardingChecklistTemplate>(`/onboarding/templates/${templateId}`);
        return response.data;
    },

    // Create onboarding template
    createTemplate: async (data: Partial<OnboardingChecklistTemplate>) => {
        const response = await apiClient.post<OnboardingChecklistTemplate>('/onboarding/templates', data);
        return response.data;
    },

    // Update onboarding template
    updateTemplate: async (templateId: string, data: Partial<OnboardingChecklistTemplate>) => {
        const response = await apiClient.put<OnboardingChecklistTemplate>(`/onboarding/templates/${templateId}`, data);
        return response.data;
    },

    // Delete onboarding template
    deleteTemplate: async (templateId: string) => {
        await apiClient.delete(`/onboarding/templates/${templateId}`);
    },

    // Add task to template
    addTemplateTask: async (templateId: string, data: Partial<OnboardingTemplateTask>) => {
        const response = await apiClient.post<OnboardingTemplateTask>(`/onboarding/templates/${templateId}/tasks`, data);
        return response.data;
    },

    // Get tasks for a template
    getTemplateTasks: async (templateId: string) => {
        const response = await apiClient.get<OnboardingTemplateTask[]>(`/onboarding/templates/${templateId}/tasks`);
        return response.data;
    },

    // Update template task
    updateTemplateTask: async (templateId: string, taskId: string, data: Partial<OnboardingTemplateTask>) => {
        const response = await apiClient.put<OnboardingTemplateTask>(`/onboarding/templates/${templateId}/tasks/${taskId}`, data);
        return response.data;
    },

    // Delete template task
    deleteTemplateTask: async (templateId: string, taskId: string) => {
        await apiClient.delete(`/onboarding/templates/${templateId}/tasks/${taskId}`);
    },

    // Get tasks for a process
    getProcessTasks: async (processId: string) => {
        const response = await apiClient.get<OnboardingTask[]>(`/onboarding/processes/${processId}/tasks`);
        return response.data;
    },

    // Update task status
    updateTaskStatus: async (taskId: string, status: string, remarks?: string) => {
        const response = await apiClient.patch<OnboardingTask>(`/onboarding/tasks/${taskId}/status`, null, {
            params: { status, remarks }
        });
        return response.data;
    }
};
