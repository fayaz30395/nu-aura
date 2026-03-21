'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { selfServiceService } from '@/lib/services/selfservice.service';
import {
  SelfServiceDashboard,
  DocumentRequestResponse,
  DocumentRequestDto,
  ProfileUpdateResponse,
  ProfileUpdateRequestDto,
  DocumentType,
  ProfileUpdateCategory,
} from '@/lib/types/selfservice';
import { Page } from '@/lib/types/employee';

// Query key factory for self-service queries
export const selfServiceKeys = {
  all: ['selfService'] as const,
  dashboard: (employeeId: string) =>
    [...selfServiceKeys.all, 'dashboard', employeeId] as const,

  // Document requests
  documentRequests: () => [...selfServiceKeys.all, 'documentRequests'] as const,
  documentRequestById: (requestId: string) =>
    [...selfServiceKeys.documentRequests(), requestId] as const,
  myDocumentRequests: (employeeId: string, page: number, size: number) =>
    [...selfServiceKeys.documentRequests(), 'my', { employeeId, page, size }] as const,
  pendingDocumentRequests: (page: number, size: number) =>
    [...selfServiceKeys.documentRequests(), 'pending', { page, size }] as const,
  urgentDocumentRequests: () =>
    [...selfServiceKeys.documentRequests(), 'urgent'] as const,

  // Profile updates
  profileUpdates: () => [...selfServiceKeys.all, 'profileUpdates'] as const,
  profileUpdateById: (requestId: string) =>
    [...selfServiceKeys.profileUpdates(), requestId] as const,
  myProfileUpdates: (employeeId: string, page: number, size: number) =>
    [...selfServiceKeys.profileUpdates(), 'my', { employeeId, page, size }] as const,
  pendingProfileUpdates: (page: number, size: number) =>
    [...selfServiceKeys.profileUpdates(), 'pending', { page, size }] as const,
  allProfileUpdates: (page: number, size: number) =>
    [...selfServiceKeys.profileUpdates(), 'all', { page, size }] as const,

  // Reference data
  documentTypes: () => [...selfServiceKeys.all, 'documentTypes'] as const,
  updateCategories: () => [...selfServiceKeys.all, 'updateCategories'] as const,
};

// ==================== Dashboard ====================

/**
 * Hook to fetch Self-Service Dashboard
 */
export function useSelfServiceDashboard(employeeId: string, enabled: boolean = true) {
  return useQuery<SelfServiceDashboard>({
    queryKey: selfServiceKeys.dashboard(employeeId),
    queryFn: async () => selfServiceService.getDashboard(employeeId),
    enabled: enabled && !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

// ==================== Document Requests ====================

/**
 * Hook to fetch a single document request
 */
export function useDocumentRequest(requestId: string, enabled: boolean = true) {
  return useQuery<DocumentRequestResponse>({
    queryKey: selfServiceKeys.documentRequestById(requestId),
    queryFn: async () => selfServiceService.getDocumentRequestById(requestId),
    enabled: enabled && !!requestId,
  });
}

/**
 * Hook to fetch user's document requests
 */
export function useMyDocumentRequests(
  employeeId: string,
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery<Page<DocumentRequestResponse>>({
    queryKey: selfServiceKeys.myDocumentRequests(employeeId, page, size),
    queryFn: async () =>
      selfServiceService.getMyDocumentRequests(employeeId, page, size),
    enabled: enabled && !!employeeId,
  });
}

/**
 * Hook to fetch pending document requests (for HR/approvers)
 */
export function usePendingDocumentRequests(page: number = 0, size: number = 20) {
  return useQuery<Page<DocumentRequestResponse>>({
    queryKey: selfServiceKeys.pendingDocumentRequests(page, size),
    queryFn: async () =>
      selfServiceService.getPendingDocumentRequests(page, size),
  });
}

/**
 * Hook to fetch urgent document requests
 */
export function useUrgentDocumentRequests() {
  return useQuery<DocumentRequestResponse[]>({
    queryKey: selfServiceKeys.urgentDocumentRequests(),
    queryFn: async () => selfServiceService.getUrgentDocumentRequests(),
  });
}

/**
 * Hook to create a document request
 */
export function useCreateDocumentRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    DocumentRequestResponse,
    unknown,
    { employeeId: string; data: DocumentRequestDto }
  >({
    mutationFn: async ({ employeeId, data }) =>
      selfServiceService.createDocumentRequest(employeeId, data),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: selfServiceKeys.myDocumentRequests(employeeId, 0, 20),
      });
      queryClient.invalidateQueries({
        queryKey: selfServiceKeys.documentRequests(),
      });
    },
  });
}

/**
 * Hook to start processing a document request
 */
export function useStartProcessingDocument() {
  const queryClient = useQueryClient();

  return useMutation<
    DocumentRequestResponse,
    unknown,
    { requestId: string; processedById: string }
  >({
    mutationFn: async ({ requestId, processedById }) =>
      selfServiceService.startProcessingDocument(requestId, processedById),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: selfServiceKeys.documentRequests() });
      queryClient.invalidateQueries({ queryKey: selfServiceKeys.pendingDocumentRequests(0, 20) });
    },
  });
}

/**
 * Hook to complete a document request
 */
export function useCompleteDocumentRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    DocumentRequestResponse,
    unknown,
    { requestId: string; documentUrl: string }
  >({
    mutationFn: async ({ requestId, documentUrl }) =>
      selfServiceService.completeDocumentRequest(requestId, documentUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: selfServiceKeys.documentRequests() });
      queryClient.invalidateQueries({ queryKey: selfServiceKeys.pendingDocumentRequests(0, 20) });
    },
  });
}

