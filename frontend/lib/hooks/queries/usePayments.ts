'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  PaymentTransaction,
  PaymentConfig,
  PaymentConfigRequest,
  PaymentBatch,
  PaymentStats,
  PaymentRefund
} from '@/lib/types/payment';

const PAYMENTS_API = '/api/v1/payments';
const PAYMENT_CONFIG_API = '/api/v1/payments/config';

// Queries
export const useListPayments = (page = 0, size = 20) => {
  return useQuery({
    queryKey: ['payments', page, size],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        content: PaymentTransaction[];
        totalElements: number;
        totalPages: number;
      }>(`${PAYMENTS_API}?page=${page}&size=${size}`);
      return data;
    }
  });
};

export const usePaymentDetails = (paymentId: string | null) => {
  return useQuery({
    queryKey: ['payments', paymentId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaymentTransaction>(
        `${PAYMENTS_API}/${paymentId}`
      );
      return data;
    },
    enabled: !!paymentId
  });
};

export const useCheckPaymentStatus = (paymentId: string | null) => {
  return useQuery({
    queryKey: ['payments', paymentId, 'status'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaymentTransaction>(
        `${PAYMENTS_API}/${paymentId}/status`
      );
      return data;
    },
    enabled: !!paymentId,
    refetchInterval: 5000 // Refetch every 5 seconds
  });
};

export const usePaymentConfig = () => {
  return useQuery({
    queryKey: ['payment-config'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaymentConfig>(
        PAYMENT_CONFIG_API
      );
      return data;
    }
  });
};

// Mutations
export const useInitiatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: Partial<PaymentTransaction>) => {
      const { data } = await apiClient.post<PaymentTransaction>(
        PAYMENTS_API,
        payment
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    }
  });
};

export const useProcessRefund = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      reason
    }: {
      paymentId: string;
      reason: string;
    }) => {
      const { data } = await apiClient.post<string>(
        `${PAYMENTS_API}/${paymentId}/refund`,
        null,
        { params: { reason } }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['payments', variables.paymentId]
      });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    }
  });
};

export const useSavePaymentConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: PaymentConfigRequest) => {
      const { data } = await apiClient.post<PaymentConfig>(
        PAYMENT_CONFIG_API,
        config
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-config'] });
    }
  });
};

export const useTestPaymentConnection = () => {
  return useMutation({
    mutationFn: async (config: PaymentConfigRequest) => {
      const { data } = await apiClient.post<string>(
        `${PAYMENT_CONFIG_API}/test-connection`,
        config
      );
      return data;
    }
  });
};
