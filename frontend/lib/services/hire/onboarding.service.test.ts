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

import { onboardingService } from './onboarding.service';
import { apiClient } from '@/lib/api/client';

// Type definitions
interface OnboardingProcess {
  id: string;
  employeeId: string;
  status: string;
  completionPercentage: number;
}

interface OnboardingProcessRequest {
  employeeId: string;
  templateId?: string;
}

interface OnboardingChecklistTemplate {
  id: string;
  name: string;
  description?: string;
}

interface OnboardingTemplateTask {
  id: string;
  templateId: string;
  title: string;
}

interface OnboardingTask {
  id: string;
  processId: string;
  status: string;
}

type OnboardingStatus = 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const mockedApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('onboardingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // getAllProcesses tests
  describe('getAllProcesses', () => {
    it('should fetch all processes with default pagination', async () => {
      const mockData = {
        content: [
          { id: '1', employeeId: 'emp-1', status: 'IN_PROGRESS', completionPercentage: 50 },
          { id: '2', employeeId: 'emp-2', status: 'COMPLETED', completionPercentage: 100 },
        ],
        totalElements: 2,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockData });

      const result = await onboardingService.getAllProcesses();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/onboarding/processes', {
        params: { page: 0, size: 20 },
      });
      expect(result).toEqual(mockData);
    });

    it('should fetch all processes with custom pagination', async () => {
      const mockData = { content: [], totalElements: 0 };
      mockedApiClient.get.mockResolvedValue({ data: mockData });

      await onboardingService.getAllProcesses(2, 50);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/onboarding/processes', {
        params: { page: 2, size: 50 },
      });
    });
  });

  // getProcessById tests
  describe('getProcessById', () => {
    it('should fetch a process by ID', async () => {
      const mockProcess: OnboardingProcess = {
        id: 'proc-123',
        employeeId: 'emp-1',
        status: 'IN_PROGRESS',
        completionPercentage: 75,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockProcess });

      const result = await onboardingService.getProcessById('proc-123');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/onboarding/processes/proc-123');
      expect(result).toEqual(mockProcess);
    });

    it('should handle errors when fetching process by ID', async () => {
      mockedApiClient.get.mockRejectedValue(new Error('Not found'));

      await expect(onboardingService.getProcessById('invalid-id')).rejects.toThrow('Not found');
    });
  });

  // getProcessByEmployeeId tests
  describe('getProcessByEmployeeId', () => {
    it('should fetch process by employee ID', async () => {
      const mockProcess: OnboardingProcess = {
        id: 'proc-456',
        employeeId: 'emp-1',
        status: 'INITIATED',
        completionPercentage: 0,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockProcess });

      const result = await onboardingService.getProcessByEmployeeId('emp-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/onboarding/processes/employee/emp-1');
      expect(result).toEqual(mockProcess);
    });

    it('should return data when employee has onboarding process', async () => {
      const mockProcess: OnboardingProcess = {
        id: 'proc-789',
        employeeId: 'emp-2',
        status: 'COMPLETED',
        completionPercentage: 100,
      };
      mockedApiClient.get.mockResolvedValue({ data: mockProcess });

      const result = await onboardingService.getProcessByEmployeeId('emp-2');

      expect(result.employeeId).toBe('emp-2');
      expect(result.status).toBe('COMPLETED');
    });
  });

  // createProcess tests
  describe('createProcess', () => {
    it('should create a new onboarding process', async () => {
      const request: OnboardingProcessRequest = {
        employeeId: 'emp-1',
        templateId: 'template-1',
      };
      const mockResponse: OnboardingProcess = {
        id: 'new-proc',
        employeeId: 'emp-1',
        status: 'INITIATED',
        completionPercentage: 0,
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.createProcess(request);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/onboarding/processes', request);
      expect(result).toEqual(mockResponse);
    });

    it('should create process with only employee ID', async () => {
      const request: OnboardingProcessRequest = { employeeId: 'emp-2' };
      const mockResponse: OnboardingProcess = {
        id: 'proc-new',
        employeeId: 'emp-2',
        status: 'INITIATED',
        completionPercentage: 0,
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.createProcess(request);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/onboarding/processes', request);
      expect(result.employeeId).toBe('emp-2');
    });
  });

  // updateStatus tests
  describe('updateStatus', () => {
    it('should update process status to IN_PROGRESS', async () => {
      const mockResponse: OnboardingProcess = {
        id: 'proc-1',
        employeeId: 'emp-1',
        status: 'IN_PROGRESS',
        completionPercentage: 25,
      };
      mockedApiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.updateStatus('proc-1', 'IN_PROGRESS');

      expect(mockedApiClient.patch).toHaveBeenCalledWith(
        '/onboarding/processes/proc-1/status',
        null,
        { params: { status: 'IN_PROGRESS' } }
      );
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should update process status to COMPLETED', async () => {
      const mockResponse: OnboardingProcess = {
        id: 'proc-2',
        employeeId: 'emp-2',
        status: 'COMPLETED',
        completionPercentage: 100,
      };
      mockedApiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.updateStatus('proc-2', 'COMPLETED');

      expect(mockedApiClient.patch).toHaveBeenCalledWith(
        '/onboarding/processes/proc-2/status',
        null,
        { params: { status: 'COMPLETED' } }
      );
      expect(result.completionPercentage).toBe(100);
    });
  });

  // updateProgress tests
  describe('updateProgress', () => {
    it('should update process progress percentage', async () => {
      const mockResponse: OnboardingProcess = {
        id: 'proc-1',
        employeeId: 'emp-1',
        status: 'IN_PROGRESS',
        completionPercentage: 50,
      };
      mockedApiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.updateProgress('proc-1', 50);

      expect(mockedApiClient.patch).toHaveBeenCalledWith(
        '/onboarding/processes/proc-1/progress',
        null,
        { params: { completionPercentage: 50 } }
      );
      expect(result.completionPercentage).toBe(50);
    });

    it('should update progress to 100 percent', async () => {
      const mockResponse: OnboardingProcess = {
        id: 'proc-3',
        employeeId: 'emp-3',
        status: 'IN_PROGRESS',
        completionPercentage: 100,
      };
      mockedApiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.updateProgress('proc-3', 100);

      expect(result.completionPercentage).toBe(100);
    });
  });

  // getProcessesByStatus tests
  describe('getProcessesByStatus', () => {
    it('should fetch processes with INITIATED status', async () => {
      const mockProcesses: OnboardingProcess[] = [
        { id: '1', employeeId: 'emp-1', status: 'INITIATED', completionPercentage: 0 },
        { id: '2', employeeId: 'emp-2', status: 'INITIATED', completionPercentage: 0 },
      ];
      mockedApiClient.get.mockResolvedValue({ data: mockProcesses });

      const result = await onboardingService.getProcessesByStatus('INITIATED');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/onboarding/processes/status/INITIATED');
      expect(result).toHaveLength(2);
      expect(result.every((p) => p.status === 'INITIATED')).toBe(true);
    });

    it('should fetch processes with COMPLETED status', async () => {
      const mockProcesses: OnboardingProcess[] = [
        { id: '3', employeeId: 'emp-3', status: 'COMPLETED', completionPercentage: 100 },
      ];
      mockedApiClient.get.mockResolvedValue({ data: mockProcesses });

      const result = await onboardingService.getProcessesByStatus('COMPLETED');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/onboarding/processes/status/COMPLETED');
      expect(result[0].completionPercentage).toBe(100);
    });
  });

  // getAllTemplates tests
  describe('getAllTemplates', () => {
    it('should fetch all onboarding templates', async () => {
      const mockTemplates: OnboardingChecklistTemplate[] = [
        { id: 'tpl-1', name: 'Standard Onboarding' },
        { id: 'tpl-2', name: 'Executive Onboarding' },
      ];
      mockedApiClient.get.mockResolvedValue({ data: mockTemplates });

      const result = await onboardingService.getAllTemplates();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/onboarding/templates');
      expect(result).toHaveLength(2);
    });

    it('should handle empty templates list', async () => {
      mockedApiClient.get.mockResolvedValue({ data: [] });

      const result = await onboardingService.getAllTemplates();

      expect(result).toEqual([]);
    });
  });

  // getTemplateById tests
  describe('getTemplateById', () => {
    it('should fetch template by ID', async () => {
      const mockTemplate: OnboardingChecklistTemplate = {
        id: 'tpl-1',
        name: 'Standard Onboarding',
        description: 'Standard onboarding process',
      };
      mockedApiClient.get.mockResolvedValue({ data: mockTemplate });

      const result = await onboardingService.getTemplateById('tpl-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/onboarding/templates/tpl-1');
      expect(result.name).toBe('Standard Onboarding');
    });

    it('should return template with all properties', async () => {
      const mockTemplate: OnboardingChecklistTemplate = {
        id: 'tpl-2',
        name: 'Executive Onboarding',
        description: 'Executive level onboarding',
      };
      mockedApiClient.get.mockResolvedValue({ data: mockTemplate });

      const result = await onboardingService.getTemplateById('tpl-2');

      expect(result.id).toBe('tpl-2');
      expect(result.description).toBe('Executive level onboarding');
    });
  });

  // createTemplate tests
  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const request = { name: 'New Template', description: 'A new template' };
      const mockResponse: OnboardingChecklistTemplate = {
        id: 'tpl-new',
        name: 'New Template',
        description: 'A new template',
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.createTemplate(request);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/onboarding/templates', request);
      expect(result.id).toBe('tpl-new');
    });

    it('should create template with minimal data', async () => {
      const request = { name: 'Minimal Template' };
      const mockResponse: OnboardingChecklistTemplate = {
        id: 'tpl-minimal',
        name: 'Minimal Template',
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.createTemplate(request);

      expect(result.name).toBe('Minimal Template');
    });
  });

  // updateTemplate tests
  describe('updateTemplate', () => {
    it('should update template', async () => {
      const updateData = { name: 'Updated Template', description: 'Updated description' };
      const mockResponse: OnboardingChecklistTemplate = {
        id: 'tpl-1',
        name: 'Updated Template',
        description: 'Updated description',
      };
      mockedApiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.updateTemplate('tpl-1', updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/onboarding/templates/tpl-1', updateData);
      expect(result.name).toBe('Updated Template');
    });

    it('should update only name field', async () => {
      const updateData = { name: 'New Name' };
      const mockResponse: OnboardingChecklistTemplate = {
        id: 'tpl-1',
        name: 'New Name',
      };
      mockedApiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.updateTemplate('tpl-1', updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/onboarding/templates/tpl-1', updateData);
      expect(result.name).toBe('New Name');
    });
  });

  // deleteTemplate tests
  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      mockedApiClient.delete.mockResolvedValue({});

      await onboardingService.deleteTemplate('tpl-1');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/onboarding/templates/tpl-1');
    });

    it('should handle delete without throwing error', async () => {
      mockedApiClient.delete.mockResolvedValue({});

      await expect(onboardingService.deleteTemplate('tpl-2')).resolves.toBeUndefined();
    });
  });

  // addTemplateTask tests
  describe('addTemplateTask', () => {
    it('should add task to template', async () => {
      const taskData = { title: 'Equipment Setup' };
      const mockResponse: OnboardingTemplateTask = {
        id: 'task-1',
        templateId: 'tpl-1',
        title: 'Equipment Setup',
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.addTemplateTask('tpl-1', taskData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/onboarding/templates/tpl-1/tasks', taskData);
      expect(result.title).toBe('Equipment Setup');
    });

    it('should add multiple task types', async () => {
      const taskData = { title: 'IT Access' };
      const mockResponse: OnboardingTemplateTask = {
        id: 'task-2',
        templateId: 'tpl-1',
        title: 'IT Access',
      };
      mockedApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.addTemplateTask('tpl-1', taskData);

      expect(result.id).toBe('task-2');
    });
  });

  // getTemplateTasks tests
  describe('getTemplateTasks', () => {
    it('should fetch tasks for template', async () => {
      const mockTasks: OnboardingTemplateTask[] = [
        { id: 'task-1', templateId: 'tpl-1', title: 'Equipment Setup' },
        { id: 'task-2', templateId: 'tpl-1', title: 'IT Access' },
      ];
      mockedApiClient.get.mockResolvedValue({ data: mockTasks });

      const result = await onboardingService.getTemplateTasks('tpl-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/onboarding/templates/tpl-1/tasks');
      expect(result).toHaveLength(2);
    });

    it('should return empty list when no tasks', async () => {
      mockedApiClient.get.mockResolvedValue({ data: [] });

      const result = await onboardingService.getTemplateTasks('tpl-empty');

      expect(result).toEqual([]);
    });
  });

  // updateTemplateTask tests
  describe('updateTemplateTask', () => {
    it('should update template task', async () => {
      const updateData = { title: 'Equipment Setup - Updated' };
      const mockResponse: OnboardingTemplateTask = {
        id: 'task-1',
        templateId: 'tpl-1',
        title: 'Equipment Setup - Updated',
      };
      mockedApiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.updateTemplateTask('tpl-1', 'task-1', updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/onboarding/templates/tpl-1/tasks/task-1',
        updateData
      );
      expect(result.title).toBe('Equipment Setup - Updated');
    });

    it('should update task with partial data', async () => {
      const updateData = { title: 'New Title' };
      const mockResponse: OnboardingTemplateTask = {
        id: 'task-2',
        templateId: 'tpl-1',
        title: 'New Title',
      };
      mockedApiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.updateTemplateTask('tpl-1', 'task-2', updateData);

      expect(result.title).toBe('New Title');
    });
  });

  // deleteTemplateTask tests
  describe('deleteTemplateTask', () => {
    it('should delete template task', async () => {
      mockedApiClient.delete.mockResolvedValue({});

      await onboardingService.deleteTemplateTask('tpl-1', 'task-1');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/onboarding/templates/tpl-1/tasks/task-1');
    });

    it('should delete multiple tasks', async () => {
      mockedApiClient.delete.mockResolvedValue({});

      await expect(onboardingService.deleteTemplateTask('tpl-1', 'task-2')).resolves.toBeUndefined();
      expect(mockedApiClient.delete).toHaveBeenCalled();
    });
  });

  // getProcessTasks tests
  describe('getProcessTasks', () => {
    it('should fetch tasks for process', async () => {
      const mockTasks: OnboardingTask[] = [
        { id: 'ptask-1', processId: 'proc-1', status: 'PENDING' },
        { id: 'ptask-2', processId: 'proc-1', status: 'COMPLETED' },
      ];
      mockedApiClient.get.mockResolvedValue({ data: mockTasks });

      const result = await onboardingService.getProcessTasks('proc-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/onboarding/processes/proc-1/tasks');
      expect(result).toHaveLength(2);
    });

    it('should return tasks in correct order', async () => {
      const mockTasks: OnboardingTask[] = [
        { id: 'ptask-1', processId: 'proc-1', status: 'COMPLETED' },
        { id: 'ptask-2', processId: 'proc-1', status: 'PENDING' },
      ];
      mockedApiClient.get.mockResolvedValue({ data: mockTasks });

      const result = await onboardingService.getProcessTasks('proc-1');

      expect(result[0].status).toBe('COMPLETED');
      expect(result[1].status).toBe('PENDING');
    });
  });

  // updateTaskStatus tests
  describe('updateTaskStatus', () => {
    it('should update task status without remarks', async () => {
      const mockResponse: OnboardingTask = {
        id: 'ptask-1',
        processId: 'proc-1',
        status: 'COMPLETED',
      };
      mockedApiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.updateTaskStatus('ptask-1', 'COMPLETED');

      expect(mockedApiClient.patch).toHaveBeenCalledWith('/onboarding/tasks/ptask-1/status', null, {
        params: { status: 'COMPLETED', remarks: undefined },
      });
      expect(result.status).toBe('COMPLETED');
    });

    it('should update task status with remarks', async () => {
      const mockResponse: OnboardingTask = {
        id: 'ptask-1',
        processId: 'proc-1',
        status: 'COMPLETED',
      };
      mockedApiClient.patch.mockResolvedValue({ data: mockResponse });

      const result = await onboardingService.updateTaskStatus('ptask-1', 'COMPLETED', 'Task finished successfully');

      expect(mockedApiClient.patch).toHaveBeenCalledWith('/onboarding/tasks/ptask-1/status', null, {
        params: { status: 'COMPLETED', remarks: 'Task finished successfully' },
      });
      expect(result.status).toBe('COMPLETED');
    });
  });
});
