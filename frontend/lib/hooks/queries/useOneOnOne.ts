'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {meetingService} from '@/lib/services/hrms/meeting.service';
import {notifications} from '@mantine/notifications';
import type {
  MeetingActionItemRequest,
  MeetingActionItemStatusRequest,
  MeetingAgendaItemRequest,
  MeetingFeedbackRequest,
  MeetingNotesRequest,
  MeetingRescheduleRequest,
  OneOnOneMeetingRequest,
} from '@/lib/types/hrms/meeting';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const meetingKeys = {
  all: ['meetings'] as const,
  myMeetings: (page: number, size: number) => ['meetings', 'my', page, size] as const,
  upcoming: () => ['meetings', 'upcoming'] as const,
  asManager: (page: number, size: number) => ['meetings', 'as-manager', page, size] as const,
  detail: (id: string) => ['meetings', 'detail', id] as const,
  history: (employeeId: string) => ['meetings', 'history', employeeId] as const,
  agenda: (meetingId: string) => ['meetings', 'agenda', meetingId] as const,
  actions: (meetingId: string) => ['meetings', 'actions', meetingId] as const,
  pendingActions: () => ['meetings', 'actions', 'pending'] as const,
  overdueActions: () => ['meetings', 'actions', 'overdue'] as const,
  dashboard: () => ['meetings', 'dashboard'] as const,
  managerDashboard: () => ['meetings', 'dashboard', 'manager'] as const,
};

// ─── Meeting List Hooks ─────────────────────────────────────────────────────

export function useMyMeetings(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: meetingKeys.myMeetings(page, size),
    queryFn: () => meetingService.getMyMeetings(page, size),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useUpcomingMeetings() {
  return useQuery({
    queryKey: meetingKeys.upcoming(),
    queryFn: () => meetingService.getUpcomingMeetings(),
    staleTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useMeetingsAsManager(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: meetingKeys.asManager(page, size),
    queryFn: () => meetingService.getMeetingsAsManager(page, size),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useMeetingDetail(meetingId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: meetingKeys.detail(meetingId),
    queryFn: () => meetingService.getMeeting(meetingId),
    enabled: enabled && !!meetingId,
    staleTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useMeetingHistory(employeeId: string) {
  return useQuery({
    queryKey: meetingKeys.history(employeeId),
    queryFn: () => meetingService.getMeetingHistory(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// ─── Agenda Hooks ───────────────────────────────────────────────────────────

export function useAgendaItems(meetingId: string) {
  return useQuery({
    queryKey: meetingKeys.agenda(meetingId),
    queryFn: () => meetingService.getAgendaItems(meetingId),
    enabled: !!meetingId,
    staleTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// ─── Action Item Hooks ──────────────────────────────────────────────────────

export function useActionItems(meetingId: string) {
  return useQuery({
    queryKey: meetingKeys.actions(meetingId),
    queryFn: () => meetingService.getActionItems(meetingId),
    enabled: !!meetingId,
    staleTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function usePendingActionItems() {
  return useQuery({
    queryKey: meetingKeys.pendingActions(),
    queryFn: () => meetingService.getPendingActionItems(),
    staleTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useOverdueActionItems() {
  return useQuery({
    queryKey: meetingKeys.overdueActions(),
    queryFn: () => meetingService.getOverdueActionItems(),
    staleTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// ─── Dashboard Hooks ────────────────────────────────────────────────────────

export function useMeetingDashboard() {
  return useQuery({
    queryKey: meetingKeys.dashboard(),
    queryFn: () => meetingService.getMeetingDashboard(),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useManagerMeetingDashboard() {
  return useQuery({
    queryKey: meetingKeys.managerDashboard(),
    queryFn: () => meetingService.getManagerDashboard(),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// ─── Mutation Hooks ─────────────────────────────────────────────────────────

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OneOnOneMeetingRequest) => meetingService.createMeeting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: meetingKeys.all});
      notifications.show({
        title: 'Meeting Scheduled',
        message: '1-on-1 meeting has been scheduled successfully.',
        color: 'teal',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to schedule meeting. Please try again.',
        color: 'red',
      });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({meetingId, data}: { meetingId: string; data: OneOnOneMeetingRequest }) =>
      meetingService.updateMeeting(meetingId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({queryKey: meetingKeys.all});
      queryClient.invalidateQueries({queryKey: meetingKeys.detail(variables.meetingId)});
      notifications.show({
        title: 'Meeting Updated',
        message: 'Meeting details have been updated.',
        color: 'teal',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to update meeting.',
        color: 'red',
      });
    },
  });
}

export function useStartMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meetingId: string) => meetingService.startMeeting(meetingId),
    onSuccess: (_data, meetingId) => {
      queryClient.invalidateQueries({queryKey: meetingKeys.all});
      queryClient.invalidateQueries({queryKey: meetingKeys.detail(meetingId)});
    },
  });
}

export function useCompleteMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({meetingId, summary}: { meetingId: string; summary?: string }) =>
      meetingService.completeMeeting(meetingId, summary),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({queryKey: meetingKeys.all});
      queryClient.invalidateQueries({queryKey: meetingKeys.detail(variables.meetingId)});
      notifications.show({
        title: 'Meeting Completed',
        message: 'Meeting has been marked as complete.',
        color: 'teal',
      });
    },
  });
}

export function useCancelMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({meetingId, reason}: { meetingId: string; reason: string }) =>
      meetingService.cancelMeeting(meetingId, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({queryKey: meetingKeys.all});
      queryClient.invalidateQueries({queryKey: meetingKeys.detail(variables.meetingId)});
      notifications.show({
        title: 'Meeting Cancelled',
        message: 'Meeting has been cancelled.',
        color: 'orange',
      });
    },
  });
}

export function useRescheduleMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({meetingId, data}: { meetingId: string; data: MeetingRescheduleRequest }) =>
      meetingService.rescheduleMeeting(meetingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: meetingKeys.all});
      notifications.show({
        title: 'Meeting Rescheduled',
        message: 'Meeting has been rescheduled successfully.',
        color: 'teal',
      });
    },
  });
}

export function useUpdateMeetingNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({meetingId, data}: { meetingId: string; data: MeetingNotesRequest }) =>
      meetingService.updateNotes(meetingId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({queryKey: meetingKeys.detail(variables.meetingId)});
      notifications.show({
        title: 'Notes Saved',
        message: 'Meeting notes have been saved.',
        color: 'teal',
      });
    },
  });
}

export function useSubmitMeetingFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({meetingId, data}: { meetingId: string; data: MeetingFeedbackRequest }) =>
      meetingService.submitFeedback(meetingId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({queryKey: meetingKeys.detail(variables.meetingId)});
      notifications.show({
        title: 'Feedback Submitted',
        message: 'Your feedback has been submitted.',
        color: 'teal',
      });
    },
  });
}

