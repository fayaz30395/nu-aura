'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  officeLocationService,
  OfficeLocationRequest,
} from '@/lib/services/hrms/office-location.service';

export const officeLocationKeys = {
  all: ['officeLocations'] as const,
  lists: () => [...officeLocationKeys.all, 'list'] as const,
  list: () => [...officeLocationKeys.lists()] as const,
  active: () => [...officeLocationKeys.all, 'active'] as const,
  detail: (id: string) => [...officeLocationKeys.all, 'detail', id] as const,
};

// Get all office locations
export function useOfficeLocations() {
  return useQuery({
    queryKey: officeLocationKeys.list(),
    queryFn: () => officeLocationService.getAllLocations(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get active office locations
export function useActiveOfficeLocations() {
  return useQuery({
    queryKey: officeLocationKeys.active(),
    queryFn: () => officeLocationService.getActiveLocations(),
    staleTime: 10 * 60 * 1000,
  });
}

// Get single office location
export function useOfficeLocation(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: officeLocationKeys.detail(id),
    queryFn: () => officeLocationService.getLocation(id),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  });
}

// ========== Mutations ==========

// Create office location
export function useCreateOfficeLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OfficeLocationRequest) => officeLocationService.createLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: officeLocationKeys.list() });
    },
  });
}

// Update office location
export function useUpdateOfficeLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: OfficeLocationRequest }) =>
      officeLocationService.updateLocation(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: officeLocationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: officeLocationKeys.list() });
    },
  });
}

// Delete office location
export function useDeleteOfficeLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => officeLocationService.deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: officeLocationKeys.list() });
    },
  });
}
