'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { integrationService } from '@/lib/services/core/integration.service';
import {
  SmsTestRequest,
  SmsSendRequest,
  PaymentRequest,
} from '@/lib/types/core/integration';

export const integrationKeys = {
  all: ['integrations'] as const,
  smsStatus: () => [...integrationKeys.all, 'sms-status'] as const,
  paymentStatus: () => [...integrationKeys.all, 'payment-status'] as const,
  smsTemplates: () => [...integrationKeys.all, 'sms-templates'] as const,
  allStatus: () => [...integrationKeys.all, 'status'] as const,
};

// Get SMS integration status
export function useSmsStatus() {
  return useQuery({
    queryKey: integrationKeys.smsStatus(),
    queryFn: () => integrationService.getSmsStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get payment integration status
export function useIntegrationPaymentStatus() {
  return useQuery({
    queryKey: integrationKeys.paymentStatus(),
    queryFn: () => integrationService.getPaymentStatus(),
    staleTime: 5 * 60 * 1000,
  });
}

// Get SMS templates
export function useSmsTemplates() {
  return useQuery({
    queryKey: integrationKeys.smsTemplates(),
    queryFn: () => integrationService.getSmsTemplates(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get all integrations status
export function useAllIntegrationsStatus() {
  return useQuery({
    queryKey: integrationKeys.allStatus(),
    queryFn: () => integrationService.getAllIntegrationsStatus(),
    staleTime: 5 * 60 * 1000,
  });
}

// ========== Mutations ==========

// Test SMS integration
export function useTestSms() {
  return useMutation({
    mutationFn: (request: SmsTestRequest) => integrationService.testSms(request),
  });
}

// Send SMS
export function useSendSms() {
  return useMutation({
    mutationFn: (request: SmsSendRequest) => integrationService.sendSms(request),
  });
}

// Test payment integration
export function useTestPayment() {
  return useMutation({
    mutationFn: () => integrationService.testPaymentGateway(),
  });
}

// Create payment
export function useCreatePayment() {
  return useMutation({
    mutationFn: (request: PaymentRequest) => integrationService.createPayment(request),
  });
}

// Get supported payment methods
export function useSupportedPaymentMethods() {
  return useQuery({
    queryKey: [...integrationKeys.all, 'payment-methods'],
    queryFn: () => integrationService.getSupportedPaymentMethods(),
    staleTime: 30 * 60 * 1000, // 30 minutes - unlikely to change
  });
}
