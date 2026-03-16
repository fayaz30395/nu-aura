/**
 * React Query Hooks for Mobile API
 * All data fetching for mobile endpoints uses React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import mobileApiService from '../../services/mobile-api.service';
import {
  MobileDashboardResponse,
  LeaveBalanceResponse,
  RecentLeaveRequest,
  MobileQuickLeaveRequest,
  MobileCancelLeaveRequest,
  PendingApprovalsResponse,
  MobileBulkApprovalRequest,
  UnreadNotificationsResponse,
  MobileDeviceRegistrationRequest,
  MobileMarkReadRequest,
  SyncResponse,
} from '../../types/mobile-api';

// Query keys for mobile API
export const mobileApiKeys = {
  dashboard: ['mobile', 'dashboard'] as const,
  leave: {
    balance: ['mobile', 'leave', 'balance'] as const,
    recent: ['mobile', 'leave', 'recent'] as const,
  },
  approvals: {
    pending: ['mobile', 'approvals', 'pending'] as const,
  },
  notifications: {
    unread: ['mobile', 'notifications', 'unread'] as const,
  },
  sync: ['mobile', 'sync'] as const,
};

// ==================== DASHBOARD ====================
export const useMobileDashboard = () => {
  return useQuery<MobileDashboardResponse>({
    queryKey: mobileApiKeys.dashboard,
    queryFn: () => mobileApiService.getDashboard(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

// ==================== LEAVE ====================
export const useMobileLeaveBalance = () => {
  return useQuery<LeaveBalanceResponse>({
    queryKey: mobileApiKeys.leave.balance,
    queryFn: () => mobileApiService.getLeaveBalance(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

export const useMobileRecentLeaveRequests = () => {
  return useQuery<RecentLeaveRequest[]>({
    queryKey: mobileApiKeys.leave.recent,
    queryFn: () => mobileApiService.getRecentLeaveRequests(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export const useMobileQuickApplyLeave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: MobileQuickLeaveRequest) =>
      mobileApiService.quickApplyLeave(request),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: mobileApiKeys.leave.balance,
      });
      queryClient.invalidateQueries({
        queryKey: mobileApiKeys.leave.recent,
      });
      queryClient.invalidateQueries({
        queryKey: mobileApiKeys.dashboard,
      });
    },
  });
};

export const UseMobileCancelLeaveRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leaveRequestId,
      request,
    }: {
      leaveRequestId: string;
      request: MobileCancelLeaveRequest;
    }) => mobileApiService.cancelLeaveRequest(leaveRequestId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileApiKeys.leave.recent,
      });
      queryClient.invalidateQueries({
        queryKey: mobileApiKeys.dashboard,
      });
    },
  });
};

// ==================== APPROVALS ====================
export const useMobilePendingApprovals = () => {
  return useQuery<PendingApprovalsResponse>({
    queryKey: mobileApiKeys.approvals.pending,
    queryFn: () => mobileApiService.getPendingApprovals(),
    staleTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
  });
};

export const useMobileApproveRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ approvalId, notes }: { approvalId: string; notes?: string }) =>
      mobileApiService.approveRequest(approvalId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileApiKeys.approvals.pending,
      });
      queryClient.invalidateQueries({
        queryKey: mobileApiKeys.dashboard,
      });
    },
  });
};

export const useMobileRejectRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      approvalId,
      rejectionReason,
      notes,
    }: {
      approvalId: string;
      rejectionReason: string;
      notes?: string;
    }) => mobileApiService.rejectRequest(approvalId, rejectionReason, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileApiKeys.approvals.pending,
      });
      queryClient.invalidateQueries({
        queryKey: mobileApiKeys.dashboard,
      });
    },
  });
};

export const useMobileBulkActionApprovals = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: MobileBulkApprovalRequest) =>
      mobileApiService.bulkActionApprovals(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileApiKeys.approvals.pending,
      });
      queryClient.invalidateQueries({
        queryKey: mobileApiKeys.dashboard,
      });
    },
  });
};

// ==================== NOTIFICATIONS ====================
export const useMobileRegisterDevice = () => {
  return useMutation({
    mutationFn: (request: MobileDeviceRegistrationRequest) =>
      mobileApiService.registerDevice(request),
  });
};

export const useMobileUnreadNotifications = () => {
  return useQuery<UnreadNotificationsResponse>({
    queryKey: mobileApiKeys.notifications.unread,
    queryFn: () => mobileApiService.getUnreadNotifications(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
};

export const useMobileMarkNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: MobileMarkReadRequest) =>
      mobileApiService.markNotificationsAsRead(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: mobileApiKeys.notifications.unread,
      });
    },
  });
};

// ==================== SYNC ====================
export const useMobileDeltaSync = (lastSyncAt: string, limit?: number) => {
  return useQuery<SyncResponse>({
    queryKey: [...mobileApiKeys.sync, lastSyncAt],
    queryFn: () => mobileApiService.deltaSync(lastSyncAt, limit),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 2,
  });
};
