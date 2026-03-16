import { apiClient } from '@/lib/api/client';
import { logger } from '@/lib/utils/logger';
import {
    PSATimesheet,
    PSATimeEntry,
    PSAInvoice,
} from '@/lib/types/psa';

const TIMESHEETS_URL = '/psa/timesheets';
const INVOICES_URL = '/psa/invoices';

export const psaService = {
    // --- Timesheets ---

    createTimesheet: async (data: Partial<PSATimesheet>): Promise<PSATimesheet> => {
        try {
            const response = await apiClient.post<PSATimesheet>(TIMESHEETS_URL, data);
            return response.data;
        } catch (error) {
            logger.error('Failed to create timesheet', { error, data });
            throw error;
        }
    },

    getEmployeeTimesheets: async (employeeId: string): Promise<PSATimesheet[]> => {
        try {
            const response = await apiClient.get<PSATimesheet[]>(`${TIMESHEETS_URL}/employee/${employeeId}`);
            return response.data;
        } catch (error) {
            logger.error('Failed to fetch employee timesheets', { error, employeeId });
            throw error;
        }
    },

    getProjectTimesheets: async (projectId: string): Promise<PSATimesheet[]> => {
        try {
            const response = await apiClient.get<PSATimesheet[]>(`${TIMESHEETS_URL}/project/${projectId}`);
            return response.data;
        } catch (error) {
            logger.error('Failed to fetch project timesheets', { error, projectId });
            throw error;
        }
    },

    getTimesheet: async (id: string): Promise<PSATimesheet> => {
        try {
            const response = await apiClient.get<PSATimesheet>(`${TIMESHEETS_URL}/${id}`);
            return response.data;
        } catch (error) {
            logger.error('Failed to fetch timesheet', { error, id });
            throw error;
        }
    },

    submitTimesheet: async (id: string): Promise<PSATimesheet> => {
        try {
            const response = await apiClient.post<PSATimesheet>(`${TIMESHEETS_URL}/${id}/submit`);
            return response.data;
        } catch (error) {
            logger.error('Failed to submit timesheet', { error, id });
            throw error;
        }
    },

    approveTimesheet: async (id: string, approverId: string): Promise<PSATimesheet> => {
        try {
            const response = await apiClient.post<PSATimesheet>(`${TIMESHEETS_URL}/${id}/approve`, { approverId });
            return response.data;
        } catch (error) {
            logger.error('Failed to approve timesheet', { error, id, approverId });
            throw error;
        }
    },

    rejectTimesheet: async (id: string, reason: string): Promise<PSATimesheet> => {
        try {
            const response = await apiClient.post<PSATimesheet>(`${TIMESHEETS_URL}/${id}/reject`, { reason });
            return response.data;
        } catch (error) {
            logger.error('Failed to reject timesheet', { error, id, reason });
            throw error;
        }
    },

    addTimeEntry: async (timesheetId: string, entry: Partial<PSATimeEntry>): Promise<PSATimeEntry> => {
        try {
            const response = await apiClient.post<PSATimeEntry>(`${TIMESHEETS_URL}/${timesheetId}/entries`, entry);
            return response.data;
        } catch (error) {
            logger.error('Failed to add time entry', { error, timesheetId, entry });
            throw error;
        }
    },

    getTimesheetEntries: async (timesheetId: string): Promise<PSATimeEntry[]> => {
        try {
            const response = await apiClient.get<PSATimeEntry[]>(`${TIMESHEETS_URL}/${timesheetId}/entries`);
            return response.data;
        } catch (error) {
            logger.error('Failed to fetch timesheet entries', { error, timesheetId });
            throw error;
        }
    },

    // --- Invoices ---

    createInvoice: async (data: Partial<PSAInvoice>): Promise<PSAInvoice> => {
        try {
            const response = await apiClient.post<PSAInvoice>(INVOICES_URL, data);
            return response.data;
        } catch (error) {
            logger.error('Failed to create invoice', { error, data });
            throw error;
        }
    },

    getProjectInvoices: async (projectId: string): Promise<PSAInvoice[]> => {
        try {
            const response = await apiClient.get<PSAInvoice[]>(`${INVOICES_URL}/project/${projectId}`);
            return response.data;
        } catch (error) {
            logger.error('Failed to fetch project invoices', { error, projectId });
            throw error;
        }
    },

    getClientInvoices: async (clientId: string): Promise<PSAInvoice[]> => {
        try {
            const response = await apiClient.get<PSAInvoice[]>(`${INVOICES_URL}/client/${clientId}`);
            return response.data;
        } catch (error) {
            logger.error('Failed to fetch client invoices', { error, clientId });
            throw error;
        }
    },

    getInvoice: async (id: string): Promise<PSAInvoice> => {
        try {
            const response = await apiClient.get<PSAInvoice>(`${INVOICES_URL}/${id}`);
            return response.data;
        } catch (error) {
            logger.error('Failed to fetch invoice', { error, id });
            throw error;
        }
    },

    updateInvoice: async (id: string, data: Partial<PSAInvoice>): Promise<PSAInvoice> => {
        try {
            const response = await apiClient.put<PSAInvoice>(`${INVOICES_URL}/${id}`, data);
            return response.data;
        } catch (error) {
            logger.error('Failed to update invoice', { error, id, data });
            throw error;
        }
    },

    approveInvoice: async (id: string): Promise<PSAInvoice> => {
        try {
            const response = await apiClient.post<PSAInvoice>(`${INVOICES_URL}/${id}/approve`);
            return response.data;
        } catch (error) {
            logger.error('Failed to approve invoice', { error, id });
            throw error;
        }
    },
};
