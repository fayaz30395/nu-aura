import { apiClient } from '../../api/client';
import {
  IntegrationStatus,
  IntegrationTestResponse,
  SmsTestRequest,
  SmsSendRequest,
  SmsSendResponse,
  PaymentRequest,
  PaymentResponse,
} from '../../types/core/integration';

class IntegrationService {
  // SMS Methods
  async getSmsStatus(): Promise<IntegrationStatus> {
    const response = await apiClient.get<IntegrationStatus>('/integrations/sms/status');
    return response.data;
  }

  async testSms(request: SmsTestRequest): Promise<IntegrationTestResponse> {
    const response = await apiClient.post<IntegrationTestResponse>('/integrations/sms/test', request);
    return response.data;
  }

  async sendSms(request: SmsSendRequest): Promise<SmsSendResponse> {
    const response = await apiClient.post<SmsSendResponse>('/integrations/sms/send', request);
    return response.data;
  }

  async getSmsTemplates(): Promise<Record<string, string>> {
    const response = await apiClient.get<Record<string, string>>('/integrations/sms/templates');
    return response.data;
  }

  // Payment Gateway Methods
  async getPaymentStatus(): Promise<IntegrationStatus> {
    const response = await apiClient.get<IntegrationStatus>('/integrations/payment/status');
    return response.data;
  }

  async testPaymentGateway(): Promise<IntegrationTestResponse> {
    const response = await apiClient.post<IntegrationTestResponse>('/integrations/payment/test');
    return response.data;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const response = await apiClient.post<PaymentResponse>('/integrations/payment/create', request);
    return response.data;
  }

  async getSupportedPaymentMethods(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/integrations/payment/supported-methods');
    return response.data;
  }

  // General Integration Methods
  async getAllIntegrationsStatus(): Promise<Record<string, IntegrationStatus>> {
    const response = await apiClient.get<Record<string, IntegrationStatus>>('/integrations/status');
    return response.data;
  }
}

export const integrationService = new IntegrationService();
