import { apiClient } from '@/lib/api/client';
import {
    PSAProject,
    PSATimesheet,
    PSATimeEntry,
    PSAInvoice,
    ProjectStatus,
    TimesheetStatus
} from '@/lib/types/psa';

export interface PSAResourceAllocationRequest {
  employeeId: string;
  role?: string;
  allocationPercentage: number;
  startDate: string;
  endDate?: string;
  billingRate?: number;
  costRate?: number;
}

const PROJECTS_URL = '/psa/projects';
const TIMESHEETS_URL = '/psa/timesheets';
const INVOICES_URL = '/psa/invoices';

export const psaService = {
    // --- Projects ---

    getAllProjects: async (): Promise<PSAProject[]> => {
        const response = await apiClient.get<PSAProject[]>(PROJECTS_URL);
        return response.data;
    },

    getProject: async (id: string): Promise<PSAProject> => {
        const response = await apiClient.get<PSAProject>(`${PROJECTS_URL}/${id}`);
        return response.data;
    },

    createProject: async (data: Partial<PSAProject>): Promise<PSAProject> => {
        const response = await apiClient.post<PSAProject>(PROJECTS_URL, data);
        return response.data;
    },

    updateProject: async (id: string, data: Partial<PSAProject>): Promise<PSAProject> => {
        const response = await apiClient.put<PSAProject>(`${PROJECTS_URL}/${id}`, data);
        return response.data;
    },

    deleteProject: async (id: string): Promise<void> => {
        await apiClient.delete(`${PROJECTS_URL}/${id}`);
    },

    getProjectsByStatus: async (status: ProjectStatus): Promise<PSAProject[]> => {
        const response = await apiClient.get<PSAProject[]>(`${PROJECTS_URL}/status/${status}`);
        return response.data;
    },

    allocateResources: async (projectId: string, allocation: PSAResourceAllocationRequest): Promise<PSAProject> => {
        const response = await apiClient.post<PSAProject>(`${PROJECTS_URL}/${projectId}/allocate`, allocation);
        return response.data;
    },

    // --- Timesheets ---

    createTimesheet: async (data: Partial<PSATimesheet>): Promise<PSATimesheet> => {
        const response = await apiClient.post<PSATimesheet>(TIMESHEETS_URL, data);
        return response.data;
    },

    getEmployeeTimesheets: async (employeeId: string): Promise<PSATimesheet[]> => {
        const response = await apiClient.get<PSATimesheet[]>(`${TIMESHEETS_URL}/employee/${employeeId}`);
        return response.data;
    },

    getTimesheet: async (id: string): Promise<PSATimesheet> => {
        const response = await apiClient.get<PSATimesheet>(`${TIMESHEETS_URL}/${id}`);
        return response.data;
    },

    submitTimesheet: async (id: string): Promise<PSATimesheet> => {
        const response = await apiClient.post<PSATimesheet>(`${TIMESHEETS_URL}/${id}/submit`);
        return response.data;
    },

    approveTimesheet: async (id: string, approverId: string): Promise<PSATimesheet> => {
        const response = await apiClient.post<PSATimesheet>(`${TIMESHEETS_URL}/${id}/approve`, { approverId });
        return response.data;
    },

    rejectTimesheet: async (id: string, reason: string): Promise<PSATimesheet> => {
        const response = await apiClient.post<PSATimesheet>(`${TIMESHEETS_URL}/${id}/reject`, { reason });
        return response.data;
    },

    addTimeEntry: async (timesheetId: string, entry: Partial<PSATimeEntry>): Promise<PSATimeEntry> => {
        const response = await apiClient.post<PSATimeEntry>(`${TIMESHEETS_URL}/${timesheetId}/entries`, entry);
        return response.data;
    },

    getTimesheetEntries: async (timesheetId: string): Promise<PSATimeEntry[]> => {
        const response = await apiClient.get<PSATimeEntry[]>(`${TIMESHEETS_URL}/${timesheetId}/entries`);
        return response.data;
    },

    // --- Invoices ---

    createInvoice: async (data: Partial<PSAInvoice>): Promise<PSAInvoice> => {
        const response = await apiClient.post<PSAInvoice>(INVOICES_URL, data);
        return response.data;
    },

    getProjectInvoices: async (projectId: string): Promise<PSAInvoice[]> => {
        const response = await apiClient.get<PSAInvoice[]>(`${INVOICES_URL}/project/${projectId}`);
        return response.data;
    },

    getClientInvoices: async (clientId: string): Promise<PSAInvoice[]> => {
        const response = await apiClient.get<PSAInvoice[]>(`${INVOICES_URL}/client/${clientId}`);
        return response.data;
    },

    getInvoice: async (id: string): Promise<PSAInvoice> => {
        const response = await apiClient.get<PSAInvoice>(`${INVOICES_URL}/${id}`);
        return response.data;
    },

    updateInvoice: async (id: string, data: Partial<PSAInvoice>): Promise<PSAInvoice> => {
        const response = await apiClient.put<PSAInvoice>(`${INVOICES_URL}/${id}`, data);
        return response.data;
    },

    approveInvoice: async (id: string): Promise<PSAInvoice> => {
        const response = await apiClient.post<PSAInvoice>(`${INVOICES_URL}/${id}/approve`);
        return response.data;
    },
};
