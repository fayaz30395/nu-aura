'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { letterService } from '@/lib/services/letter.service';
import {
  GenerateLetterRequest,
  GenerateOfferLetterRequest,
  LetterCategory,
} from '@/lib/types/letter';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const letterKeys = {
  all: ['letters'] as const,
  // Letters
  letters: () => [...letterKeys.all, 'letters'] as const,
  letterList: (page?: number, size?: number) =>
    [...letterKeys.letters(), { page, size }] as const,
  letterDetail: (id: string) => [...letterKeys.letters(), 'detail', id] as const,
  pendingApprovals: (page?: number, size?: number) =>
    [...letterKeys.letters(), 'pending-approvals', { page, size }] as const,
  // Templates
  templates: () => [...letterKeys.all, 'templates'] as const,
  templateList: (page?: number, size?: number) =>
    [...letterKeys.templates(), { page, size }] as const,
  activeTemplates: () => [...letterKeys.templates(), 'active'] as const,
  templateDetail: (id: string) => [...letterKeys.templates(), 'detail', id] as const,
  templatesByCategory: (category: LetterCategory) =>
    [...letterKeys.templates(), 'category', category] as const,
};

// ─── Letter Queries ────────────────────────────────────────────────────────

export function useAllLetters(page: number = 0, size: number = 20, enabled: boolean = true) {
  return useQuery({
    queryKey: letterKeys.letterList(page, size),
    queryFn: () => letterService.getAllLetters(page, size),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useLetterDetail(letterId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: letterKeys.letterDetail(letterId),
    queryFn: () => letterService.getLetter(letterId),
    enabled: enabled && !!letterId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useLetterPendingApprovals(page: number = 0, size: number = 20, enabled: boolean = true) {
  return useQuery({
    queryKey: letterKeys.pendingApprovals(page, size),
    queryFn: () => letterService.getPendingApprovals(page, size),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ─── Template Queries ──────────────────────────────────────────────────────

export function useLetterTemplates(page: number = 0, size: number = 20, enabled: boolean = true) {
  return useQuery({
    queryKey: letterKeys.templateList(page, size),
    queryFn: () => letterService.getAllTemplates(page, size),
    enabled,
    staleTime: 60 * 60 * 1000, // Templates don't change often
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useActiveLetterTemplates(enabled: boolean = true) {
  return useQuery({
    queryKey: letterKeys.activeTemplates(),
    queryFn: () => letterService.getActiveTemplates(),
    enabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useLetterTemplatesByCategory(category: LetterCategory, enabled: boolean = true) {
  return useQuery({
    queryKey: letterKeys.templatesByCategory(category),
    queryFn: () => letterService.getTemplatesByCategory(category),
    enabled: enabled && !!category,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useLetterTemplate(templateId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: letterKeys.templateDetail(templateId),
    queryFn: () => letterService.getTemplate(templateId),
    enabled: enabled && !!templateId,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

// ─── Letter Mutations ──────────────────────────────────────────────────────

export function useGenerateLetter() {
  const queryClient = useQueryClient();
  const _userId = ''; // Will be set via useAuth in the component

  return useMutation({
    mutationFn: ({ data, generatedBy }: { data: GenerateLetterRequest; generatedBy: string }) =>
      letterService.generateLetter(data, generatedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: letterKeys.letters() });
    },
  });
}

export function useGenerateOfferLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, generatedBy }: { data: GenerateOfferLetterRequest; generatedBy: string }) =>
      letterService.generateOfferLetter(data, generatedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: letterKeys.letters() });
    },
  });
}

export function useIssueLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ letterId, issuerId }: { letterId: string; issuerId: string }) =>
      letterService.issueLetter(letterId, issuerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: letterKeys.letters() });
      queryClient.invalidateQueries({ queryKey: letterKeys.pendingApprovals() });
    },
  });
}

export function useApproveLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      letterId,
      approverId,
      comments,
    }: {
      letterId: string;
      approverId: string;
      comments?: string;
    }) => letterService.approveLetter(letterId, approverId, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: letterKeys.pendingApprovals() });
      queryClient.invalidateQueries({ queryKey: letterKeys.letters() });
    },
  });
}

export function useRevokeLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (letterId: string) => letterService.revokeLetter(letterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: letterKeys.letters() });
    },
  });
}

export function useGeneratePdf() {
  return useMutation({
    mutationFn: (letterId: string) => letterService.generatePdf(letterId),
  });
}

