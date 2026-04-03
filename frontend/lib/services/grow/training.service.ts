import { apiClient } from '../../api/client';
import type {
  TrainingProgram,
  TrainingProgramRequest,
  TrainingEnrollment,
  TrainingEnrollmentRequest,
  ProgramStatus,
  EnrollmentStatus,
} from '../../types/grow/training';

const BASE_URL = '/training';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const trainingService = {
  // Training Programs
  async createProgram(data: TrainingProgramRequest): Promise<TrainingProgram> {
    const response = await apiClient.post<TrainingProgram>(`${BASE_URL}/programs`, data);
    return response.data;
  },

  async updateProgram(programId: string, data: TrainingProgramRequest): Promise<TrainingProgram> {
    const response = await apiClient.put<TrainingProgram>(`${BASE_URL}/programs/${programId}`, data);
    return response.data;
  },

  async getProgramById(programId: string): Promise<TrainingProgram> {
    const response = await apiClient.get<TrainingProgram>(`${BASE_URL}/programs/${programId}`);
    return response.data;
  },

  async getAllPrograms(page = 0, size = 20): Promise<PagedResponse<TrainingProgram>> {
    const response = await apiClient.get<PagedResponse<TrainingProgram>>(
      `${BASE_URL}/programs`, { params: { page, size } }
    );
    return response.data;
  },

  async getProgramsByStatus(status: ProgramStatus): Promise<TrainingProgram[]> {
    const response = await apiClient.get<TrainingProgram[]>(`${BASE_URL}/programs/status/${status}`);
    return response.data;
  },

  async deleteProgram(programId: string): Promise<void> {
    await apiClient.delete(`${BASE_URL}/programs/${programId}`);
  },

  // Training Enrollments
  async enrollEmployee(data: TrainingEnrollmentRequest): Promise<TrainingEnrollment> {
    const response = await apiClient.post<TrainingEnrollment>(`${BASE_URL}/enrollments`, data);
    return response.data;
  },

  async updateEnrollmentStatus(
    enrollmentId: string,
    status: EnrollmentStatus
  ): Promise<TrainingEnrollment> {
    const response = await apiClient.patch<TrainingEnrollment>(
      `${BASE_URL}/enrollments/${enrollmentId}/status`, { params: { status } }
    );
    return response.data;
  },

  async getEnrollmentsByProgram(programId: string): Promise<TrainingEnrollment[]> {
    const response = await apiClient.get<TrainingEnrollment[]>(
      `${BASE_URL}/enrollments/program/${programId}`
    );
    return response.data;
  },

  async getEnrollmentsByEmployee(employeeId: string): Promise<TrainingEnrollment[]> {
    const response = await apiClient.get<TrainingEnrollment[]>(
      `${BASE_URL}/enrollments/employee/${employeeId}`
    );
    return response.data;
  },
};
