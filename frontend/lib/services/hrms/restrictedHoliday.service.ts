import {apiClient} from '../../api/client';
import {
  EmployeeSummary,
  Page,
  PolicyRequest,
  RestrictedHoliday,
  RestrictedHolidayPolicy,
  RestrictedHolidayRequest,
  RestrictedHolidaySelection,
  SelectionActionRequest,
  SelectionStatus,
} from '../../types/hrms/restricted-holiday';

class RestrictedHolidayService {
  private readonly basePath = '/restricted-holidays';

  // ─── Holiday CRUD ─────────────────────────────────────────────

  async listHolidays(
    page: number = 0,
    size: number = 20,
    year?: number
  ): Promise<Page<RestrictedHoliday>> {
    const response = await apiClient.get<Page<RestrictedHoliday>>(this.basePath, {
      params: {page, size, ...(year ? {year} : {})},
    });
    return response.data;
  }

  async getAvailableHolidays(year: number): Promise<RestrictedHoliday[]> {
    const response = await apiClient.get<RestrictedHoliday[]>(
      `${this.basePath}/available`,
      {params: {year}}
    );
    return response.data;
  }

  async getHolidayById(id: string): Promise<RestrictedHoliday> {
    const response = await apiClient.get<RestrictedHoliday>(
      `${this.basePath}/${id}`
    );
    return response.data;
  }

  async createHoliday(data: RestrictedHolidayRequest): Promise<RestrictedHoliday> {
    const response = await apiClient.post<RestrictedHoliday>(this.basePath, data);
    return response.data;
  }

  async updateHoliday(
    id: string,
    data: RestrictedHolidayRequest
  ): Promise<RestrictedHoliday> {
    const response = await apiClient.put<RestrictedHoliday>(
      `${this.basePath}/${id}`,
      data
    );
    return response.data;
  }

  async deleteHoliday(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }

  // ─── Selections ───────────────────────────────────────────────

  async selectHoliday(holidayId: string): Promise<RestrictedHolidaySelection> {
    const response = await apiClient.post<RestrictedHolidaySelection>(
      `${this.basePath}/${holidayId}/select`
    );
    return response.data;
  }

  async getMySelections(year: number): Promise<RestrictedHolidaySelection[]> {
    const response = await apiClient.get<RestrictedHolidaySelection[]>(
      `${this.basePath}/selections/me`,
      {params: {year}}
    );
    return response.data;
  }

  async getMySummary(year: number): Promise<EmployeeSummary> {
    const response = await apiClient.get<EmployeeSummary>(
      `${this.basePath}/summary/me`,
      {params: {year}}
    );
    return response.data;
  }

  async cancelSelection(
    selectionId: string
  ): Promise<RestrictedHolidaySelection> {
    const response = await apiClient.post<RestrictedHolidaySelection>(
      `${this.basePath}/selections/${selectionId}/cancel`
    );
    return response.data;
  }

  async getSelectionsByStatus(
    status: SelectionStatus,
    page: number = 0,
    size: number = 20
  ): Promise<Page<RestrictedHolidaySelection>> {
    const response = await apiClient.get<Page<RestrictedHolidaySelection>>(
      `${this.basePath}/selections`,
      {params: {status, page, size}}
    );
    return response.data;
  }

  async getSelectionsByHoliday(
    holidayId: string,
    page: number = 0,
    size: number = 20
  ): Promise<Page<RestrictedHolidaySelection>> {
    const response = await apiClient.get<Page<RestrictedHolidaySelection>>(
      `${this.basePath}/${holidayId}/selections`,
      {params: {page, size}}
    );
    return response.data;
  }

  async approveSelection(
    selectionId: string
  ): Promise<RestrictedHolidaySelection> {
    const response = await apiClient.post<RestrictedHolidaySelection>(
      `${this.basePath}/selections/${selectionId}/approve`
    );
    return response.data;
  }

  async rejectSelection(
    selectionId: string,
    data?: SelectionActionRequest
  ): Promise<RestrictedHolidaySelection> {
    const response = await apiClient.post<RestrictedHolidaySelection>(
      `${this.basePath}/selections/${selectionId}/reject`,
      data
    );
    return response.data;
  }

  // ─── Policy ───────────────────────────────────────────────────

  async getPolicy(year: number): Promise<RestrictedHolidayPolicy> {
    const response = await apiClient.get<RestrictedHolidayPolicy>(
      `${this.basePath}/policy`,
      {params: {year}}
    );
    return response.data;
  }

  async savePolicy(data: PolicyRequest): Promise<RestrictedHolidayPolicy> {
    const response = await apiClient.put<RestrictedHolidayPolicy>(
      `${this.basePath}/policy`,
      data
    );
    return response.data;
  }
}

export const restrictedHolidayService = new RestrictedHolidayService();
