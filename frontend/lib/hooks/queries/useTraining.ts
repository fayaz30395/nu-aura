'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainingService } from '@/lib/services/grow/training.service';
import type {
  TrainingProgramRequest,
  TrainingEnrollmentRequest,
  ProgramStatus,
  EnrollmentStatus,
} from '@/lib/types/grow/training';
import { notifications } from '@mantine/notifications';

// ─── Query Key Factory ─────────────────────────────────────────────────────
export const trainingKeys = {
  all: ['training'] as const,
  programs: () => [...trainingKeys.all, 'programs'] as const,
  programsList: (page: number, size: number) => [...trainingKeys.programs(), 'list', { page, size }] as const,
  programDetail: (id: string) => [...trainingKeys.programs(), 'detail', id] as const,
  programsByStatus: (status: ProgramStatus) => [...trainingKeys.programs(), 'status', status] as const,
  enrollments: () => [...trainingKeys.all, 'enrollments'] as const,
  enrollmentsByProgram: (programId: string) => [...trainingKeys.enrollments(), 'program', programId] as const,
  enrollmentsByEmployee: (employeeId: string) => [...trainingKeys.enrollments(), 'employee', employeeId] as const,
};

// ─── Query Hooks ───────────────────────────────────────────────────────────

export function useAllPrograms(page: number = 0, size: number = 20) {
  return useQuery({
    queryKey: trainingKeys.programsList(page, size),
    queryFn: () => trainingService.getAllPrograms(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTrainingProgramDetail(programId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: trainingKeys.programDetail(programId),
    queryFn: () => trainingService.getProgramById(programId),
    enabled: enabled && !!programId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProgramsByStatus(status: ProgramStatus) {
  return useQuery({
    queryKey: trainingKeys.programsByStatus(status),
    queryFn: () => trainingService.getProgramsByStatus(status),
    enabled: !!status,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useEnrollmentsByProgram(programId: string) {
  return useQuery({
    queryKey: trainingKeys.enrollmentsByProgram(programId),
    queryFn: () => trainingService.getEnrollmentsByProgram(programId),
    enabled: !!programId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useEnrollmentsByEmployee(employeeId: string) {
  return useQuery({
    queryKey: trainingKeys.enrollmentsByEmployee(employeeId),
    queryFn: () => trainingService.getEnrollmentsByEmployee(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ─── Mutation Hooks ────────────────────────────────────────────────────────

export function useCreateTrainingProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TrainingProgramRequest) => trainingService.createProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.programs() });
      notifications.show({
        title: 'Success',
        message: 'Training program created successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create training program',
        color: 'red',
      });
    },
  });
}

export function useUpdateTrainingProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ programId, data }: { programId: string; data: TrainingProgramRequest }) =>
      trainingService.updateProgram(programId, data),
    onSuccess: (updatedProgram) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.programs() });
      queryClient.invalidateQueries({ queryKey: trainingKeys.programDetail(updatedProgram.id) });
      notifications.show({
        title: 'Success',
        message: 'Training program updated successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update training program',
        color: 'red',
      });
    },
  });
}

export function useDeleteTrainingProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programId: string) => trainingService.deleteProgram(programId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.programs() });
      notifications.show({
        title: 'Success',
        message: 'Training program deleted successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete training program',
        color: 'red',
      });
    },
  });
}

export function useEnrollInTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TrainingEnrollmentRequest) => trainingService.enrollEmployee(data),
    onSuccess: (enrollment) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.enrollments() });
      queryClient.invalidateQueries({ queryKey: trainingKeys.enrollmentsByProgram(enrollment.programId) });
      notifications.show({
        title: 'Success',
        message: 'Employee enrolled successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to enroll employee',
        color: 'red',
      });
    },
  });
}

export function useUpdateEnrollmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ enrollmentId, status }: { enrollmentId: string; status: EnrollmentStatus }) =>
      trainingService.updateEnrollmentStatus(enrollmentId, status),
    onSuccess: (updatedEnrollment) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.enrollments() });
      queryClient.invalidateQueries({ queryKey: trainingKeys.enrollmentsByProgram(updatedEnrollment.programId) });
      notifications.show({
        title: 'Success',
        message: 'Enrollment status updated successfully',
        color: 'green',
      });
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'Error',
        message: (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update enrollment status',
        color: 'red',
      });
    },
  });
}
