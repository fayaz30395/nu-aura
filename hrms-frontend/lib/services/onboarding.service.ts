
import { apiClient } from '../api/client';
import { OnboardingProcess, OnboardingProcessRequest, OnboardingStatus, OnboardingUpdateStatusRequest, OnboardingUpdateProgressRequest } from '../types/onboarding';

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
    }
};
