import {apiClient} from '../../api/client';
import {Page} from '../../types/hrms/employee';
import {
  DocumentRequestDto,
  DocumentRequestResponse,
  DocumentType,
  ProfileUpdateCategory,
  ProfileUpdateRequestDto,
  ProfileUpdateResponse,
  SelfServiceDashboard,
} from '../../types/hrms/selfservice';

class SelfServiceService {
  // ==================== Dashboard ====================

  async getDashboard(employeeId: string): Promise<SelfServiceDashboard> {
    const response = await apiClient.get<SelfServiceDashboard>('/self-service/dashboard', {
      params: {employeeId},
    });
    return response.data;
  }

  // ==================== Document Requests ====================

  async createDocumentRequest(
    employeeId: string,
    data: DocumentRequestDto
  ): Promise<DocumentRequestResponse> {
    const response = await apiClient.post<DocumentRequestResponse>(
      '/self-service/document-requests',
      data,
      {params: {employeeId}}
    );
    return response.data;
  }

  async getDocumentRequestById(requestId: string): Promise<DocumentRequestResponse> {
    const response = await apiClient.get<DocumentRequestResponse>(
      `/self-service/document-requests/${requestId}`
    );
    return response.data;
  }

  async getMyDocumentRequests(
    employeeId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<DocumentRequestResponse>> {
    const response = await apiClient.get<Page<DocumentRequestResponse>>(
      '/self-service/document-requests/my-requests',
      {params: {employeeId, page, size}}
    );
    return response.data;
  }

  async getPendingDocumentRequests(
    page: number = 0,
    size: number = 20
  ): Promise<Page<DocumentRequestResponse>> {
    const response = await apiClient.get<Page<DocumentRequestResponse>>(
      '/self-service/document-requests/pending',
      {params: {page, size}}
    );
    return response.data;
  }

  async getUrgentDocumentRequests(): Promise<DocumentRequestResponse[]> {
    const response = await apiClient.get<DocumentRequestResponse[]>(
      '/self-service/document-requests/urgent'
    );
    return response.data;
  }

  async startProcessingDocument(
    requestId: string,
    processedById: string
  ): Promise<DocumentRequestResponse> {
    const response = await apiClient.post<DocumentRequestResponse>(
      `/self-service/document-requests/${requestId}/start-processing`,
      null,
      {params: {processedById}}
    );
    return response.data;
  }

  async completeDocumentRequest(
    requestId: string,
    documentUrl: string
  ): Promise<DocumentRequestResponse> {
    const response = await apiClient.post<DocumentRequestResponse>(
      `/self-service/document-requests/${requestId}/complete`,
      null,
      {params: {documentUrl}}
    );
    return response.data;
  }

  async markDocumentDelivered(requestId: string): Promise<DocumentRequestResponse> {
    const response = await apiClient.post<DocumentRequestResponse>(
      `/self-service/document-requests/${requestId}/deliver`
    );
    return response.data;
  }

  async rejectDocumentRequest(
    requestId: string,
    rejectedBy: string,
    reason: string
  ): Promise<DocumentRequestResponse> {
    const response = await apiClient.post<DocumentRequestResponse>(
      `/self-service/document-requests/${requestId}/reject`,
      null,
      {params: {rejectedBy, reason}}
    );
    return response.data;
  }

  // ==================== Profile Update Requests ====================

  async createProfileUpdateRequest(
    employeeId: string,
    data: ProfileUpdateRequestDto
  ): Promise<ProfileUpdateResponse> {
    const response = await apiClient.post<ProfileUpdateResponse>(
      '/self-service/profile-updates',
      data,
      {params: {employeeId}}
    );
    return response.data;
  }

  async getProfileUpdateRequestById(requestId: string): Promise<ProfileUpdateResponse> {
    const response = await apiClient.get<ProfileUpdateResponse>(
      `/self-service/profile-updates/${requestId}`
    );
    return response.data;
  }

  async getMyProfileUpdateRequests(
    employeeId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<ProfileUpdateResponse>> {
    const response = await apiClient.get<Page<ProfileUpdateResponse>>(
      '/self-service/profile-updates/my-requests',
      {params: {employeeId, page, size}}
    );
    return response.data;
  }

  async getPendingProfileUpdateRequests(
    page: number = 0,
    size: number = 20
  ): Promise<Page<ProfileUpdateResponse>> {
    const response = await apiClient.get<Page<ProfileUpdateResponse>>(
      '/self-service/profile-updates/pending',
      {params: {page, size}}
    );
    return response.data;
  }

  async getAllProfileUpdateRequests(
    page: number = 0,
    size: number = 20
  ): Promise<Page<ProfileUpdateResponse>> {
    const response = await apiClient.get<Page<ProfileUpdateResponse>>(
      '/self-service/profile-updates',
      {params: {page, size}}
    );
    return response.data;
  }

  async approveProfileUpdateRequest(
    requestId: string,
    reviewerId: string,
    comments?: string
  ): Promise<ProfileUpdateResponse> {
    const response = await apiClient.post<ProfileUpdateResponse>(
      `/self-service/profile-updates/${requestId}/approve`,
      null,
      {params: {reviewerId, comments}}
    );
    return response.data;
  }

  async rejectProfileUpdateRequest(
    requestId: string,
    reviewerId: string,
    reason: string
  ): Promise<ProfileUpdateResponse> {
    const response = await apiClient.post<ProfileUpdateResponse>(
      `/self-service/profile-updates/${requestId}/reject`,
      null,
      {params: {reviewerId, reason}}
    );
    return response.data;
  }

  async cancelProfileUpdateRequest(
    requestId: string,
    employeeId: string
  ): Promise<void> {
    await apiClient.post(`/self-service/profile-updates/${requestId}/cancel`, null, {
      params: {employeeId},
    });
  }

  // ==================== Reference Data ====================

  async getDocumentTypes(): Promise<DocumentType[]> {
    const response = await apiClient.get<DocumentType[]>('/self-service/document-types');
    return response.data;
  }

  async getUpdateCategories(): Promise<ProfileUpdateCategory[]> {
    const response = await apiClient.get<ProfileUpdateCategory[]>(
      '/self-service/update-categories'
    );
    return response.data;
  }
}

export const selfServiceService = new SelfServiceService();
