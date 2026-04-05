/**
 * Mobile API Service - Lightweight API client for mobile endpoints
 * Uses existing Axios instance from frontend/lib/api/client
 */

import {apiClient} from '../../api/client';
import {
  ApprovalActionResponse,
  LeaveBalanceResponse,
  MarkReadResponse,
  MobileBulkApprovalRequest,
  MobileCancelLeaveRequest,
  MobileDashboardResponse,
  MobileDeviceRegistrationRequest,
  MobileMarkReadRequest,
  MobileQuickLeaveRequest,
  PendingApprovalsResponse,
  RecentLeaveRequest,
  SyncResponse,
  UnreadNotificationsResponse,
} from '../../types/core/mobile-api';

const MOBILE_API_BASE = '/mobile';

/**
 * Mobile Dashboard Service
 */
export const mobileApiService = {
  // ==================== DASHBOARD ====================
  getDashboard: async (): Promise<MobileDashboardResponse> => {
    const response = await apiClient.get<MobileDashboardResponse>(
      `${MOBILE_API_BASE}/dashboard`
    );
    return response.data;
  },

  // ==================== LEAVE ====================
  quickApplyLeave: async (
    request: MobileQuickLeaveRequest
  ): Promise<RecentLeaveRequest> => {
    const response = await apiClient.post<RecentLeaveRequest>(
      `${MOBILE_API_BASE}/leave/quick-apply`,
      request
    );
    return response.data;
  },

  getLeaveBalance: async (): Promise<LeaveBalanceResponse> => {
    const response = await apiClient.get<LeaveBalanceResponse>(
      `${MOBILE_API_BASE}/leave/balance`
    );
    return response.data;
  },

  getRecentLeaveRequests: async (): Promise<RecentLeaveRequest[]> => {
    const response = await apiClient.get<RecentLeaveRequest[]>(
      `${MOBILE_API_BASE}/leave/recent`
    );
    return response.data;
  },

  cancelLeaveRequest: async (
    leaveRequestId: string,
    request: MobileCancelLeaveRequest
  ): Promise<void> => {
    await apiClient.delete(`${MOBILE_API_BASE}/leave/${leaveRequestId}/cancel`, {
      data: request,
    });
  },

  // ==================== APPROVALS ====================
  getPendingApprovals: async (): Promise<PendingApprovalsResponse> => {
    const response = await apiClient.get<PendingApprovalsResponse>(
      `${MOBILE_API_BASE}/approvals/pending`
    );
    return response.data;
  },

  approveRequest: async (
    approvalId: string,
    notes?: string
  ): Promise<ApprovalActionResponse> => {
    const response = await apiClient.post<ApprovalActionResponse>(
      `${MOBILE_API_BASE}/approvals/${approvalId}/approve`,
      {notes}
    );
    return response.data;
  },

  rejectRequest: async (
    approvalId: string,
    rejectionReason: string,
    notes?: string
  ): Promise<ApprovalActionResponse> => {
    const response = await apiClient.post<ApprovalActionResponse>(
      `${MOBILE_API_BASE}/approvals/${approvalId}/reject`,
      {rejectionReason, notes}
    );
    return response.data;
  },

  bulkActionApprovals: async (
    request: MobileBulkApprovalRequest
  ): Promise<ApprovalActionResponse> => {
    const response = await apiClient.post<ApprovalActionResponse>(
      `${MOBILE_API_BASE}/approvals/bulk-action`,
      request
    );
    return response.data;
  },

  // ==================== NOTIFICATIONS ====================
  registerDevice: async (
    request: MobileDeviceRegistrationRequest
  ): Promise<void> => {
    await apiClient.post(`${MOBILE_API_BASE}/notifications/register-device`, request);
  },

  getUnreadNotifications: async (): Promise<UnreadNotificationsResponse> => {
    const response = await apiClient.get<UnreadNotificationsResponse>(
      `${MOBILE_API_BASE}/notifications/unread`
    );
    return response.data;
  },

  markNotificationsAsRead: async (
    request: MobileMarkReadRequest
  ): Promise<MarkReadResponse> => {
    const response = await apiClient.post<MarkReadResponse>(
      `${MOBILE_API_BASE}/notifications/mark-read`,
      request
    );
    return response.data;
  },

  // ==================== SYNC ====================
  deltaSync: async (lastSyncAt: string, limit?: number): Promise<SyncResponse> => {
    const response = await apiClient.get<SyncResponse>(`${MOBILE_API_BASE}/sync`, {
      params: {
        lastSyncAt,
        limit: limit || 100,
      },
    });
    return response.data;
  },
};

export default mobileApiService;
