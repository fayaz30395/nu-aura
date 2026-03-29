'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import {
  biometricDeviceService,
  biometricPunchService,
  biometricApiKeyService,
} from '@/lib/services/biometricService';
import type { BiometricDeviceRequest } from '@/lib/services/biometricService';

// ─── Query Key Factory ───────────────────────────────────────────────────

export const biometricKeys = {
  all: ['biometric'] as const,
  devices: () => [...biometricKeys.all, 'devices'] as const,
  deviceList: (page: number, size: number) =>
    [...biometricKeys.devices(), 'list', page, size] as const,
  device: (id: string) => [...biometricKeys.devices(), id] as const,
  deviceLogs: (deviceId: string, page: number) =>
    [...biometricKeys.devices(), deviceId, 'logs', page] as const,
  punches: () => [...biometricKeys.all, 'punches'] as const,
  pendingPunches: (page: number) =>
    [...biometricKeys.punches(), 'pending', page] as const,
  apiKeys: () => [...biometricKeys.all, 'api-keys'] as const,
};

// ─── Device Hooks ───────────────────────────────────────────────────────

export function useBiometricDevices(page = 0, size = 20) {
  return useQuery({
    queryKey: biometricKeys.deviceList(page, size),
    queryFn: () => biometricDeviceService.list(page, size),
    staleTime: 30 * 1000,
    retry: 2,
    retryDelay: (attemptIndex: number) =>
      Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useBiometricDevice(id: string) {
  return useQuery({
    queryKey: biometricKeys.device(id),
    queryFn: () => biometricDeviceService.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    retry: 2,
  });
}

export function useRegisterDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BiometricDeviceRequest) =>
      biometricDeviceService.register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biometricKeys.devices() });
      notifications.show({
        title: 'Device Registered',
        message: 'Biometric device has been registered successfully.',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Registration Failed',
        message: error.message || 'Failed to register device. Please try again.',
        color: 'red',
      });
    },
  });
}

export function useUpdateDevice(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BiometricDeviceRequest) =>
      biometricDeviceService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biometricKeys.devices() });
      queryClient.invalidateQueries({ queryKey: biometricKeys.device(id) });
      notifications.show({
        title: 'Device Updated',
        message: 'Device configuration has been updated.',
        color: 'green',
      });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Update Failed',
        message: error.message || 'Failed to update device.',
        color: 'red',
      });
    },
  });
}

export function useDeactivateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => biometricDeviceService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biometricKeys.devices() });
      notifications.show({
        title: 'Device Deactivated',
        message: 'The biometric device has been deactivated.',
        color: 'yellow',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to deactivate device.',
        color: 'red',
      });
    },
  });
}

export function useSyncDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => biometricDeviceService.sync(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biometricKeys.devices() });
      notifications.show({
        title: 'Sync Initiated',
        message: 'Device sync has been triggered.',
        color: 'blue',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Sync Failed',
        message: 'Failed to sync device. The adapter may not support pull-based sync.',
        color: 'red',
      });
    },
  });
}

export function useDeviceLogs(deviceId: string, page = 0, size = 20) {
  return useQuery({
    queryKey: biometricKeys.deviceLogs(deviceId, page),
    queryFn: () => biometricDeviceService.getLogs(deviceId, page, size),
    enabled: !!deviceId,
    staleTime: 15 * 1000,
  });
}

// ─── Punch Hooks ────────────────────────────────────────────────────────

export function usePendingPunches(page = 0, size = 20) {
  return useQuery({
    queryKey: biometricKeys.pendingPunches(page),
    queryFn: () => biometricPunchService.getPending(page, size),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useReprocessPunches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => biometricPunchService.reprocessFailed(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: biometricKeys.punches() });
      notifications.show({
        title: 'Reprocessing Started',
        message: `${data.count} failed punches have been queued for reprocessing.`,
        color: 'blue',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to initiate reprocessing.',
        color: 'red',
      });
    },
  });
}

// ─── API Key Hooks ──────────────────────────────────────────────────────

export function useBiometricApiKeys() {
  return useQuery({
    queryKey: biometricKeys.apiKeys(),
    queryFn: () => biometricApiKeyService.list(),
    staleTime: 60 * 1000,
  });
}

export function useGenerateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ keyName, deviceId }: { keyName: string; deviceId?: string }) =>
      biometricApiKeyService.generate(keyName, deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biometricKeys.apiKeys() });
      notifications.show({
        title: 'API Key Generated',
        message: 'Copy the key now - it will not be shown again.',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to generate API key.',
        color: 'red',
      });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => biometricApiKeyService.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biometricKeys.apiKeys() });
      notifications.show({
        title: 'API Key Revoked',
        message: 'The API key has been revoked and can no longer be used.',
        color: 'yellow',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to revoke API key.',
        color: 'red',
      });
    },
  });
}
