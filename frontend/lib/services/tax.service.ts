import { apiClient } from '@/lib/api/client';
import {
    TaxDeclarationRequest,
    TaxDeclarationResponse,
    TaxProofRequest,
    TaxProofResponse
} from '@/lib/types/tax';

const BASE_URL = '/tax-declarations';

export const taxService = {
    // Create a new tax declaration
    createval: async (data: TaxDeclarationRequest): Promise<TaxDeclarationResponse> => {
        const response = await apiClient.post<TaxDeclarationResponse>(BASE_URL, data);
        return response.data;
    },

    // Update an existing tax declaration
    update: async (id: string, data: TaxDeclarationRequest): Promise<TaxDeclarationResponse> => {
        const response = await apiClient.put<TaxDeclarationResponse>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    // Get declaration by ID
    getById: async (id: string): Promise<TaxDeclarationResponse> => {
        const response = await apiClient.get<TaxDeclarationResponse>(`${BASE_URL}/${id}`);
        return response.data;
    },

    // Get declarations by employee ID
    getByEmployee: async (employeeId: string): Promise<TaxDeclarationResponse[]> => {
        const response = await apiClient.get<TaxDeclarationResponse[]>(`${BASE_URL}/employee/${employeeId}`);
        return response.data;
    },

    // Get all declarations (admin/HR view)
    getAll: async (params?: any): Promise<any> => {
        const response = await apiClient.get<any>(BASE_URL, { params });
        return response.data;
    },

    // Submit declaration for approval
    submit: async (id: string): Promise<TaxDeclarationResponse> => {
        const response = await apiClient.patch<TaxDeclarationResponse>(`${BASE_URL}/${id}/submit`);
        return response.data;
    },

    // Approve declaration
    approve: async (id: string, approverId: string): Promise<TaxDeclarationResponse> => {
        const response = await apiClient.patch<TaxDeclarationResponse>(`${BASE_URL}/${id}/approve`, null, {
            params: { approverId },
        });
        return response.data;
    },

    // Reject declaration
    reject: async (id: string, rejectedBy: string, reason: string): Promise<TaxDeclarationResponse> => {
        const response = await apiClient.patch<TaxDeclarationResponse>(`${BASE_URL}/${id}/reject`, null, {
            params: { rejectedBy, reason },
        });
        return response.data;
    },

    // Delete declaration
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },

    // --- Proofs ---

    addProof: async (employeeId: string, data: TaxProofRequest): Promise<TaxProofResponse> => {
        const response = await apiClient.post<TaxProofResponse>(`${BASE_URL}/proofs`, data, {
            params: { employeeId },
        });
        return response.data;
    },

    verifyProof: async (
        proofId: string,
        verifiedBy: string,
        approvedAmount?: number,
        notes?: string
    ): Promise<TaxProofResponse> => {
        const response = await apiClient.patch<TaxProofResponse>(`${BASE_URL}/proofs/${proofId}/verify`, null, {
            params: { verifiedBy, approvedAmount, notes },
        });
        return response.data;
    },

    getProofs: async (declarationId: string): Promise<TaxProofResponse[]> => {
        const response = await apiClient.get<TaxProofResponse[]>(`${BASE_URL}/${declarationId}/proofs`);
        return response.data;
    },
};