// ─── Agenda Mutations ───────────────────────────────────────────────────────

export function useAddAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({meetingId, data}: { meetingId: string; data: MeetingAgendaItemRequest }) =>
      meetingService.addAgendaItem(meetingId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({queryKey: meetingKeys.agenda(variables.meetingId)});
      queryClient.invalidateQueries({queryKey: meetingKeys.detail(variables.meetingId)});
    },
  });
}

export function useMarkAgendaDiscussed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
                   meetingId,
                   itemId,
                   notes,
                 }: {
      meetingId: string;
      itemId: string;
      notes?: string;
    }) => meetingService.markAgendaItemDiscussed(meetingId, itemId, notes),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({queryKey: meetingKeys.agenda(variables.meetingId)});
      queryClient.invalidateQueries({queryKey: meetingKeys.detail(variables.meetingId)});
    },
  });
}

export function useDeleteAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({meetingId, itemId}: { meetingId: string; itemId: string }) =>
      meetingService.deleteAgendaItem(meetingId, itemId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({queryKey: meetingKeys.agenda(variables.meetingId)});
      queryClient.invalidateQueries({queryKey: meetingKeys.detail(variables.meetingId)});
    },
  });
}

// ─── Action Item Mutations ──────────────────────────────────────────────────

export function useCreateActionItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({meetingId, data}: { meetingId: string; data: MeetingActionItemRequest }) =>
      meetingService.createActionItem(meetingId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({queryKey: meetingKeys.actions(variables.meetingId)});
      queryClient.invalidateQueries({queryKey: meetingKeys.detail(variables.meetingId)});
      queryClient.invalidateQueries({queryKey: meetingKeys.pendingActions()});
    },
  });
}

export function useUpdateActionItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({actionId, data}: { actionId: string; data: MeetingActionItemStatusRequest }) =>
      meetingService.updateActionItemStatus(actionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: meetingKeys.all});
    },
  });
}
