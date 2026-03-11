'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/lib/services/admin.service';
import { AdminStats, AdminUserSummary, Page, HealthResponse } from '@/lib/types/admin';

export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  userList: (page: number, size: number, search: string) =>
    [...adminKeys.users(), { page, size, search }] as const,
  health: () => [...adminKeys.all, 'health'] as const,
};

export function useAdminStats() {
  return useQuery<AdminStats, Error, AdminStats>({
    queryKey: adminKeys.stats(),
    queryFn: () => adminService.getStats(),
    staleTime: 60 * 1000,
  });
}

export function useAdminUsers(page: number, size: number, search: string) {
  return useQuery<Page<AdminUserSummary>, Error, Page<AdminUserSummary>>({
    queryKey: adminKeys.userList(page, size, search),
    queryFn: () => adminService.getUsers(page, size, search || undefined),
    staleTime: 30 * 1000,
  });
}

export function useSystemHealth() {
  return useQuery<HealthResponse, Error, HealthResponse>({
    queryKey: adminKeys.health(),
    queryFn: () => adminService.getSystemHealth(),
    refetchInterval: 60 * 1000,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { userId: string; role: string }>({
    mutationFn: ({ userId, role }) => adminService.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

