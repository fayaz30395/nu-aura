/// <reference types="vitest" />
/// <vitest config="{ environment: 'node' }" />
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { letterService } from './letter.service';
import { apiClient } from '@/lib/api/client';

const mockedApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

// Mock types
interface LetterTemplate {
  id: string;
  name: string;
  category: string;
}

interface GeneratedLetter {
  id: string;
  templateId: string;
  employeeId: string;
  status: string;
}

type LetterCategory = 'OFFER' | 'APPOINTMENT' | 'CONFIRMATION' | 'EXPERIENCE' | 'SALARY';

interface LetterTemplatesResponse {
  content: LetterTemplate[];
  totalElements: number;
  totalPages: number;
}

interface GeneratedLettersResponse {
  content: GeneratedLetter[];
  totalElements: number;
  totalPages: number;
}

interface CreateLetterTemplateRequest {
  name: string;
  category: LetterCategory;
  content: string;
}

interface GenerateLetterRequest {
  templateId: string;
  employeeId: string;
}

interface GenerateOfferLetterRequest {
  candidateId: string;
  positionId: string;
}

describe('letterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== Template Tests ====================

  describe('getAllTemplates', () => {
    it('should fetch all templates with default pagination', async () => {
      const mockData: LetterTemplatesResponse = {
        content: [
          { id: '1', name: 'Offer Letter', category: 'OFFER' },
          { id: '2', name: 'Appointment Letter', category: 'APPOINTMENT' },
        ],
        totalElements: 2,
        totalPages: 1,
      };

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await letterService.getAllTemplates();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/letters/templates', {
        params: { page: 0, size: 20 },
      });
      expect(result).toEqual(mockData);
    });

    it('should fetch templates with custom pagination', async () => {
      const mockData: LetterTemplatesResponse = {
        content: [{ id: '3', name: 'Salary Revision', category: 'SALARY' }],
        totalElements: 1,
        totalPages: 1,
      };

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await letterService.getAllTemplates(2, 50);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/letters/templates', {
        params: { page: 2, size: 50 },
      });
      expect(result).toEqual(mockData);
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockedApiClient.get.mockRejectedValue(error);

      await expect(letterService.getAllTemplates()).rejects.toThrow('API Error');
    });
  });

  describe('getActiveTemplates', () => {
    it('should fetch only active templates', async () => {
      const mockData: LetterTemplate[] = [
        { id: '1', name: 'Active Offer', category: 'OFFER' },
        { id: '2', name: 'Active Appointment', category: 'APPOINTMENT' },
      ];

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await letterService.getActiveTemplates();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/letters/templates/active');
      expect(result).toEqual(mockData);
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should fetch templates by category', async () => {
      const mockData: LetterTemplate[] = [
        { id: '1', name: 'Offer Letter 1', category: 'OFFER' },
        { id: '2', name: 'Offer Letter 2', category: 'OFFER' },
      ];

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await letterService.getTemplatesByCategory('OFFER');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/letters/templates/by-category', {
        params: { category: 'OFFER' },
      });
      expect(result).toEqual(mockData);
    });

    it('should fetch templates with different categories', async () => {
      const mockData: LetterTemplate[] = [
        { id: '3', name: 'Salary Revision', category: 'SALARY' },
      ];

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      await letterService.getTemplatesByCategory('SALARY');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/letters/templates/by-category', {
        params: { category: 'SALARY' },
      });
    });
  });

  describe('getTemplate', () => {
    it('should fetch a single template by ID', async () => {
      const mockData: LetterTemplate = {
        id: 'template-123',
        name: 'Offer Letter',
        category: 'OFFER',
      };

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await letterService.getTemplate('template-123');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/letters/templates/template-123');
      expect(result).toEqual(mockData);
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const createData: CreateLetterTemplateRequest = {
        name: 'New Template',
        category: 'OFFER',
        content: 'Template content',
      };

      const mockResponse: LetterTemplate = {
        id: 'new-123',
        name: 'New Template',
        category: 'OFFER',
      };

      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await letterService.createTemplate(createData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/letters/templates', createData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateTemplate', () => {
    it('should update an existing template', async () => {
      const templateId = 'template-123';
      const updateData: CreateLetterTemplateRequest = {
        name: 'Updated Template',
        category: 'APPOINTMENT',
        content: 'Updated content',
      };

      const mockResponse: LetterTemplate = {
        id: templateId,
        name: 'Updated Template',
        category: 'APPOINTMENT',
      };

      mockedApiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await letterService.updateTemplate(templateId, updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith(
        `/letters/templates/${templateId}`,
        updateData
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template', async () => {
      mockedApiClient.delete.mockResolvedValue({});

      await letterService.deleteTemplate('template-123');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/letters/templates/template-123');
    });
  });

  describe('getCategories', () => {
    it('should fetch all letter categories', async () => {
      const mockData: LetterCategory[] = ['OFFER', 'APPOINTMENT', 'CONFIRMATION', 'EXPERIENCE', 'SALARY'];

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await letterService.getCategories();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/letters/categories');
      expect(result).toEqual(mockData);
    });
  });

  // ==================== Generated Letters Tests ====================

  describe('getAllLetters', () => {
    it('should fetch all generated letters with default pagination', async () => {
      const mockData: GeneratedLettersResponse = {
        content: [
          { id: 'letter-1', templateId: 'tpl-1', employeeId: 'emp-1', status: 'ISSUED' },
          { id: 'letter-2', templateId: 'tpl-2', employeeId: 'emp-2', status: 'DRAFT' },
        ],
        totalElements: 2,
        totalPages: 1,
      };

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await letterService.getAllLetters();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/letters', {
        params: { page: 0, size: 20 },
      });
      expect(result).toEqual(mockData);
    });

    it('should fetch letters with custom pagination', async () => {
      const mockData: GeneratedLettersResponse = {
        content: [{ id: 'letter-3', templateId: 'tpl-3', employeeId: 'emp-3', status: 'APPROVED' }],
        totalElements: 1,
        totalPages: 1,
      };

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await letterService.getAllLetters(1, 10);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/letters', {
        params: { page: 1, size: 10 },
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('getLetter', () => {
    it('should fetch a single letter by ID', async () => {
      const mockData: GeneratedLetter = {
        id: 'letter-123',
        templateId: 'tpl-1',
        employeeId: 'emp-1',
        status: 'ISSUED',
      };

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await letterService.getLetter('letter-123');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/letters/letter-123');
      expect(result).toEqual(mockData);
    });
  });

  describe('getLettersByEmployee', () => {
    it('should fetch letters for a specific employee with default pagination', async () => {
      const employeeId = 'emp-123';
      const mockData: GeneratedLettersResponse = {
        content: [
          { id: 'letter-1', templateId: 'tpl-1', employeeId, status: 'ISSUED' },
          { id: 'letter-2', templateId: 'tpl-2', employeeId, status: 'DRAFT' },
        ],
        totalElements: 2,
        totalPages: 1,
      };

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await letterService.getLettersByEmployee(employeeId);

      expect(mockedApiClient.get).toHaveBeenCalledWith(`/letters/employee/${employeeId}`, {
        params: { page: 0, size: 20 },
      });
      expect(result).toEqual(mockData);
    });

    it('should fetch letters with custom pagination', async () => {
      const mockData: GeneratedLettersResponse = {
        content: [{ id: 'letter-3', templateId: 'tpl-3', employeeId: 'emp-123', status: 'APPROVED' }],
        totalElements: 1,
        totalPages: 1,
      };

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      await letterService.getLettersByEmployee('emp-123', 2, 50);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/letters/employee/emp-123', {
        params: { page: 2, size: 50 },
      });
    });
  });

  describe('getIssuedLettersForEmployee', () => {
    it('should fetch issued letters for an employee', async () => {
      const employeeId = 'emp-123';
      const mockData: GeneratedLetter[] = [
        { id: 'letter-1', templateId: 'tpl-1', employeeId, status: 'ISSUED' },
        { id: 'letter-2', templateId: 'tpl-2', employeeId, status: 'ISSUED' },
      ];

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await letterService.getIssuedLettersForEmployee(employeeId);

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        `/letters/employee/${employeeId}/issued`
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('getPendingApprovals', () => {
    it('should fetch pending approvals with default pagination', async () => {
      const mockData: GeneratedLettersResponse = {
        content: [
          { id: 'letter-1', templateId: 'tpl-1', employeeId: 'emp-1', status: 'PENDING_APPROVAL' },
        ],
        totalElements: 1,
        totalPages: 1,
      };

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await letterService.getPendingApprovals();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/letters/pending-approvals', {
        params: { page: 0, size: 20 },
      });
      expect(result).toEqual(mockData);
    });

    it('should fetch pending approvals with custom pagination', async () => {
      const mockData: GeneratedLettersResponse = {
        content: [],
        totalElements: 0,
        totalPages: 0,
      };

      mockedApiClient.get.mockResolvedValue({ data: mockData });

      await letterService.getPendingApprovals(1, 10);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/letters/pending-approvals', {
        params: { page: 1, size: 10 },
      });
    });
  });

  describe('generateLetter', () => {
    it('should generate a letter from template', async () => {
      const generateData: GenerateLetterRequest = {
        templateId: 'tpl-1',
        employeeId: 'emp-1',
      };

      const mockResponse: GeneratedLetter = {
        id: 'letter-new-1',
        templateId: 'tpl-1',
        employeeId: 'emp-1',
        status: 'DRAFT',
      };

      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await letterService.generateLetter(generateData, 'user-123');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/letters/generate', generateData, {
        params: { generatedBy: 'user-123' },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('generateOfferLetter', () => {
    it('should generate an offer letter for a candidate', async () => {
      const generateData: GenerateOfferLetterRequest = {
        candidateId: 'candidate-1',
        positionId: 'pos-1',
      };

      const mockResponse: GeneratedLetter = {
        id: 'offer-letter-1',
        templateId: 'tpl-offer',
        employeeId: 'candidate-1',
        status: 'DRAFT',
      };

      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await letterService.generateOfferLetter(generateData, 'recruiter-1');

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/letters/generate-offer',
        generateData,
        {
          params: { generatedBy: 'recruiter-1' },
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('issueOfferLetterWithESign', () => {
    it('should issue an offer letter with e-signature', async () => {
      const letterId = 'offer-letter-1';
      const issuerId = 'issuer-1';

      const mockResponse: GeneratedLetter = {
        id: letterId,
        templateId: 'tpl-offer',
        employeeId: 'candidate-1',
        status: 'ISSUED',
      };

      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await letterService.issueOfferLetterWithESign(letterId, issuerId);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        `/letters/${letterId}/issue-with-esign`,
        null,
        {
          params: { issuerId },
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('generatePdf', () => {
    it('should generate PDF for a letter', async () => {
      const letterId = 'letter-123';

      const mockResponse = {
        letterId,
        pdfUrl: 'https://storage.example.com/pdf/letter-123.pdf',
      };

      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await letterService.generatePdf(letterId);

      expect(mockedApiClient.post).toHaveBeenCalledWith(`/letters/${letterId}/generate-pdf`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('submitForApproval', () => {
    it('should submit a letter for approval', async () => {
      const letterId = 'letter-123';

      const mockResponse: GeneratedLetter = {
        id: letterId,
        templateId: 'tpl-1',
        employeeId: 'emp-1',
        status: 'PENDING_APPROVAL',
      };

      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await letterService.submitForApproval(letterId);

      expect(mockedApiClient.post).toHaveBeenCalledWith(`/letters/${letterId}/submit`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('approveLetter', () => {
    it('should approve a letter without comments', async () => {
      const letterId = 'letter-123';
      const approverId = 'approver-1';

      const mockResponse: GeneratedLetter = {
        id: letterId,
        templateId: 'tpl-1',
        employeeId: 'emp-1',
        status: 'APPROVED',
      };

      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await letterService.approveLetter(letterId, approverId);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        `/letters/${letterId}/approve`,
        null,
        {
          params: { approverId, comments: undefined },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should approve a letter with comments', async () => {
      const letterId = 'letter-123';
      const approverId = 'approver-1';
      const comments = 'Looks good, approved.';

      const mockResponse: GeneratedLetter = {
        id: letterId,
        templateId: 'tpl-1',
        employeeId: 'emp-1',
        status: 'APPROVED',
      };

      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await letterService.approveLetter(letterId, approverId, comments);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        `/letters/${letterId}/approve`,
        null,
        {
          params: { approverId, comments },
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('issueLetter', () => {
    it('should issue an approved letter', async () => {
      const letterId = 'letter-123';
      const issuerId = 'issuer-1';

      const mockResponse: GeneratedLetter = {
        id: letterId,
        templateId: 'tpl-1',
        employeeId: 'emp-1',
        status: 'ISSUED',
      };

      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await letterService.issueLetter(letterId, issuerId);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        `/letters/${letterId}/issue`,
        null,
        {
          params: { issuerId },
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('revokeLetter', () => {
    it('should revoke an issued letter', async () => {
      const letterId = 'letter-123';

      const mockResponse: GeneratedLetter = {
        id: letterId,
        templateId: 'tpl-1',
        employeeId: 'emp-1',
        status: 'REVOKED',
      };

      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await letterService.revokeLetter(letterId);

      expect(mockedApiClient.post).toHaveBeenCalledWith(`/letters/${letterId}/revoke`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('markLetterDownloaded', () => {
    it('should mark a letter as downloaded', async () => {
      const letterId = 'letter-123';
      const employeeId = 'emp-1';

      mockedApiClient.post.mockResolvedValue({});

      await letterService.markLetterDownloaded(letterId, employeeId);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        `/letters/${letterId}/downloaded`,
        null,
        {
          params: { employeeId },
        }
      );
    });
  });
});
