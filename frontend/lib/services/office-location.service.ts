import { apiClient } from '../api/client';

export interface OfficeLocation {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  isActive: boolean;
  isDefault: boolean;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfficeLocationRequest {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  isDefault?: boolean;
  timezone?: string;
}

export interface GeofenceValidationRequest {
  latitude: number;
  longitude: number;
  officeLocationId?: string;
}

export interface GeofenceValidationResponse {
  isWithinGeofence: boolean;
  distanceMeters: number;
  nearestOfficeLocation?: OfficeLocation;
}

class OfficeLocationService {
  async createLocation(data: OfficeLocationRequest): Promise<OfficeLocation> {
    const response = await apiClient.post<OfficeLocation>('/office-locations', data);
    return response.data;
  }

  async updateLocation(id: string, data: OfficeLocationRequest): Promise<OfficeLocation> {
    const response = await apiClient.put<OfficeLocation>(`/office-locations/${id}`, data);
    return response.data;
  }

  async getLocation(id: string): Promise<OfficeLocation> {
    const response = await apiClient.get<OfficeLocation>(`/office-locations/${id}`);
    return response.data;
  }

  async getAllLocations(): Promise<OfficeLocation[]> {
    const response = await apiClient.get<OfficeLocation[]>('/office-locations');
    return response.data;
  }

  async getActiveLocations(): Promise<OfficeLocation[]> {
    const response = await apiClient.get<OfficeLocation[]>('/office-locations/active');
    return response.data;
  }

  async deleteLocation(id: string): Promise<void> {
    await apiClient.delete(`/office-locations/${id}`);
  }

  async validateGeofence(data: GeofenceValidationRequest): Promise<GeofenceValidationResponse> {
    const response = await apiClient.post<GeofenceValidationResponse>('/office-locations/validate-geofence', data);
    return response.data;
  }
}

export const officeLocationService = new OfficeLocationService();
