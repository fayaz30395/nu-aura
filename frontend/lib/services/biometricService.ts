import { apiClient } from '../api/client';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BiometricDevice {
  id: string;
  tenantId: string;
  deviceName: string;
  deviceType: 'FINGERPRINT' | 'FACE' | 'IRIS' | 'CARD' | 'MULTI_MODAL';
  serialNumber: string;
  locationId: string | null;
  locationName: string | null;
  ipAddress: string | null;
  manufacturer: string | null;
  model: string | null;
  firmwareVersion: string | null;
  isActive: boolean;
  isOnline: boolean;
  lastSyncAt: string | null;
  lastHeartbeatAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  totalPunchesToday: number;
  failedPunchesToday: number;
  pendingPunches: number;
}

export interface BiometricDeviceRequest {
  deviceName: string;
  deviceType: 'FINGERPRINT' | 'FACE' | 'IRIS' | 'CARD' | 'MULTI_MODAL';
  serialNumber: string;
  locationId?: string;
  locationName?: string;
  ipAddress?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  notes?: string;
}

export interface BiometricPunchLog {
  id: string;
  deviceId: string;
  employeeId: string | null;
  employeeIdentifier: string;
  punchTime: string;
  punchType: 'IN' | 'OUT';
  processedStatus: 'PENDING' | 'PROCESSED' | 'FAILED' | 'DUPLICATE';
  errorMessage: string | null;
  attendanceRecordId: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface BiometricApiKey {
  id: string;
  keyName: string;
  keySuffix: string;
  deviceId: string | null;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  plaintextKey?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ─── Device Service ─────────────────────────────────────────────────────────

export const biometricDeviceService = {
  list: async (page = 0, size = 20): Promise<PageResponse<BiometricDevice>> => {
    const response = await apiClient.get<PageResponse<BiometricDevice>>(
      '/biometric/devices',
      { params: { page, size } }
    );
    return response.data;
  },

  getById: async (id: string): Promise<BiometricDevice> => {
    const response = await apiClient.get<BiometricDevice>(
      `/biometric/devices/${id}`
    );
    return response.data;
  },

  register: async (data: BiometricDeviceRequest): Promise<BiometricDevice> => {
    const response = await apiClient.post<BiometricDevice>(
      '/biometric/devices',
      data
    );
    return response.data;
  },

  update: async (id: string, data: BiometricDeviceRequest): Promise<BiometricDevice> => {
    const response = await apiClient.put<BiometricDevice>(
      `/biometric/devices/${id}`,
      data
    );
    return response.data;
  },

  deactivate: async (id: string): Promise<void> => {
    await apiClient.delete(`/biometric/devices/${id}`);
  },

  sync: async (id: string): Promise<void> => {
    await apiClient.post(`/biometric/devices/${id}/sync`);
  },

  getLogs: async (
    deviceId: string,
    page = 0,
    size = 20
  ): Promise<PageResponse<BiometricPunchLog>> => {
    const response = await apiClient.get<PageResponse<BiometricPunchLog>>(
      `/biometric/devices/${deviceId}/logs`,
      { params: { page, size } }
    );
    return response.data;
  },
};

// ─── Punch Service ──────────────────────────────────────────────────────────

export const biometricPunchService = {
  getPending: async (
    page = 0,
    size = 20
  ): Promise<PageResponse<BiometricPunchLog>> => {
    const response = await apiClient.get<PageResponse<BiometricPunchLog>>(
      '/biometric/punch/pending',
      { params: { page, size } }
    );
    return response.data;
  },

  reprocessFailed: async (): Promise<{ status: string; count: number }> => {
    const response = await apiClient.post<{ status: string; count: number }>(
      '/biometric/punch/reprocess'
    );
    return response.data;
  },
};

// ─── API Key Service ────────────────────────────────────────────────────────

export const biometricApiKeyService = {
  list: async (): Promise<BiometricApiKey[]> => {
    const response = await apiClient.get<BiometricApiKey[]>(
      '/biometric/api-keys'
    );
    return response.data;
  },

  generate: async (
    keyName: string,
    deviceId?: string
  ): Promise<BiometricApiKey> => {
    const params: Record<string, string> = { keyName };
    if (deviceId) {
      params.deviceId = deviceId;
    }
    const response = await apiClient.post<BiometricApiKey>(
      '/biometric/api-keys',
      null,
      { params }
    );
    return response.data;
  },

  revoke: async (id: string): Promise<void> => {
    await apiClient.delete(`/biometric/api-keys/${id}`);
  },
};
