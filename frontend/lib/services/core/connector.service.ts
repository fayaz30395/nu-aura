import {apiClient} from '../../api/client';
import {
  ConnectionTestResult,
  ConnectorConfig,
  ConnectorConfigRequest,
  ConnectorInfo,
  DocuSignEnvelope,
  DocuSignTemplateMapping,
  IntegrationEventLog,
  PageResponse,
  TemplateMappingRequest,
} from '../../types/core/connector';

const BASE_URL = '/integrations';

export const connectorService = {
  // Connector Info & List
  getConnectors: async (): Promise<ConnectorInfo[]> => {
    const response = await apiClient.get<ConnectorInfo[]>(`${BASE_URL}/connectors`);
    return response.data;
  },

  getConnectorDetails: async (connectorId: string): Promise<ConnectorInfo & { config?: ConnectorConfig }> => {
    const response = await apiClient.get<ConnectorInfo & { config?: ConnectorConfig }>(
      `${BASE_URL}/connectors/${connectorId}`
    );
    return response.data;
  },

  // Configuration Management
  saveConnectorConfig: async (
    connectorId: string,
    data: ConnectorConfigRequest
  ): Promise<ConnectorConfig> => {
    const response = await apiClient.put<ConnectorConfig>(
      `${BASE_URL}/connectors/${connectorId}/config`,
      data
    );
    return response.data;
  },

  // Connection Testing
  testConnection: async (connectorId: string): Promise<ConnectionTestResult> => {
    const response = await apiClient.post<ConnectionTestResult>(
      `${BASE_URL}/connectors/${connectorId}/test`
    );
    return response.data;
  },

  // Activation/Deactivation
  activateConnector: async (connectorId: string): Promise<void> => {
    await apiClient.post(`${BASE_URL}/connectors/${connectorId}/activate`);
  },

  deactivateConnector: async (connectorId: string): Promise<void> => {
    await apiClient.post(`${BASE_URL}/connectors/${connectorId}/deactivate`);
  },

  // Event Logs
  getIntegrationEvents: async (
    connectorId?: string,
    status?: string,
    page: number = 0,
    size: number = 20
  ): Promise<PageResponse<IntegrationEventLog>> => {
    const response = await apiClient.get<PageResponse<IntegrationEventLog>>(`${BASE_URL}/events`, {
      params: {
        ...(connectorId && {connectorId}),
        ...(status && {status}),
        page,
        size,
      },
    });
    return response.data;
  },

  // DocuSign Envelopes
  getDocuSignEnvelopes: async (
    page: number = 0,
    size: number = 20
  ): Promise<PageResponse<DocuSignEnvelope>> => {
    const response = await apiClient.get<PageResponse<DocuSignEnvelope>>(`${BASE_URL}/docusign/envelopes`, {
      params: {page, size},
    });
    return response.data;
  },

  // DocuSign Template Mappings
  getDocuSignTemplateMappings: async (): Promise<DocuSignTemplateMapping[]> => {
    const response = await apiClient.get<DocuSignTemplateMapping[]>(
      `${BASE_URL}/docusign/template-mappings`
    );
    return response.data;
  },

  saveTemplateMapping: async (data: TemplateMappingRequest): Promise<DocuSignTemplateMapping> => {
    const response = await apiClient.put<DocuSignTemplateMapping>(
      `${BASE_URL}/docusign/template-mappings`,
      data
    );
    return response.data;
  },
};
