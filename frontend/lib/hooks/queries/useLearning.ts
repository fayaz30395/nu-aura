'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  lmsService,
  Course,
  CourseEnrollment,
  Certificate,
  LmsDashboard,
} from '@/lib/services/lms.service';

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const learningKeys = {
  all: ['learning'] as const,
  // Dashboard
  dashboard: () => [...learningKeys.all, 'dashboard'] as const,
  // Courses
  courses: () => [...learningKeys.all, 'courses'] as const,
  publishedCourses: (page?: number, size?: number) =>
    [...learningKeys.courses(), 'published', { page, size }] as const,
  courseDetail: (id: string) => [...learningKeys.courses(), 'detail', id] as const,
  // Enrollments
  enrollments: () => [...learningKeys.all, 'enrollments'] as const,
  myEnrollments: (page?: number, size?: number) =>
    [...learningKeys.enrollments(), 'my', { page, size }] as const,
  // Certificates
  certificates: () => [...learningKeys.all, 'certificates'] as const,
  myCertificates: (page?: number, size?: number) =>
    [...learningKeys.certificates(), 'my', { page, size }] as const,
};

// ─── Dashboard Query ────────────────────────────────────────────────────────

export function useLearningDashboard(enabled: boolean = true) {
  return useQuery({
    queryKey: learningKeys.dashboard(),
    queryFn: () => lmsService.getMyDashboard(),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000,
  });
}

// ─── Course Queries ────────────────────────────────────────────────────────

export function usePublishedCourses(
  page: number = 0,
  size: number = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: learningKeys.publishedCourses(page, size),
    queryFn: () => lmsService.getPublishedCourses(page, size),
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export function useCourseDetail(courseId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: learningKeys.courseDetail(courseId),
    queryFn: () => lmsService.getCourse(courseId),
    enabled: enabled && !!courseId,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

// ─── Enrollment Queries ────────────────────────────────────────────────────

export function useMyEnrollments(page?: number, size?: number, enabled: boolean = true) {
  return useQuery({
    queryKey: learningKeys.myEnrollments(page, size),
    queryFn: () => lmsService.getMyEnrollments(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ─── Certificate Queries ───────────────────────────────────────────────────

export function useMyCertificates(page?: number, size?: number, enabled: boolean = true) {
  return useQuery({
    queryKey: learningKeys.myCertificates(page, size),
    queryFn: () => lmsService.getMyCertificates(),
    enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

// ─── Enrollment Mutations ──────────────────────────────────────────────────

export function useEnrollCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: string) => lmsService.enrollSelf(courseId),
    onSuccess: () => {
      // Invalidate both dashboard and enrollments to ensure consistency
      queryClient.invalidateQueries({ queryKey: learningKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: learningKeys.myEnrollments() });
      queryClient.invalidateQueries({ queryKey: learningKeys.courses() });
    },
  });
}

// ─── Course Enrollment Query ──────────────────────────────────────────────

export function useCourseEnrollment(courseId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [...learningKeys.courseDetail(courseId), 'enrollment'],
    queryFn: () => lmsService.getEnrollment(courseId),
    enabled: enabled && !!courseId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ─── Course Progress Mutations ───────────────────────────────────────────

export function useUpdateCourseProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollmentId, progressPercent }: { enrollmentId: string; progressPercent: number }) =>
      lmsService.updateEnrollmentProgress(enrollmentId, progressPercent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learningKeys.enrollments() });
      queryClient.invalidateQueries({ queryKey: learningKeys.dashboard() });
    },
  });
}

export function useUpdateContentProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollmentId, contentId, status, timeSpentSeconds }: { enrollmentId: string; contentId: string; status: string; timeSpentSeconds?: number }) =>
      lmsService.updateProgress(enrollmentId, contentId, status, timeSpentSeconds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learningKeys.enrollments() });
    },
  });
}
