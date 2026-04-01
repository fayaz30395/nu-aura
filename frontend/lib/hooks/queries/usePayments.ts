'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { paymentService } from '@/lib/services/core/payment.service';
import type {
  CreatePaymentTransactionRequest,
  UpdatePaymentTransactionRequest,
  SavePaymentConfigRequest,
  TestConnectionRequest,
  ProcessRefundRequest,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
} from '@/lib/types/core/payment';

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters?: PaymentListFilters) => [...paymentKeys.lists(), filters ?? {}] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
  byStatus: (status: PaymentStatus) => [...paymentKeys.all, 'status', status] as const,
  byType: (type: PaymentType) => [...paymentKeys.all, 'type', type] as const,
  byProvider: (provider: PaymentProvider) => [...paymentKeys.all, 'provider', provider] as const,
  status: (transactionId: string) => [...paymentKeys.all, 'status-check', transactionId] as const,
  stats: () => [...paymentKeys.all, 'stats'] as const,
  statsByType: (type: PaymentType) => [...paymentKeys.all, 'stats', type] as const,
  refunds: () => ['payment-refunds'] as const,
  refundList: (filters?: RefundListFilters) => [...paymentKeys.refunds(), 'list', filters ?? {}] as const,
  refundDetail: (id: string) => [...paymentKeys.refunds(), 'detail', id] as const,
  refundsByTransaction: (transactionId: string) => [...paymentKeys.refunds(), 'transaction', transactionId] as const,
  config: () => ['payment-config'] as const,
  configByProvider: (provider: PaymentProvider) => [...paymentKeys.config(), provider] as const,
  configAll: () => [...paymentKeys.config(), 'all'] as const,
};

export interface PaymentListFilters {
  page?: number;
  size?: number;
}

export interface RefundListFilters {
  page?: number;
  size?: number;
}

// ===================== Payment Transaction Queries =====================

export function usePayments(filters?: PaymentListFilters) {
  return useQuery({
    queryKey: paymentKeys.list(filters),
    queryFn: () => paymentService.getPayments(filters?.page ?? 0, filters?.size ?? 20),
    placeholderData: keepPreviousData,
  });
}

export function usePayment(paymentId: string) {
  return useQuery({
    queryKey: paymentKeys.detail(paymentId),
    queryFn: () => paymentService.getPayment(paymentId),
  });
}

export function usePaymentStatus(transactionId: string) {
  return useQuery({
    queryKey: paymentKeys.status(transactionId),
    queryFn: () => paymentService.checkStatus(transactionId),
  });
}

export function usePaymentsByStatus(status: PaymentStatus, filters?: PaymentListFilters) {
  return useQuery({
    queryKey: paymentKeys.byStatus(status),
    queryFn: () => paymentService.getPaymentsByStatus(status, filters?.page ?? 0, filters?.size ?? 20),
    placeholderData: keepPreviousData,
  });
}

export function usePaymentsByType(type: PaymentType, filters?: PaymentListFilters) {
  return useQuery({
    queryKey: paymentKeys.byType(type),
    queryFn: () => paymentService.getPaymentsByType(type, filters?.page ?? 0, filters?.size ?? 20),
    placeholderData: keepPreviousData,
  });
}

export function usePaymentsByProvider(provider: PaymentProvider, filters?: PaymentListFilters) {
  return useQuery({
    queryKey: paymentKeys.byProvider(provider),
    queryFn: () => paymentService.getPaymentsByProvider(provider, filters?.page ?? 0, filters?.size ?? 20),
    placeholderData: keepPreviousData,
  });
}

// ===================== Payment Transaction Mutations =====================

export function useInitiatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentTransactionRequest) => paymentService.initiatePayment(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      queryClient.setQueryData(paymentKeys.detail(data.id), data);
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentTransactionRequest }) =>
      paymentService.updatePayment(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
      queryClient.setQueryData(paymentKeys.detail(data.id), data);
    },
  });
}

// ===================== Refund Queries =====================

export function useRefunds(filters?: RefundListFilters) {
  return useQuery({
    queryKey: paymentKeys.refundList(filters),
    queryFn: () => paymentService.getRefunds(filters?.page ?? 0, filters?.size ?? 20),
    placeholderData: keepPreviousData,
  });
}

export function useRefund(refundId: string) {
  return useQuery({
    queryKey: paymentKeys.refundDetail(refundId),
    queryFn: () => paymentService.getRefund(refundId),
  });
}

export function useRefundsByTransaction(transactionId: string, filters?: RefundListFilters) {
  return useQuery({
    queryKey: paymentKeys.refundsByTransaction(transactionId),
    queryFn: () =>
      paymentService.getRefundsByTransaction(transactionId, filters?.page ?? 0, filters?.size ?? 20),
    enabled: !!transactionId,
    placeholderData: keepPreviousData,
  });
}

// ===================== Refund Mutations =====================

export function useProcessRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProcessRefundRequest) => paymentService.processRefund(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.refundList() });
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
    },
  });
}

// ===================== Payment Config Queries =====================

export function usePaymentConfig(provider: PaymentProvider) {
  return useQuery({
    queryKey: paymentKeys.configByProvider(provider),
    queryFn: () => paymentService.getConfig(provider),
    enabled: !!provider,
  });
}

export function useAllPaymentConfigs() {
  return useQuery({
    queryKey: paymentKeys.configAll(),
    queryFn: () => paymentService.getAllConfigs(),
  });
}

// ===================== Payment Config Mutations =====================

export function useSavePaymentConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SavePaymentConfigRequest) => paymentService.saveConfig(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.configAll() });
      queryClient.setQueryData(paymentKeys.configByProvider(data.provider), data);
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (data: TestConnectionRequest) => paymentService.testConnection(data),
  });
}

export function useToggleConfigActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ provider, isActive }: { provider: PaymentProvider; isActive: boolean }) =>
      paymentService.toggleConfigActive(provider, isActive),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.configAll() });
      queryClient.setQueryData(paymentKeys.configByProvider(data.provider), data);
    },
  });
}

// ===================== Statistics Queries =====================

export function usePaymentStats() {
  return useQuery({
    queryKey: paymentKeys.stats(),
    queryFn: () => paymentService.getStats(),
  });
}

export function usePaymentStatsByType(type: PaymentType) {
  return useQuery({
    queryKey: paymentKeys.statsByType(type),
    queryFn: () => paymentService.getStatsByType(type),
    enabled: !!type,
  });
}
