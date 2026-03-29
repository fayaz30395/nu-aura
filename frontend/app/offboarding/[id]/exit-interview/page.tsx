'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Title,
  Text,
  Paper,
  Group,
  Stack,
  Badge,
  Button,
  Divider,
  Loader,
  Center,
  Alert,
  SimpleGrid,
  Rating,
  Textarea,
  Select,
  Switch,
  NumberInput,
  TextInput,
  ActionIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconAlertCircle,
  IconArrowLeft,
  IconMessageCircle,
  IconCalendar,
  IconStarFilled,
} from '@tabler/icons-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  useExitProcess,
  useCreateExitInterview,
  useConductExitInterview,
  useAllExitInterviews,
} from '@/lib/hooks/queries/useExit';
import {
  InterviewMode,
  InterviewStatus,
  LeavingReason,
} from '@/lib/types/exit';
import type { ExitInterview } from '@/lib/types/exit';
import { apiClient } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';

const scheduleSchema = z.object({
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  interviewMode: z.nativeEnum(InterviewMode, { errorMap: () => ({ message: 'Interview mode is required' }) }),
  interviewerId: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

const feedbackSchema = z.object({
  overallExperienceRating: z.number().min(1).max(5),
  managementRating: z.number().min(1).max(5),
  workLifeBalanceRating: z.number().min(1).max(5),
  growthOpportunitiesRating: z.number().min(1).max(5),
  compensationRating: z.number().min(1).max(5),
  teamCultureRating: z.number().min(1).max(5),
  primaryReasonForLeaving: z.nativeEnum(LeavingReason, { errorMap: () => ({ message: 'Primary reason is required' }) }),
  detailedReason: z.string().optional(),
  whatLikedMost: z.string().optional(),
  whatCouldImprove: z.string().optional(),
  suggestions: z.string().optional(),
  wouldRecommendCompany: z.boolean().default(false),
  wouldConsiderReturning: z.boolean().default(false),
  newEmployer: z.string().optional(),
  newRole: z.string().optional(),
  newSalaryIncreasePercentage: z.number({ coerce: true }).min(0).max(200).optional(),
  interviewerNotes: z.string().optional(),
  isConfidential: z.boolean().default(true),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

const getInterviewStatusColor = (status: InterviewStatus | string): string => {
  const map: Record<string, string> = {
    SCHEDULED: 'blue',
    COMPLETED: 'green',
    CANCELLED: 'red',
    NO_SHOW: 'orange',
    RESCHEDULED: 'yellow',
  };
  return map[status] ?? 'gray';
};

const formatLabel = (str: string): string =>
  str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const leavingReasonOptions = Object.values(LeavingReason).map((r) => ({
  value: r,
  label: formatLabel(r),
}));

const interviewModeOptions = Object.values(InterviewMode).map((m) => ({
  value: m,
  label: formatLabel(m),
}));

export default function ExitInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const exitProcessId = params.id as string;

  const { data: exitProcess } = useExitProcess(exitProcessId);

  // Fetch interviews for this exit process - use the interviews list filtered
  const { data: interview, isLoading } = useQuery({
    queryKey: ['exit', 'interview', 'process', exitProcessId],
    queryFn: async (): Promise<ExitInterview | null> => {
      try {
        // Try fetching all interviews and filter for this process
        const response = await apiClient.get<{ content: ExitInterview[] }>('/exit/interviews', {
          params: { page: 0, size: 100 },
        });
        const interviews = response.data?.content ?? [];
        return interviews.find((i) => i.exitProcessId === exitProcessId) ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!exitProcessId,
  });

  const createMutation = useCreateExitInterview();
  const conductMutation = useConductExitInterview();

  const [mode, setMode] = useState<'view' | 'schedule' | 'feedback'>('view');

  const scheduleForm = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      scheduledDate: '',
      interviewMode: InterviewMode.VIDEO_CALL,
    },
  });

  const feedbackForm = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      overallExperienceRating: 3,
      managementRating: 3,
      workLifeBalanceRating: 3,
      growthOpportunitiesRating: 3,
      compensationRating: 3,
      teamCultureRating: 3,
      wouldRecommendCompany: false,
      wouldConsiderReturning: false,
      isConfidential: true,
    },
  });

  const handleSchedule = async (data: ScheduleFormData) => {
    try {
      await createMutation.mutateAsync({
        exitProcessId,
        employeeId: exitProcess?.employeeId ?? '',
        scheduledDate: data.scheduledDate,
        interviewMode: data.interviewMode,
        interviewerId: data.interviewerId ?? undefined,
      });
      notifications.show({ title: 'Scheduled', message: 'Exit interview scheduled successfully', color: 'green', icon: <IconCheck size={16} /> });
      setMode('view');
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to schedule interview', color: 'red' });
    }
  };

  const handleConductInterview = async (data: FeedbackFormData) => {
    if (!interview) return;
    try {
      await conductMutation.mutateAsync({
        id: interview.id,
        data: {
          actualDate: new Date().toISOString().split('T')[0],
          ...data,
          detailedReason: data.detailedReason ?? undefined,
          whatLikedMost: data.whatLikedMost ?? undefined,
          whatCouldImprove: data.whatCouldImprove ?? undefined,
          suggestions: data.suggestions ?? undefined,
          newEmployer: data.newEmployer ?? undefined,
          newRole: data.newRole ?? undefined,
          newSalaryIncreasePercentage: data.newSalaryIncreasePercentage ?? undefined,
          interviewerNotes: data.interviewerNotes ?? undefined,
        },
      });
      notifications.show({ title: 'Recorded', message: 'Exit interview feedback recorded', color: 'green', icon: <IconCheck size={16} /> });
      setMode('view');
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to record feedback', color: 'red' });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <Center h={400}><Loader size="lg" /></Center>
      </AppLayout>
    );
  }

  const isCompleted = interview?.status === InterviewStatus.COMPLETED;

  return (
    <AppLayout>
      <Stack gap="lg" p="md">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Group>
            <ActionIcon variant="subtle" size="lg" onClick={() => router.push(`/offboarding/${exitProcessId}`)}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Title order={2} className="text-surface-900 dark:text-surface-50">
                Exit Interview
              </Title>
              <Text size="sm" c="dimmed">
                {exitProcess?.employeeName ?? 'Employee'}
              </Text>
            </div>
          </Group>
          {interview && (
            <Badge
              color={getInterviewStatusColor(interview.status)}
              variant="filled"
              size="lg"
            >
              {formatLabel(interview.status)}
            </Badge>
          )}
        </Group>

        {/* No Interview - Schedule One */}
        {!interview && mode !== 'schedule' && (
          <Alert icon={<IconMessageCircle size={16} />} color="blue" variant="light">
            <Group justify="space-between" align="center">
              <Text size="sm">No exit interview has been scheduled for this employee.</Text>
              <Button
                size="sm"
                color="sky.7"
                leftSection={<IconCalendar size={16} />}
                onClick={() => setMode('schedule')}
              >
                Schedule Interview
              </Button>
            </Group>
          </Alert>
        )}

        {/* Schedule Form */}
        {mode === 'schedule' && (
          <Paper withBorder p="md" radius="md">
            <Title order={4} mb="md">Schedule Exit Interview</Title>
            <form onSubmit={scheduleForm.handleSubmit(handleSchedule)}>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Controller
                  name="scheduledDate"
                  control={scheduleForm.control}
                  render={({ field, fieldState }) => (
                    <TextInput
                      type="date"
                      label="Interview Date"
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  )}
                />
                <Controller
                  name="interviewMode"
                  control={scheduleForm.control}
                  render={({ field, fieldState }) => (
                    <Select
                      label="Interview Mode"
                      data={interviewModeOptions}
                      value={field.value}
                      onChange={(val) => field.onChange(val)}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </SimpleGrid>
              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={() => setMode('view')}>Cancel</Button>
                <Button type="submit" color="sky.7" loading={createMutation.isPending}>
                  Schedule
                </Button>
              </Group>
            </form>
          </Paper>
        )}

        {/* Scheduled / View Mode */}
        {interview && mode === 'view' && (
          <>
            {/* Interview Details Card */}
            <Paper withBorder p="md" radius="md">
              <Title order={4} mb="md">Interview Details</Title>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                <div>
                  <Text size="xs" c="dimmed">Scheduled Date</Text>
                  <Text fw={500}>{interview.scheduledDate ? formatDate(interview.scheduledDate) : '-'}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Mode</Text>
                  <Text fw={500}>{interview.interviewMode ? formatLabel(interview.interviewMode) : '-'}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Interviewer</Text>
                  <Text fw={500}>{interview.interviewerName ?? '-'}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Actual Date</Text>
                  <Text fw={500}>{interview.actualDate ? formatDate(interview.actualDate) : '-'}</Text>
                </div>
              </SimpleGrid>

              {!isCompleted && interview.status === InterviewStatus.SCHEDULED && (
                <Group justify="flex-end" mt="md">
                  <Button
                    color="sky.7"
                    leftSection={<IconMessageCircle size={16} />}
                    onClick={() => setMode('feedback')}
                  >
                    Record Feedback
                  </Button>
                </Group>
              )}
            </Paper>

            {/* Completed - Show Ratings & Feedback */}
            {isCompleted && (
              <>
                <Paper withBorder p="md" radius="md">
                  <Title order={4} mb="md">Experience Ratings</Title>
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                    {[
                      { label: 'Overall Experience', value: interview.overallExperienceRating },
                      { label: 'Management', value: interview.managementRating },
                      { label: 'Work-Life Balance', value: interview.workLifeBalanceRating },
                      { label: 'Growth Opportunities', value: interview.growthOpportunitiesRating },
                      { label: 'Compensation', value: interview.compensationRating },
                      { label: 'Team Culture', value: interview.teamCultureRating },
                    ].map((item) => (
                      <Paper key={item.label} p="sm" className="bg-[var(--bg-card)]">
                        <Text size="xs" c="dimmed" mb={4}>{item.label}</Text>
                        <Group gap="xs">
                          <Rating value={item.value ?? 0} readOnly size="sm" />
                          <Text size="sm" fw={500}>{item.value ?? '-'}/5</Text>
                        </Group>
                      </Paper>
                    ))}
                  </SimpleGrid>
                  {interview.averageRating != null && (
                    <>
                      <Divider my="sm" />
                      <Group justify="space-between">
                        <Text fw={600}>Average Rating</Text>
                        <Group gap="xs">
                          <IconStarFilled size={16} className="text-yellow-500" />
                          <Text fw={700} size="lg">{interview.averageRating.toFixed(1)}/5</Text>
                        </Group>
                      </Group>
                    </>
                  )}
                </Paper>

                <Paper withBorder p="md" radius="md">
                  <Title order={4} mb="md">Feedback Details</Title>
                  <Stack gap="md">
                    <div>
                      <Text size="xs" c="dimmed" mb={4}>Primary Reason for Leaving</Text>
                      <Badge color="sky.7" variant="light" size="lg">
                        {interview.primaryReasonForLeaving ? formatLabel(interview.primaryReasonForLeaving) : '-'}
                      </Badge>
                    </div>
                    {interview.detailedReason && (
                      <div>
                        <Text size="xs" c="dimmed" mb={4}>Detailed Reason</Text>
                        <Text size="sm">{interview.detailedReason}</Text>
                      </div>
                    )}
                    {interview.whatLikedMost && (
                      <div>
                        <Text size="xs" c="dimmed" mb={4}>What Liked Most</Text>
                        <Text size="sm">{interview.whatLikedMost}</Text>
                      </div>
                    )}
                    {interview.whatCouldImprove && (
                      <div>
                        <Text size="xs" c="dimmed" mb={4}>What Could Be Improved</Text>
                        <Text size="sm">{interview.whatCouldImprove}</Text>
                      </div>
                    )}
                    {interview.suggestions && (
                      <div>
                        <Text size="xs" c="dimmed" mb={4}>Suggestions</Text>
                        <Text size="sm">{interview.suggestions}</Text>
                      </div>
                    )}
                    <Divider />
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      <div>
                        <Text size="xs" c="dimmed" mb={4}>Would Recommend Company</Text>
                        <Badge color={interview.wouldRecommendCompany ? 'green' : 'red'} variant="light">
                          {interview.wouldRecommendCompany ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed" mb={4}>Would Consider Returning</Text>
                        <Badge color={interview.wouldConsiderReturning ? 'green' : 'red'} variant="light">
                          {interview.wouldConsiderReturning ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </SimpleGrid>
                    {(interview.newEmployer || interview.newRole) && (
                      <>
                        <Divider />
                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                          <div>
                            <Text size="xs" c="dimmed" mb={4}>New Employer</Text>
                            <Text fw={500}>{interview.newEmployer ?? '-'}</Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed" mb={4}>New Role</Text>
                            <Text fw={500}>{interview.newRole ?? '-'}</Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed" mb={4}>Salary Increase</Text>
                            <Text fw={500}>{interview.newSalaryIncreasePercentage != null ? `${interview.newSalaryIncreasePercentage}%` : '-'}</Text>
                          </div>
                        </SimpleGrid>
                      </>
                    )}
                    {interview.interviewerNotes && (
                      <>
                        <Divider />
                        <div>
                          <Text size="xs" c="dimmed" mb={4}>Interviewer Notes</Text>
                          <Paper p="sm" bg="gray.0" radius="sm">
                            <Text size="sm">{interview.interviewerNotes}</Text>
                          </Paper>
                        </div>
                      </>
                    )}
                  </Stack>
                </Paper>
              </>
            )}
          </>
        )}

        {/* Feedback Form */}
        {mode === 'feedback' && interview && (
          <form onSubmit={feedbackForm.handleSubmit(handleConductInterview)}>
            <Stack gap="md">
              {/* Ratings */}
              <Paper withBorder p="md" radius="md">
                <Title order={4} mb="md">Experience Ratings (1-5)</Title>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  {([
                    { name: 'overallExperienceRating' as const, label: 'Overall Experience' },
                    { name: 'managementRating' as const, label: 'Management' },
                    { name: 'workLifeBalanceRating' as const, label: 'Work-Life Balance' },
                    { name: 'growthOpportunitiesRating' as const, label: 'Growth Opportunities' },
                    { name: 'compensationRating' as const, label: 'Compensation' },
                    { name: 'teamCultureRating' as const, label: 'Team Culture' },
                  ]).map((item) => (
                    <Controller
                      key={item.name}
                      name={item.name}
                      control={feedbackForm.control}
                      render={({ field }) => (
                        <div>
                          <Text size="sm" fw={500} mb={4}>{item.label}</Text>
                          <Rating
                            value={field.value}
                            onChange={field.onChange}
                            size="md"
                          />
                        </div>
                      )}
                    />
                  ))}
                </SimpleGrid>
              </Paper>

              {/* Reason & Feedback */}
              <Paper withBorder p="md" radius="md">
                <Title order={4} mb="md">Feedback</Title>
                <Stack gap="sm">
                  <Controller
                    name="primaryReasonForLeaving"
                    control={feedbackForm.control}
                    render={({ field, fieldState }) => (
                      <Select
                        label="Primary Reason for Leaving"
                        placeholder="Select reason..."
                        data={leavingReasonOptions}
                        value={field.value ?? null}
                        onChange={(val) => field.onChange(val)}
                        error={fieldState.error?.message}
                        searchable
                      />
                    )}
                  />
                  <Controller
                    name="detailedReason"
                    control={feedbackForm.control}
                    render={({ field }) => (
                      <Textarea
                        label="Detailed Reason"
                        placeholder="Elaborate on the reason for leaving..."
                        rows={3}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="whatLikedMost"
                    control={feedbackForm.control}
                    render={({ field }) => (
                      <Textarea
                        label="What did you like most about working here?"
                        rows={2}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="whatCouldImprove"
                    control={feedbackForm.control}
                    render={({ field }) => (
                      <Textarea
                        label="What could be improved?"
                        rows={2}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="suggestions"
                    control={feedbackForm.control}
                    render={({ field }) => (
                      <Textarea
                        label="Suggestions"
                        rows={2}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Stack>
              </Paper>

              {/* Toggles */}
              <Paper withBorder p="md" radius="md">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Controller
                    name="wouldRecommendCompany"
                    control={feedbackForm.control}
                    render={({ field }) => (
                      <Switch
                        label="Would recommend this company to others"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.currentTarget.checked)}
                      />
                    )}
                  />
                  <Controller
                    name="wouldConsiderReturning"
                    control={feedbackForm.control}
                    render={({ field }) => (
                      <Switch
                        label="Would consider returning in future"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.currentTarget.checked)}
                      />
                    )}
                  />
                </SimpleGrid>
              </Paper>

              {/* New Employer Info */}
              <Paper withBorder p="md" radius="md">
                <Title order={5} mb="md">New Employer Information (Optional)</Title>
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <Controller
                    name="newEmployer"
                    control={feedbackForm.control}
                    render={({ field }) => (
                      <TextInput
                        label="New Employer"
                        placeholder="Company name"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="newRole"
                    control={feedbackForm.control}
                    render={({ field }) => (
                      <TextInput
                        label="New Role"
                        placeholder="Job title"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="newSalaryIncreasePercentage"
                    control={feedbackForm.control}
                    render={({ field }) => (
                      <NumberInput
                        label="Salary Increase (%)"
                        min={0}
                        max={200}
                        value={field.value ?? ''}
                        onChange={(val) => field.onChange(val ?? undefined)}
                      />
                    )}
                  />
                </SimpleGrid>
              </Paper>

              {/* Interviewer Notes */}
              <Paper withBorder p="md" radius="md">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Controller
                    name="interviewerNotes"
                    control={feedbackForm.control}
                    render={({ field }) => (
                      <Textarea
                        label="Interviewer Notes (Internal)"
                        placeholder="Notes visible only to HR..."
                        rows={3}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="isConfidential"
                    control={feedbackForm.control}
                    render={({ field }) => (
                      <Switch
                        label="Mark as confidential"
                        description="Restrict access to HR team only"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.currentTarget.checked)}
                        mt="lg"
                      />
                    )}
                  />
                </SimpleGrid>
              </Paper>

              <Group justify="flex-end">
                <Button variant="default" onClick={() => setMode('view')}>Cancel</Button>
                <Button
                  type="submit"
                  color="sky.7"
                  loading={conductMutation.isPending}
                  leftSection={<IconCheck size={16} />}
                >
                  Save Interview Feedback
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Stack>
    </AppLayout>
  );
}
