'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { contractService } from '@/lib/services/contract.service';
import type {
  CreateContractRequest,
  UpdateContractRequest,
  ContractStatus,
  ContractType,
  SendForSigningRequest,
  CreateContractTemplateRequest,
} from '@/lib/types/contract';

export const contractKeys = {
  all: ['contracts'] as const,
  lists: () => [...contractKeys.all, 'list'] as const,
  list: (filters?: ContractListFilters) => [...contractKeys.lists(), filters ?? {}] as const,
  details: () => [...contractKeys.all, 'detail'] as const,
  detail: (id: string) => [...contractKeys.details(), id] as const,
  search: (search: string) => [...contractKeys.all, 'search', search] as const,
  byStatus: (status: ContractStatus) => [...contractKeys.all, 'status', status] as const,
  byType: (type: ContractType) => [...contractKeys.all, 'type', type] as const,
  expiring: () => [...contractKeys.all, 'expiring'] as const,
  expired: () => [...contractKeys.all, 'expired'] as const,
  active: () => [...contractKeys.all, 'active'] as const,
  signatures: (contractId: string) => [...contractKeys.all, 'signatures', contractId] as const,
  versions: (contractId: string) => [...contractKeys.all, 'versions', contractId] as const,
  templates: () => ['contract-templates'] as const,
  templateList: (filters?: TemplateListFilters) => [...contractKeys.templates(), 'list', filters ?? {}] as const,
  templateDetail: (id: string) => [...contractKeys.templates(), 'detail', id] as const,
  templateSearch: (search: string) => [...contractKeys.templates(), 'search', search] as const,
};

export interface ContractListFilters {
  page?: number;
  size?: number;
}

export interface TemplateListFilters {
  page?: number;
  size?: number;
}

// ===================== Contract Queries =====================

export function useContracts(filters?: ContractListFilters) {
  return useQuery({
    queryKey: contractKeys.list(filters),
    queryFn: () => contractService.getContracts(filters?.page ?? 0, filters?.size ?? 20),
    placeholderData: keepPreviousData,
  });
}

export function useContract(contractId: string) {
  return useQuery({
    queryKey: contractKeys.detail(contractId),
    queryFn: () => contractService.getContractById(contractId),
  });
}

export function useSearchContracts(search: string, filters?: ContractListFilters) {
  return useQuery({
    queryKey: contractKeys.search(search),
    queryFn: () => contractService.searchContracts(search, filters?.page ?? 0, filters?.size ?? 20),
    enabled: !!search,
    placeholderData: keepPreviousData,
  });
}

export function useContractsByStatus(status: ContractStatus, filters?: ContractListFilters) {
  return useQuery({
    queryKey: contractKeys.byStatus(status),
    queryFn: () => contractService.getContractsByStatus(status, filters?.page ?? 0, filters?.size ?? 20),
    placeholderData: keepPreviousData,
  });
}

export function useContractsByType(type: ContractType, filters?: ContractListFilters) {
  return useQuery({
    queryKey: contractKeys.byType(type),
    queryFn: () => contractService.getContractsByType(type, filters?.page ?? 0, filters?.size ?? 20),
    placeholderData: keepPreviousData,
  });
}

export function useEmployeeContracts(employeeId: string, filters?: ContractListFilters) {
  return useQuery({
    queryKey: [...contractKeys.all, 'employee', employeeId],
    queryFn: () => contractService.getEmployeeContracts(employeeId, filters?.page ?? 0, filters?.size ?? 20),
    enabled: !!employeeId,
    placeholderData: keepPreviousData,
  });
}

export function useExpiringContracts(days: number = 30) {
  return useQuery({
    queryKey: contractKeys.expiring(),
    queryFn: () => contractService.getExpiringContracts(days),
  });
}

export function useExpiredContracts() {
  return useQuery({
    queryKey: contractKeys.expired(),
    queryFn: () => contractService.getExpiredContracts(),
  });
}

export function useActiveContracts() {
  return useQuery({
    queryKey: contractKeys.active(),
    queryFn: () => contractService.getActiveContracts(),
  });
}

export function useVersionHistory(contractId: string) {
  return useQuery({
    queryKey: contractKeys.versions(contractId),
    queryFn: () => contractService.getVersionHistory(contractId),
  });
}

