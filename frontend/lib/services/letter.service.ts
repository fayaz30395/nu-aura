import { apiClient } from '../api/client';
import {
  LetterTemplate,
  GeneratedLetter,
  CreateLetterTemplateRequest,
  GenerateLetterRequest,
  GenerateOfferLetterRequest,
  LetterTemplatesResponse,
  GeneratedLettersResponse,
  LetterCategory,
} from '../types/letter';

const BASE_URL = '/letters';

export const letterService = {
  // ==================== Templates ====================

  // Get all templates with pagination
  getAllTemplates: async (page = 0, size = 20): Promise<LetterTemplatesResponse> => {
    const response = await apiClient.get<LetterTemplatesResponse>(`${BASE_URL}/templates`, {
      params: { page, size },
    });
    return response.data;
  },

  // Get active templates
  getActiveTemplates: async (): Promise<LetterTemplate[]> => {
    const response = await apiClient.get<LetterTemplate[]>(`${BASE_URL}/templates/active`);
    return response.data;
  },

  // Get templates by category
  getTemplatesByCategory: async (category: LetterCategory): Promise<LetterTemplate[]> => {
    const response = await apiClient.get<LetterTemplate[]>(`${BASE_URL}/templates/by-category`, {
      params: { category },
    });
    return response.data;
  },

  // Get template by ID
  getTemplate: async (id: string): Promise<LetterTemplate> => {
    const response = await apiClient.get<LetterTemplate>(`${BASE_URL}/templates/${id}`);
    return response.data;
  },

  // Create template
  createTemplate: async (data: CreateLetterTemplateRequest): Promise<LetterTemplate> => {
    const response = await apiClient.post<LetterTemplate>(`${BASE_URL}/templates`, data);
    return response.data;
  },

  // Update template
  updateTemplate: async (id: string, data: CreateLetterTemplateRequest): Promise<LetterTemplate> => {
    const response = await apiClient.put<LetterTemplate>(`${BASE_URL}/templates/${id}`, data);
    return response.data;
  },

  // Delete template
  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/templates/${id}`);
  },

  // Get letter categories
  getCategories: async (): Promise<LetterCategory[]> => {
    const response = await apiClient.get<LetterCategory[]>(`${BASE_URL}/categories`);
    return response.data;
  },

  // ==================== Generated Letters ====================

  // Get all generated letters with pagination
  getAllLetters: async (page = 0, size = 20): Promise<GeneratedLettersResponse> => {
    const response = await apiClient.get<GeneratedLettersResponse>(BASE_URL, {
      params: { page, size },
    });
    return response.data;
  },

  // Get letter by ID
  getLetter: async (id: string): Promise<GeneratedLetter> => {
    const response = await apiClient.get<GeneratedLetter>(`${BASE_URL}/${id}`);
    return response.data;
  },

  // Get letters by employee
  getLettersByEmployee: async (employeeId: string, page = 0, size = 20): Promise<GeneratedLettersResponse> => {
    const response = await apiClient.get<GeneratedLettersResponse>(`${BASE_URL}/employee/${employeeId}`, {
      params: { page, size },
    });
    return response.data;
  },

  // Get issued letters for employee
  getIssuedLettersForEmployee: async (employeeId: string): Promise<GeneratedLetter[]> => {
    const response = await apiClient.get<GeneratedLetter[]>(`${BASE_URL}/employee/${employeeId}/issued`);
    return response.data;
  },

  // Get pending approvals
  getPendingApprovals: async (page = 0, size = 20): Promise<GeneratedLettersResponse> => {
    const response = await apiClient.get<GeneratedLettersResponse>(`${BASE_URL}/pending-approvals`, {
      params: { page, size },
    });
    return response.data;
  },

  // Generate letter
  generateLetter: async (data: GenerateLetterRequest, generatedBy: string): Promise<GeneratedLetter> => {
    const response = await apiClient.post<GeneratedLetter>(`${BASE_URL}/generate`, data, {
      params: { generatedBy },
    });
    return response.data;
  },

  // Generate offer letter for candidate
  generateOfferLetter: async (data: GenerateOfferLetterRequest, generatedBy: string): Promise<GeneratedLetter> => {
    const response = await apiClient.post<GeneratedLetter>(`${BASE_URL}/generate-offer`, data, {
      params: { generatedBy },
    });
    return response.data;
  },

  // Issue offer letter with e-signature
  issueOfferLetterWithESign: async (letterId: string, issuerId: string): Promise<GeneratedLetter> => {
    const response = await apiClient.post<GeneratedLetter>(`${BASE_URL}/${letterId}/issue-with-esign`, null, {
      params: { issuerId },
    });
    return response.data;
  },

  // Generate PDF for a letter and upload to storage
  // Must be called before issueOfferLetterWithESign
  generatePdf: async (letterId: string): Promise<{ letterId: string; pdfUrl: string }> => {
    const response = await apiClient.post<{ letterId: string; pdfUrl: string }>(`${BASE_URL}/${letterId}/generate-pdf`);
    return response.data;
  },

  // Submit letter for approval
  submitForApproval: async (letterId: string): Promise<GeneratedLetter> => {
    const response = await apiClient.post<GeneratedLetter>(`${BASE_URL}/${letterId}/submit`);
    return response.data;
  },

  // Approve letter
  approveLetter: async (letterId: string, approverId: string, comments?: string): Promise<GeneratedLetter> => {
    const response = await apiClient.post<GeneratedLetter>(`${BASE_URL}/${letterId}/approve`, null, {
      params: { approverId, comments },
    });
    return response.data;
  },

  // Issue letter
  issueLetter: async (letterId: string, issuerId: string): Promise<GeneratedLetter> => {
    const response = await apiClient.post<GeneratedLetter>(`${BASE_URL}/${letterId}/issue`, null, {
      params: { issuerId },
    });
    return response.data;
  },

  // Revoke letter
  revokeLetter: async (letterId: string): Promise<GeneratedLetter> => {
    const response = await apiClient.post<GeneratedLetter>(`${BASE_URL}/${letterId}/revoke`);
    return response.data;
  },

  // Mark letter as downloaded
  markLetterDownloaded: async (letterId: string, employeeId: string): Promise<void> => {
    await apiClient.post(`${BASE_URL}/${letterId}/downloaded`, null, {
      params: { employeeId },
    });
  },
};