/**
 * Hook to mark document as delivered
 */
export function useMarkDocumentDelivered() {
  const queryClient = useQueryClient();

  return useMutation<DocumentRequestResponse, unknown, string>({
    mutationFn: async (requestId) =>
      selfServiceService.markDocumentDelivered(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: selfServiceKeys.documentRequests() });
    },
  });
}

/**
 * Hook to reject a document request
 */
export function useRejectDocumentRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    DocumentRequestResponse,
    unknown,
    { requestId: string; rejectedBy: string; reason: string }
  >({
    mutationFn: async ({ requestId, rejectedBy, reason }) =>
      selfServiceService.rejectDocumentRequest(requestId, rejectedBy, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: selfServiceKeys.documentRequests() });
      queryClient.invalidateQueries({ queryKey: selfServiceKeys.pendingDocumentRequests(0, 20) });
    },
  });
}

// ==================== Profile Update Requests ====================

/**
 * Hook to fetch a single profile update request
 */
export function useProfileUpdateRequest(requestId: string, enabled: boolean = true) {
  return useQuery<ProfileUpdateResponse>({
    queryKey: selfServiceKeys.profileUpdateById(requestId),
    queryFn: async () => selfServiceService.getProfileUpdateRequestById(requestId),
    enabled: enabled && !!requestId,
  });
}

/**
 * Hook to fetch user's profile update requests
 */
export function useMyProfileUpdateRequests(
  employeeId: string,
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery<Page<ProfileUpdateResponse>>({
    queryKey: selfServiceKeys.myProfileUpdates(employeeId, page, size),
    queryFn: async () =>
      selfServiceService.getMyProfileUpdateRequests(employeeId, page, size),
    enabled: enabled && !!employeeId,
  });
}

/**
 * Hook to fetch pending profile update requests
 */
export function usePendingProfileUpdateRequests(
  page: number = 0,
  size: number = 20
) {
  return useQuery<Page<ProfileUpdateResponse>>({
    queryKey: selfServiceKeys.pendingProfileUpdates(page, size),
    queryFn: async () =>
      selfServiceService.getPendingProfileUpdateRequests(page, size),
  });
}

/**
 * Hook to fetch all profile update requests
 */
export function useAllProfileUpdateRequests(
  page: number = 0,
  size: number = 20
) {
  return useQuery<Page<ProfileUpdateResponse>>({
    queryKey: selfServiceKeys.allProfileUpdates(page, size),
    queryFn: async () =>
      selfServiceService.getAllProfileUpdateRequests(page, size),
  });
}

/**
 * Hook to create a profile update request
 */
export function useCreateProfileUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    ProfileUpdateResponse,
    unknown,
    { employeeId: string; data: ProfileUpdateRequestDto }
  >({
    mutationFn: async ({ employeeId, data }) =>
      selfServiceService.createProfileUpdateRequest(employeeId, data),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: selfServiceKeys.myProfileUpdates(employeeId, 0, 20),
      });
      queryClient.invalidateQueries({
        queryKey: selfServiceKeys.profileUpdates(),
      });
    },
  });
}

/**
 * Hook to approve a profile update request
 */
export function useApproveProfileUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    ProfileUpdateResponse,
    unknown,
    { requestId: string; reviewerId: string; comments?: string }
  >({
    mutationFn: async ({ requestId, reviewerId, comments }) =>
      selfServiceService.approveProfileUpdateRequest(
        requestId,
        reviewerId,
        comments
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: selfServiceKeys.profileUpdates() });
      queryClient.invalidateQueries({
        queryKey: selfServiceKeys.pendingProfileUpdates(0, 20),
      });
    },
  });
}

/**
 * Hook to reject a profile update request
 */
export function useRejectProfileUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    ProfileUpdateResponse,
    unknown,
    { requestId: string; reviewerId: string; reason: string }
  >({
    mutationFn: async ({ requestId, reviewerId, reason }) =>
      selfServiceService.rejectProfileUpdateRequest(
        requestId,
        reviewerId,
        reason
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: selfServiceKeys.profileUpdates() });
      queryClient.invalidateQueries({
        queryKey: selfServiceKeys.pendingProfileUpdates(0, 20),
      });
    },
  });
}

/**
 * Hook to cancel a profile update request
 */
export function useCancelProfileUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    unknown,
    { requestId: string; employeeId: string }
  >({
    mutationFn: async ({ requestId, employeeId }) =>
      selfServiceService.cancelProfileUpdateRequest(requestId, employeeId),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: selfServiceKeys.myProfileUpdates(employeeId, 0, 20),
      });
      queryClient.invalidateQueries({
        queryKey: selfServiceKeys.profileUpdates(),
      });
    },
  });
}

// ==================== Reference Data ====================

/**
 * Hook to fetch document types
 */
export function useDocumentTypes() {
  return useQuery<DocumentType[]>({
    queryKey: selfServiceKeys.documentTypes(),
    queryFn: async () => selfServiceService.getDocumentTypes(),
  });
}

/**
 * Hook to fetch profile update categories
 */
export function useUpdateCategories() {
  return useQuery<ProfileUpdateCategory[]>({
    queryKey: selfServiceKeys.updateCategories(),
    queryFn: async () => selfServiceService.getUpdateCategories(),
  });
}
