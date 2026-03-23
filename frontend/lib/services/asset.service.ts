import { apiClient } from '../api/client';
import {
  Asset,
  CreateAssetRequest,
  UpdateAssetRequest,
  AssetsResponse,
  AssetStatus,
} from '../types/asset';

const BASE_URL = '/assets';

export const assetService = {
  // Get all assets with pagination
  getAllAssets: async (page = 0, size = 20): Promise<AssetsResponse> => {
    const response = await apiClient.get<AssetsResponse>(BASE_URL, {
      params: { page, size },
    });
    return response.data;
  },

  // Get single asset
  getAsset: async (id: string): Promise<Asset> => {
    const response = await apiClient.get<Asset>(`${BASE_URL}/${id}`);
    return response.data;
  },

  // Create asset
  createAsset: async (data: CreateAssetRequest): Promise<Asset> => {
    const response = await apiClient.post<Asset>(BASE_URL, data);
    return response.data;
  },

  // Update asset
  updateAsset: async (id: string, data: UpdateAssetRequest): Promise<Asset> => {
    const response = await apiClient.put<Asset>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  // Delete asset
  deleteAsset: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },

  // Assign asset to employee
  assignAsset: async (assetId: string, employeeId: string): Promise<Asset> => {
    const response = await apiClient.post<Asset>(`${BASE_URL}/${assetId}/assign`, null, {
      params: { employeeId },
    });
    return response.data;
  },

  // Return asset
  returnAsset: async (assetId: string): Promise<Asset> => {
    const response = await apiClient.post<Asset>(`${BASE_URL}/${assetId}/return`);
    return response.data;
  },

  // Get assets by employee
  getAssetsByEmployee: async (employeeId: string): Promise<Asset[]> => {
    const response = await apiClient.get<Asset[]>(`${BASE_URL}/employee/${employeeId}`);
    return response.data;
  },

  // Get assets by status
  getAssetsByStatus: async (status: AssetStatus): Promise<Asset[]> => {
    const response = await apiClient.get<Asset[]>(`${BASE_URL}/status/${status}`);
    return response.data;
  },
};