// ===================== Contract Mutations =====================

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContractRequest) => contractService.createContract(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
      queryClient.setQueryData(contractKeys.detail(data.id), data);
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContractRequest }) =>
      contractService.updateContract(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
      queryClient.setQueryData(contractKeys.detail(data.id), data);
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contractService.deleteContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

export function useMarkAsPendingReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contractId: string) => contractService.markAsPendingReview(contractId),
    onSuccess: (data) => {
      queryClient.setQueryData(contractKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

export function useMarkAsActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contractId: string) => contractService.markAsActive(contractId),
    onSuccess: (data) => {
      queryClient.setQueryData(contractKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

export function useTerminateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contractId: string) => contractService.terminateContract(contractId),
    onSuccess: (data) => {
      queryClient.setQueryData(contractKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

export function useRenewContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contractId: string) => contractService.renewContract(contractId),
    onSuccess: (data) => {
      queryClient.setQueryData(contractKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

// ===================== Signature Queries =====================

export function useSignatures(contractId: string) {
  return useQuery({
    queryKey: contractKeys.signatures(contractId),
    queryFn: () => contractService.getSignatures(contractId),
  });
}

export function useSignatureSummary(contractId: string) {
  return useQuery({
    queryKey: [...contractKeys.signatures(contractId), 'summary'],
    queryFn: () => contractService.getSignatureSummary(contractId),
  });
}

export function usePendingSignatures(contractId: string) {
  return useQuery({
    queryKey: [...contractKeys.signatures(contractId), 'pending'],
    queryFn: () => contractService.getPendingSignatures(contractId),
  });
}

// ===================== Signature Mutations =====================

export function useSendForSigning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contractId, data }: { contractId: string; data: SendForSigningRequest }) =>
      contractService.sendForSigning(contractId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.signatures(data.contractId) });
    },
  });
}

export function useRecordSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contractId,
      signerEmail,
      signatureImageUrl,
      ipAddress,
    }: {
      contractId: string;
      signerEmail: string;
      signatureImageUrl: string;
      ipAddress?: string;
    }) => contractService.recordSignature(contractId, signerEmail, signatureImageUrl, ipAddress),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.signatures(data.contractId) });
    },
  });
}

export function useDeclineSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contractId, signerEmail }: { contractId: string; signerEmail: string }) =>
      contractService.declineSignature(contractId, signerEmail),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.signatures(data.contractId) });
    },
  });
}

// ===================== Template Queries =====================

export function useTemplates(filters?: TemplateListFilters) {
  return useQuery({
    queryKey: contractKeys.templateList(filters),
    queryFn: () => contractService.getTemplates(filters?.page ?? 0, filters?.size ?? 20),
    placeholderData: keepPreviousData,
  });
}

export function useTemplate(templateId: string) {
  return useQuery({
    queryKey: contractKeys.templateDetail(templateId),
    queryFn: () => contractService.getTemplateById(templateId),
  });
}

export function useActiveTemplates(filters?: TemplateListFilters) {
  return useQuery({
    queryKey: [...contractKeys.templates(), 'active', filters ?? {}],
    queryFn: () => contractService.getActiveTemplates(filters?.page ?? 0, filters?.size ?? 20),
    placeholderData: keepPreviousData,
  });
}

export function useTemplatesByType(type: ContractType) {
  return useQuery({
    queryKey: [...contractKeys.templates(), 'type', type],
    queryFn: () => contractService.getTemplatesByType(type),
  });
}

export function useSearchTemplates(search: string, filters?: TemplateListFilters) {
  return useQuery({
    queryKey: contractKeys.templateSearch(search),
    queryFn: () => contractService.searchTemplates(search, filters?.page ?? 0, filters?.size ?? 20),
    enabled: !!search,
    placeholderData: keepPreviousData,
  });
}

// ===================== Template Mutations =====================

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContractTemplateRequest) => contractService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.templates() });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateContractTemplateRequest }) =>
      contractService.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.templates() });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contractService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.templates() });
    },
  });
}

export function useToggleTemplateActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contractService.toggleTemplateActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.templates() });
    },
  });
}
