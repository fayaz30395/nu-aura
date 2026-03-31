import { apiClient } from '../../api/client';

export interface SamlConfigResponse {
  id: string;
  tenantId: string;
  name: string;
  entityId: string;
  ssoUrl: string;
  sloUrl: string | null;
  hasCertificate: boolean;
  certificateFingerprint: string | null;
  metadataUrl: string | null;
  isActive: boolean;
  autoProvisionUsers: boolean;
  defaultRoleId: string | null;
  defaultRoleName: string | null;
  attributeMapping: string | null;
  spEntityId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SamlConfigRequest {
  name: string;
  entityId: string;
  ssoUrl: string;
  sloUrl?: string;
  certificate?: string;
  metadataUrl?: string;
  isActive?: boolean;
  autoProvisionUsers?: boolean;
  defaultRoleId?: string;
  attributeMapping?: string;
  spEntityId?: string;
}

export interface SamlTestConnectionResponse {
  success: boolean;
  message: string;
  idpEntityId: string;
  ssoUrl: string;
  metadataReachable: boolean;
  certificateValid: boolean;
  certificateExpiry: string | null;
}

class SamlService {
  async getConfig(): Promise<SamlConfigResponse> {
    const response = await apiClient.get<SamlConfigResponse>('/auth/saml/config');
    return response.data;
  }

  async createConfig(config: SamlConfigRequest): Promise<SamlConfigResponse> {
    const response = await apiClient.post<SamlConfigResponse>('/auth/saml/config', config);
    return response.data;
  }

  async updateConfig(config: SamlConfigRequest): Promise<SamlConfigResponse> {
    const response = await apiClient.put<SamlConfigResponse>('/auth/saml/config', config);
    return response.data;
  }

  async deleteConfig(): Promise<void> {
    await apiClient.delete('/auth/saml/config');
  }

  async testConnection(): Promise<SamlTestConnectionResponse> {
    const response = await apiClient.post<SamlTestConnectionResponse>('/auth/saml/test');
    return response.data;
  }

  async getMetadata(): Promise<string> {
    const response = await apiClient.get<string>('/auth/saml/metadata', {
      responseType: 'text' as never,
      headers: { Accept: 'application/xml' },
    });
    return response.data;
  }

  async getAllProviders(): Promise<SamlConfigResponse[]> {
    const response = await apiClient.get<SamlConfigResponse[]>('/auth/saml/providers');
    return response.data;
  }

  /**
   * Get the SAML SSO initiation URL for a tenant.
   * Redirecting the browser to this URL starts the SAML flow.
   */
  getSsoInitiationUrl(tenantId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8080';
    return `${baseUrl}/saml2/authenticate/${tenantId}`;
  }
}

export const samlService = new SamlService();
