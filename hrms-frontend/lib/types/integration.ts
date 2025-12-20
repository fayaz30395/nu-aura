export interface IntegrationStatus {
  integrationType: string;
  provider: string;
  configured: boolean;
  enabled: boolean;
  lastChecked: string;
  message?: string;
  supportedMethods?: string[];
}

export interface IntegrationTestResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

export interface SmsTestRequest {
  phoneNumber: string;
}

export interface SmsSendRequest {
  phoneNumber: string;
  message?: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export interface SmsSendResponse {
  messageId: string;
  success: boolean;
  phoneNumber: string;
  errorMessage?: string;
  timestamp: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  customerId?: string;
  paymentMethod?: string;
  paymentMethodId?: string;
  captureImmediately?: boolean;
  statementDescriptor?: string;
  metadata?: Record<string, string>;
  receiptEmail?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentResponse {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  customerId?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt?: string;
  clientSecret?: string;
  receiptUrl?: string;
  errorMessage?: string;
  errorCode?: string;
  metadata?: Record<string, string>;
  captured: boolean;
  amountCaptured?: number;
  amountRefunded?: number;
  refundId?: string;
}
