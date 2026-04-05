'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {notifications} from '@mantine/notifications';
import {mfaApi} from '@/lib/api/mfa';

// Query keys for cache management
export const mfaKeys = {
  all: ['mfa'] as const,
  status: () => [...mfaKeys.all, 'status'] as const,
  setup: () => [...mfaKeys.all, 'setup'] as const,
};

// ========== Queries ==========

/**
 * Get current MFA status for the authenticated user.
 */
export function useMfaStatus(enabled: boolean = true) {
  return useQuery({
    queryKey: mfaKeys.status(),
    queryFn: () => mfaApi.getStatus(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get MFA setup data (QR code, secret, backup codes).
 * Pass enabled=true when user wants to set up MFA.
 */
export function useMfaSetup(enabled: boolean = false) {
  return useQuery({
    queryKey: mfaKeys.setup(),
    queryFn: () => mfaApi.getSetup(),
    enabled,
    staleTime: 0, // Always fresh
  });
}

// ========== Mutations ==========

/**
 * Verify and enable MFA with a 6-digit code.
 */
export function useEnableMfa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => mfaApi.verify(code),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: mfaKeys.all});
      notifications.show({
        title: 'MFA Enabled',
        message: 'Two-factor authentication is now active',
        color: 'green',
      });
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to enable MFA';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    },
  });
}

/**
 * Disable MFA with a verification code.
 */
export function useDisableMfa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => mfaApi.disable(code),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: mfaKeys.all});
      notifications.show({
        title: 'MFA Disabled',
        message: 'Two-factor authentication has been disabled',
        color: 'green',
      });
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to disable MFA';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    },
  });
}

/**
 * Complete MFA login during authentication.
 */
export function useMfaLogin() {
  return useMutation({
    mutationFn: (params: { userId: string; code: string }) =>
      mfaApi.mfaLogin(params.userId, params.code),
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'MFA verification failed';
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    },
  });
}
