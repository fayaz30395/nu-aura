import { apiClient } from '@/lib/api/client';
import {
    ProvidentFundConfig,
    ESIConfig,
    ProfessionalTaxSlab,
    EmployeePFRecord,
    EmployeeESIRecord
} from '@/lib/types/statutory';

const PF_URL = '/statutory/pf';
const ESI_URL = '/statutory/esi';
const PT_URL = '/statutory/pt';

export const statutoryService = {
    // --- Provident Fund (PF) ---

    createPFConfig: async (data: Partial<ProvidentFundConfig>): Promise<ProvidentFundConfig> => {
        const response = await apiClient.post<ProvidentFundConfig>(`${PF_URL}/config`, data);
        return response.data;
    },

    getActivePFConfigs: async (): Promise<ProvidentFundConfig[]> => {
        const response = await apiClient.get<ProvidentFundConfig[]>(`${PF_URL}/config`);
        return response.data;
    },

    enrollEmployeePF: async (data: Partial<EmployeePFRecord>): Promise<EmployeePFRecord> => {
        const response = await apiClient.post<EmployeePFRecord>(`${PF_URL}/employee`, data);
        return response.data;
    },

    getEmployeePFRecord: async (employeeId: string): Promise<EmployeePFRecord> => {
        const response = await apiClient.get<EmployeePFRecord>(`${PF_URL}/employee/${employeeId}`);
        return response.data;
    },

    // --- Employee State Insurance (ESI) ---

    createESIConfig: async (data: Partial<ESIConfig>): Promise<ESIConfig> => {
        const response = await apiClient.post<ESIConfig>(`${ESI_URL}/config`, data);
        return response.data;
    },

    getActiveESIConfigs: async (): Promise<ESIConfig[]> => {
        const response = await apiClient.get<ESIConfig[]>(`${ESI_URL}/config`);
        return response.data;
    },

    enrollEmployeeESI: async (data: Partial<EmployeeESIRecord>): Promise<EmployeeESIRecord> => {
        const response = await apiClient.post<EmployeeESIRecord>(`${ESI_URL}/employee`, data);
        return response.data;
    },

    getEmployeeESIRecord: async (employeeId: string): Promise<EmployeeESIRecord> => {
        const response = await apiClient.get<EmployeeESIRecord>(`${ESI_URL}/employee/${employeeId}`);
        return response.data;
    },

    // --- Professional Tax (PT) ---

    createPTSlab: async (data: Partial<ProfessionalTaxSlab>): Promise<ProfessionalTaxSlab> => {
        const response = await apiClient.post<ProfessionalTaxSlab>(`${PT_URL}/slab`, data);
        return response.data;
    },

    getPTSlabsByState: async (stateCode: string): Promise<ProfessionalTaxSlab[]> => {
        const response = await apiClient.get<ProfessionalTaxSlab[]>(`${PT_URL}/slabs/${stateCode}`);
        return response.data;
    },
};
