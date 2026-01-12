export enum AssetCategory {
  LAPTOP = 'LAPTOP',
  DESKTOP = 'DESKTOP',
  MONITOR = 'MONITOR',
  PHONE = 'PHONE',
  TABLET = 'TABLET',
  FURNITURE = 'FURNITURE',
  VEHICLE = 'VEHICLE',
  SOFTWARE_LICENSE = 'SOFTWARE_LICENSE',
  OTHER = 'OTHER',
}

export enum AssetStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  RETIRED = 'RETIRED',
  LOST = 'LOST',
}

export interface Asset {
  id: string;
  tenantId: string;
  assetCode: string;
  assetName: string;
  category: AssetCategory;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currentValue?: number;
  status: AssetStatus;
  assignedTo?: string;
  assignedToName?: string;
  location?: string;
  warrantyExpiry?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetRequest {
  assetCode: string;
  assetName: string;
  category: AssetCategory;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currentValue?: number;
  status?: AssetStatus;
  assignedTo?: string;
  location?: string;
  warrantyExpiry?: string;
  notes?: string;
}

export interface UpdateAssetRequest {
  assetCode?: string;
  assetName?: string;
  category?: AssetCategory;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currentValue?: number;
  status?: AssetStatus;
  assignedTo?: string;
  location?: string;
  warrantyExpiry?: string;
  notes?: string;
}

export interface AssetsResponse {
  content: Asset[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
