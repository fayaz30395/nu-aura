'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  Announcement,
  announcementService,
  CreateAnnouncementRequest
} from '@/lib/services/platform/announcement.service';

// Query keys for cache management
export const announcementKeys = {
  all: ['announcements'] as const,
  lists: () => [...announcementKeys.all, 'list'] as const,
  list: (page: number, size: number) =>
    [...announcementKeys.lists(), {page, size}] as const,
  active: (employeeId: string, page: number, size: number) =>
    [...announcementKeys.all, 'active', {employeeId, page, size}] as const,
  pinned: () => [...announcementKeys.all, 'pinned'] as const,
  details: () => [...announcementKeys.all, 'detail'] as const,
  detail: (id: string) => [...announcementKeys.details(), id] as const,
};

// Get all announcements (paginated)
export function useAllAnnouncements(page: number = 0, size: number = 10) {
  return useQuery({
    queryKey: announcementKeys.list(page, size),
    queryFn: () => announcementService.getAllAnnouncements(page, size),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get active announcements for an employee
export function useActiveAnnouncements(employeeId: string, page: number = 0, size: number = 10) {
  return useQuery({
    queryKey: announcementKeys.active(employeeId, page, size),
    queryFn: () => announcementService.getActiveAnnouncements(employeeId, page, size),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
  });
}

// Get pinned announcements
export function usePinnedAnnouncements() {
  return useQuery({
    queryKey: announcementKeys.pinned(),
    queryFn: () => announcementService.getPinnedAnnouncements(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get single announcement
export function useAnnouncement(id: string, employeeId?: string) {
  return useQuery({
    queryKey: announcementKeys.detail(id),
    queryFn: () => announcementService.getAnnouncement(id, employeeId),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Create announcement mutation
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAnnouncementRequest) => announcementService.createAnnouncement(data),
    onSuccess: () => {
      // Invalidate all announcement lists
      queryClient.invalidateQueries({queryKey: announcementKeys.lists()});
      queryClient.invalidateQueries({queryKey: announcementKeys.pinned()});
    },
  });
}

// Update announcement mutation
export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({id, data}: { id: string; data: CreateAnnouncementRequest }) =>
      announcementService.updateAnnouncement(id, data),
    onMutate: async ({id, data}) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({queryKey: announcementKeys.detail(id)});

      // Snapshot the previous value
      const previousAnnouncement = queryClient.getQueryData<Announcement>(announcementKeys.detail(id));

      // Optimistically update the cache
      if (previousAnnouncement) {
        queryClient.setQueryData(announcementKeys.detail(id), {
          ...previousAnnouncement,
          ...data,
        });
      }

      return {previousAnnouncement};
    },
    onError: (_err, {id}, context) => {
      // Rollback on error
      if (context?.previousAnnouncement) {
        queryClient.setQueryData(announcementKeys.detail(id), context.previousAnnouncement);
      }
    },
    onSettled: (_, _error, {id}) => {
      // Always refetch after mutation settles
      queryClient.invalidateQueries({queryKey: announcementKeys.detail(id)});
      queryClient.invalidateQueries({queryKey: announcementKeys.lists()});
      queryClient.invalidateQueries({queryKey: announcementKeys.pinned()});
    },
  });
}

// Delete announcement mutation
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => announcementService.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: announcementKeys.lists()});
      queryClient.invalidateQueries({queryKey: announcementKeys.pinned()});
    },
  });
}

// Mark announcement as read mutation
export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({announcementId, employeeId}: { announcementId: string; employeeId: string }) =>
      announcementService.markAsRead(announcementId, employeeId),
    onSuccess: () => {
      // Invalidate all announcement queries to refresh read status
      queryClient.invalidateQueries({queryKey: announcementKeys.lists()});
      queryClient.invalidateQueries({queryKey: announcementKeys.pinned()});
    },
  });
}
