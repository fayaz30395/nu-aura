'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  DocumentApprovalWorkflow,
  DocumentAccess,
  DocumentExpiryTracking,
  DocumentAccessLevel,
  DocumentWithStatus
} from '@/lib/types/document-workflow';

const DOCUMENTS_API = '/documents';
const WORKFLOW_API = '/documents/workflow';

// Queries
export const useListApprovalWorkflows = (page = 0, size = 20) => {
  return useQuery({
    queryKey: ['approval-workflows', page, size],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        content: DocumentApprovalWorkflow[];
        totalElements: number;
        totalPages: number;
      }>(`${WORKFLOW_API}?page=${page}&size=${size}`);
      return data;
    }
  });
};

export const useListPendingApprovals = (page = 0, size = 20) => {
  return useQuery({
    queryKey: ['pending-approvals', page, size],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        content: DocumentApprovalWorkflow[];
        totalElements: number;
        totalPages: number;
      }>(`${WORKFLOW_API}/pending?page=${page}&size=${size}`);
      return data;
    }
  });
};

export const useWorkflowDetails = (workflowId: string | null) => {
  return useQuery({
    queryKey: ['approval-workflows', workflowId],
    queryFn: async () => {
      const { data } = await apiClient.get<DocumentApprovalWorkflow>(
        `${WORKFLOW_API}/${workflowId}`
      );
      return data;
    },
    enabled: !!workflowId
  });
};

export const useDocumentAccessList = (documentId: string) => {
  return useQuery({
    queryKey: ['document-access', documentId],
    queryFn: async () => {
      const { data } = await apiClient.get<DocumentAccess[]>(
        `${DOCUMENTS_API}/${documentId}/access`
      );
      return data;
    },
    enabled: !!documentId
  });
};

export const useDocumentExpiryInfo = (documentId: string | null) => {
  return useQuery({
    queryKey: ['document-expiry', documentId],
    queryFn: async () => {
      const { data } = await apiClient.get<DocumentExpiryTracking>(
        `${DOCUMENTS_API}/${documentId}/expiry`
      );
      return data;
    },
    enabled: !!documentId
  });
};

export const useExpiringDocuments = (page = 0, size = 20) => {
  return useQuery({
    queryKey: ['expiring-documents', page, size],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        content: DocumentWithStatus[];
        totalElements: number;
      }>(`${DOCUMENTS_API}/expiring?page=${page}&size=${size}`);
      return data;
    }
  });
};

// Mutations
export const useInitiateApprovalWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      totalApprovalLevels
    }: {
      documentId: string;
      totalApprovalLevels: number;
    }) => {
      const { data } = await apiClient.post<DocumentApprovalWorkflow>(
        `${WORKFLOW_API}/initiate`,
        { documentId, totalApprovalLevels }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
    }
  });
};

export const useApproveDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      comments
    }: {
      workflowId: string;
      comments?: string;
    }) => {
      const { data } = await apiClient.post<DocumentApprovalWorkflow>(
        `${WORKFLOW_API}/${workflowId}/approve`,
        { comments }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['approval-workflows', variables.workflowId]
      });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    }
  });
};

export const useRejectDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      rejectionReason
    }: {
      workflowId: string;
      rejectionReason: string;
    }) => {
      const { data } = await apiClient.post<DocumentApprovalWorkflow>(
        `${WORKFLOW_API}/${workflowId}/reject`,
        { rejectionReason }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['approval-workflows', variables.workflowId]
      });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    }
  });
};

export const useGrantDocumentAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      userId,
      roleId,
      departmentId,
      accessLevel
    }: {
      documentId: string;
      userId?: string;
      roleId?: string;
      departmentId?: string;
      accessLevel: DocumentAccessLevel;
    }) => {
      const { data } = await apiClient.post<DocumentAccess>(
        `${DOCUMENTS_API}/${documentId}/access`,
        { userId, roleId, departmentId, accessLevel }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['document-access', variables.documentId]
      });
    }
  });
};

export const useRevokeDocumentAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      accessId
    }: {
      documentId: string;
      accessId: string;
    }) => {
      await apiClient.delete(`${DOCUMENTS_API}/${documentId}/access/${accessId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['document-access', variables.documentId]
      });
    }
  });
};

export const useSetDocumentExpiry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      expiryDate,
      reminderDaysBefore
    }: {
      documentId: string;
      expiryDate: string;
      reminderDaysBefore?: number;
    }) => {
      const { data } = await apiClient.post<DocumentExpiryTracking>(
        `${DOCUMENTS_API}/${documentId}/expiry`,
        { expiryDate, reminderDaysBefore }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['document-expiry', variables.documentId]
      });
      queryClient.invalidateQueries({ queryKey: ['expiring-documents'] });
    }
  });
};
