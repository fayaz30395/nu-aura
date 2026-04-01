'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  helpdeskService,
  TicketRequest,
  TicketCommentRequest,
  TicketStatus,
} from '@/lib/services/hrms/helpdesk.service';

export const helpdeskKeys = {
  all: ['helpdesk'] as const,
  tickets: () => [...helpdeskKeys.all, 'tickets'] as const,
  ticketsList: (page: number, size: number) =>
    [...helpdeskKeys.tickets(), { page, size }] as const,
  ticketDetail: (id: string) => [...helpdeskKeys.all, 'ticket', id] as const,
  ticketByNumber: (num: string) => [...helpdeskKeys.all, 'ticket-number', num] as const,
  ticketsByEmployee: (employeeId: string) =>
    [...helpdeskKeys.all, 'employee-tickets', employeeId] as const,
  ticketsByAssignee: (assigneeId: string) =>
    [...helpdeskKeys.all, 'assignee-tickets', assigneeId] as const,
  ticketsByStatus: (status: TicketStatus) =>
    [...helpdeskKeys.all, 'status-tickets', status] as const,
  ticketsByCategory: (categoryId: string) =>
    [...helpdeskKeys.all, 'category-tickets', categoryId] as const,
  comments: (ticketId: string) => [...helpdeskKeys.all, 'comments', ticketId] as const,
  categories: () => [...helpdeskKeys.all, 'categories'] as const,
  activeCategories: () => [...helpdeskKeys.all, 'categories-active'] as const,
};

// ========== Ticket Queries ==========

export function useTickets(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: helpdeskKeys.ticketsList(page, size),
    queryFn: () => helpdeskService.getAllTickets(page, size),
    staleTime: 60 * 1000,
  });
}

export function useTicketDetail(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: helpdeskKeys.ticketDetail(id),
    queryFn: () => helpdeskService.getTicketById(id),
    enabled: !!id && enabled,
    staleTime: 30 * 1000,
  });
}

export function useTicketByNumber(ticketNumber: string, enabled: boolean = true) {
  return useQuery({
    queryKey: helpdeskKeys.ticketByNumber(ticketNumber),
    queryFn: () => helpdeskService.getTicketByNumber(ticketNumber),
    enabled: !!ticketNumber && enabled,
    staleTime: 30 * 1000,
  });
}

export function useTicketsByEmployee(employeeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: helpdeskKeys.ticketsByEmployee(employeeId),
    queryFn: () => helpdeskService.getTicketsByEmployee(employeeId),
    enabled: !!employeeId && enabled,
    staleTime: 60 * 1000,
  });
}

export function useTicketsByAssignee(assigneeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: helpdeskKeys.ticketsByAssignee(assigneeId),
    queryFn: () => helpdeskService.getTicketsByAssignee(assigneeId),
    enabled: !!assigneeId && enabled,
    staleTime: 60 * 1000,
  });
}

export function useTicketsByStatus(status: TicketStatus, enabled: boolean = true) {
  return useQuery({
    queryKey: helpdeskKeys.ticketsByStatus(status),
    queryFn: () => helpdeskService.getTicketsByStatus(status),
    enabled: !!status && enabled,
    staleTime: 60 * 1000,
  });
}

// ========== Comment Queries ==========

export function useTicketComments(ticketId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: helpdeskKeys.comments(ticketId),
    queryFn: () => helpdeskService.getCommentsByTicket(ticketId),
    enabled: !!ticketId && enabled,
    staleTime: 30 * 1000,
  });
}

// ========== Category Queries ==========

export function useTicketCategories() {
  return useQuery({
    queryKey: helpdeskKeys.categories(),
    queryFn: () => helpdeskService.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useActiveCategories() {
  return useQuery({
    queryKey: helpdeskKeys.activeCategories(),
    queryFn: () => helpdeskService.getActiveCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

// ========== Ticket Mutations ==========

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TicketRequest) => helpdeskService.createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.tickets() });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TicketRequest }) =>
      helpdeskService.updateTicket(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.ticketDetail(id) });
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.tickets() });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      helpdeskService.updateTicketStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.ticketDetail(id) });
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.tickets() });
    },
  });
}

export function useAssignTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string }) =>
      helpdeskService.assignTicket(id, assigneeId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.ticketDetail(id) });
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.tickets() });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => helpdeskService.deleteTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.tickets() });
    },
  });
}

// ========== Comment Mutations ==========

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TicketCommentRequest) => helpdeskService.addComment(data),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.comments(ticketId) });
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.ticketDetail(ticketId) });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, ticketId: _ticketId }: { commentId: string; ticketId: string }) =>
      helpdeskService.deleteComment(commentId),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.comments(ticketId) });
    },
  });
}
