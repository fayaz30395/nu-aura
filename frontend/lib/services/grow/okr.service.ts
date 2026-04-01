import { apiClient } from '../../api/client';

export interface Objective {
  id: string;
  tenantId: string;
  ownerId: string;
  ownerName?: string;
  title: string;
  description?: string;
  objectiveLevel: 'COMPANY' | 'DEPARTMENT' | 'TEAM' | 'INDIVIDUAL';
  status: 'DRAFT' | 'ACTIVE' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  progressPercentage: number;
  weight: number;
  isStretchGoal: boolean;
  keyResults?: KeyResult[];
  createdAt: string;
  updatedAt?: string;
}

export interface KeyResult {
  id: string;
  tenantId: string;
  objectiveId: string;
  ownerId: string;
  ownerName?: string;
  title: string;
  description?: string;
  measurementType: 'PERCENTAGE' | 'NUMBER' | 'CURRENCY' | 'BINARY' | 'MILESTONE';
  startValue: number;
  currentValue: number;
  targetValue: number;
  measurementUnit?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND' | 'COMPLETED';
  progressPercentage: number;
  weight: number;
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ObjectiveRequest {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  objectiveLevel?: string;
  weight?: number;
  isStretchGoal?: boolean;
  keyResults?: KeyResultRequest[];
}

export interface KeyResultRequest {
  title: string;
  description?: string;
  measurementType?: string;
  startValue?: number;
  targetValue: number;
  measurementUnit?: string;
  weight?: number;
  dueDate?: string;
}

export interface CheckInRequest {
  objectiveId?: string;
  keyResultId?: string;
  newValue?: number;
  newProgress?: number;
  confidenceLevel?: number;
  notes?: string;
  blockers?: string;
  nextSteps?: string;
}

export interface OkrSummary {
  totalObjectives: number;
  activeObjectives: number;
  completedObjectives: number;
  draftObjectives: number;
  averageProgress: number;
  totalKeyResults: number;
  completedKeyResults: number;
  companyProgress: number;
  companyObjectivesCount: number;
}

class OkrService {
  async createObjective(data: ObjectiveRequest): Promise<Objective> {
    const response = await apiClient.post<Objective>('/okr/objectives', data);
    return response.data;
  }

  async updateObjective(id: string, data: ObjectiveRequest): Promise<Objective> {
    const response = await apiClient.put<Objective>(`/okr/objectives/${id}`, data);
    return response.data;
  }

  async getObjective(id: string): Promise<Objective> {
    const response = await apiClient.get<Objective>(`/okr/objectives/${id}`);
    return response.data;
  }

  async getMyObjectives(): Promise<Objective[]> {
    const response = await apiClient.get<Objective[]>('/okr/objectives/my');
    return response.data;
  }

  async getCompanyObjectives(): Promise<Objective[]> {
    const response = await apiClient.get<Objective[]>('/okr/company/objectives');
    return response.data;
  }

  async approveObjective(id: string): Promise<Objective> {
    const response = await apiClient.post<Objective>(`/okr/objectives/${id}/approve`);
    return response.data;
  }

  async updateObjectiveStatus(id: string, status: string): Promise<Objective> {
    const response = await apiClient.put<Objective>(`/okr/objectives/${id}/status`, null, {
      params: { status }
    });
    return response.data;
  }

  async deleteObjective(id: string): Promise<void> {
    await apiClient.delete(`/okr/objectives/${id}`);
  }

  async addKeyResult(objectiveId: string, data: KeyResultRequest): Promise<KeyResult> {
    const response = await apiClient.post<KeyResult>(`/okr/objectives/${objectiveId}/key-results`, data);
    return response.data;
  }

  async updateKeyResultProgress(id: string, value: number): Promise<KeyResult> {
    const response = await apiClient.put<KeyResult>(`/okr/key-results/${id}/progress`, null, {
      params: { value }
    });
    return response.data;
  }

  async deleteKeyResult(id: string): Promise<void> {
    await apiClient.delete(`/okr/key-results/${id}`);
  }

  async createCheckIn(data: CheckInRequest): Promise<void> {
    await apiClient.post('/okr/check-ins', data);
  }

  async getDashboardSummary(): Promise<OkrSummary> {
    const response = await apiClient.get<OkrSummary>('/okr/dashboard/summary');
    return response.data;
  }
}

export const okrService = new OkrService();
