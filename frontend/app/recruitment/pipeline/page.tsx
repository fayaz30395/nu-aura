'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Badge,
  Group,
  Text,
  Stack,
  Grid,
  Button,
  Modal,
  Select,
  Textarea,
  ActionIcon,
  TextInput,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout';
import { applicantService } from '@/lib/services/applicant.service';
import { recruitmentService } from '@/lib/services/recruitment.service';
import {
  ApplicationSource,
  ApplicationStatus,
} from '@/lib/types/applicant';
import type {
  Applicant,
  ApplicantRequest,
  ApplicantStatusUpdate,
  PipelineData,
} from '@/lib/types/applicant';
import { ArrowRight, Plus, Star } from 'lucide-react';

const ACTIVE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENING,
  ApplicationStatus.PHONE_SCREEN,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.TECHNICAL_ROUND,
  ApplicationStatus.HR_ROUND,
  ApplicationStatus.OFFER_PENDING,
  ApplicationStatus.OFFERED,
];

const ARCHIVE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.WITHDRAWN,
];

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.APPLIED]: 'blue',
  [ApplicationStatus.SCREENING]: 'teal',
  [ApplicationStatus.PHONE_SCREEN]: 'cyan',
  [ApplicationStatus.INTERVIEW]: 'grape',
  [ApplicationStatus.TECHNICAL_ROUND]: 'indigo',
  [ApplicationStatus.HR_ROUND]: 'violet',
  [ApplicationStatus.OFFER_PENDING]: 'orange',
  [ApplicationStatus.OFFERED]: 'green',
  [ApplicationStatus.ACCEPTED]: 'green',
  [ApplicationStatus.REJECTED]: 'red',
  [ApplicationStatus.WITHDRAWN]: 'gray',
};

const SOURCE_COLORS: Record<ApplicationSource, string> = {
  [ApplicationSource.WEBSITE]: 'blue',
  [ApplicationSource.REFERRAL]: 'teal',
  [ApplicationSource.JOB_BOARD]: 'indigo',
  [ApplicationSource.LINKEDIN]: 'cyan',
  [ApplicationSource.CAMPUS]: 'grape',
  [ApplicationSource.AGENCY]: 'orange',
  [ApplicationSource.OTHER]: 'gray',
};

const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.APPLIED]: [ApplicationStatus.SCREENING, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN],
  [ApplicationStatus.SCREENING]: [
    ApplicationStatus.PHONE_SCREEN,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.TECHNICAL_ROUND,
    ApplicationStatus.HR_ROUND,
    ApplicationStatus.OFFER_PENDING,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.PHONE_SCREEN]: [
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.TECHNICAL_ROUND,
    ApplicationStatus.HR_ROUND,
    ApplicationStatus.OFFER_PENDING,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.INTERVIEW]: [
    ApplicationStatus.TECHNICAL_ROUND,
    ApplicationStatus.HR_ROUND,
    ApplicationStatus.OFFER_PENDING,
    ApplicationStatus.OFFERED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.TECHNICAL_ROUND]: [
    ApplicationStatus.HR_ROUND,
    ApplicationStatus.OFFER_PENDING,
    ApplicationStatus.OFFERED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.HR_ROUND]: [
    ApplicationStatus.OFFER_PENDING,
    ApplicationStatus.OFFERED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.OFFER_PENDING]: [ApplicationStatus.OFFERED, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN],
  [ApplicationStatus.OFFERED]: [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN],
  [ApplicationStatus.ACCEPTED]: [ApplicationStatus.ACCEPTED],
  [ApplicationStatus.REJECTED]: [ApplicationStatus.REJECTED],
  [ApplicationStatus.WITHDRAWN]: [ApplicationStatus.WITHDRAWN],
};

const formatLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
};

const RatingStars = ({ value, onChange, readOnly = false }: { value: number; onChange?: (val: number) => void; readOnly?: boolean }) => (
  <Group gap={4}>
    {Array.from({ length: 5 }).map((_, index) => {
      const filled = index < value;
      return (
        <ActionIcon
          key={index}
          variant="subtle"
          color={filled ? 'yellow' : 'gray'}
          size="sm"
          onClick={() => !readOnly && onChange?.(index + 1)}
          disabled={readOnly}
        >
          <Star className={filled ? 'fill-current' : ''} size={16} />
        </ActionIcon>
      );
    })}
  </Group>
);

export default function ApplicantPipelinePage() {
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [detailOpened, setDetailOpened] = useState(false);
  const [newOpened, setNewOpened] = useState(false);
  const [activeApplicant, setActiveApplicant] = useState<Applicant | null>(null);
  const [selectedNextStatus, setSelectedNextStatus] = useState<ApplicationStatus | null>(null);
  const [detailNotes, setDetailNotes] = useState('');
  const [detailRejectionReason, setDetailRejectionReason] = useState('');
  const [detailRating, setDetailRating] = useState<number>(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const [newApplicant, setNewApplicant] = useState<ApplicantRequest>({
    candidateId: '',
    jobOpeningId: '',
    source: ApplicationSource.WEBSITE,
    notes: '',
    expectedSalary: undefined,
  });

  const { data: jobOpeningsPage, isLoading: jobsLoading } = useQuery({
    queryKey: ['recruitment-job-openings'],
    queryFn: () => recruitmentService.getAllJobOpenings(0, 200),
  });

  const jobOpenings = jobOpeningsPage?.content ?? [];

  useEffect(() => {
    if (!selectedJobId && jobOpenings.length > 0) {
      setSelectedJobId(jobOpenings[0].id);
    }
  }, [jobOpenings, selectedJobId]);

  const pipelineQuery = useQuery({
    queryKey: ['applicant-pipeline', selectedJobId],
    queryFn: () => applicantService.getPipeline(selectedJobId as string),
    enabled: !!selectedJobId,
  });

  const pipelineData: PipelineData = pipelineQuery.data || ({} as PipelineData);

  const candidatesQuery = useQuery({
    queryKey: ['recruitment-candidates', newApplicant.jobOpeningId || 'all'],
    queryFn: async () => {
      if (newApplicant.jobOpeningId) {
        return recruitmentService.getCandidatesByJobOpening(newApplicant.jobOpeningId);
      }
      const response = await recruitmentService.getAllCandidates(0, 200);
      return response.content;
    },
    enabled: newOpened,
  });

  const createApplicantMutation = useMutation({
    mutationFn: (data: ApplicantRequest) => applicantService.createApplicant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicant-pipeline', selectedJobId] });
      setNewOpened(false);
      setNewApplicant({
        candidateId: '',
        jobOpeningId: selectedJobId || '',
        source: ApplicationSource.WEBSITE,
        notes: '',
        expectedSalary: undefined,
      });
      setActionError(null);
    },
    onError: (error) => setActionError(getErrorMessage(error, 'Failed to create applicant')),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApplicantStatusUpdate }) => applicantService.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicant-pipeline', selectedJobId] });
      setActionError(null);
    },
    onError: (error) => setActionError(getErrorMessage(error, 'Failed to update applicant')),
  });

  const rateApplicantMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) => applicantService.rateApplicant(id, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicant-pipeline', selectedJobId] });
      setActionError(null);
    },
    onError: (error) => setActionError(getErrorMessage(error, 'Failed to rate applicant')),
  });

  const quickAdvance = async (applicant: Applicant) => {
    const currentIndex = ACTIVE_STATUSES.indexOf(applicant.status);
    let nextStatus: ApplicationStatus | null = null;
    if (currentIndex >= 0 && currentIndex < ACTIVE_STATUSES.length - 1) {
      nextStatus = ACTIVE_STATUSES[currentIndex + 1];
    } else if (applicant.status === ApplicationStatus.OFFERED) {
      nextStatus = ApplicationStatus.ACCEPTED;
    }

    if (!nextStatus) return;

    await updateStatusMutation.mutateAsync({
      id: applicant.id,
      data: { status: nextStatus, notes: applicant.notes },
    });
  };

  const openDetailModal = (applicant: Applicant) => {
    setActiveApplicant(applicant);
    const nextOptions = STATUS_TRANSITIONS[applicant.status] || [];
    setSelectedNextStatus(null);
    setDetailNotes(applicant.notes || '');
    setDetailRejectionReason(applicant.rejectionReason || '');
    setDetailRating(applicant.rating || 0);
    setDetailOpened(true);
    setActionError(null);
  };

  const handleUpdateApplicant = async () => {
    if (!activeApplicant) return;

    const updates: Promise<unknown>[] = [];

    const statusToApply = selectedNextStatus || activeApplicant.status;
    const notesChanged = detailNotes !== (activeApplicant.notes || '');
    const rejectionChanged = detailRejectionReason !== (activeApplicant.rejectionReason || '');
    const statusChanged = statusToApply !== activeApplicant.status;

    if (statusChanged || notesChanged || rejectionChanged) {
      updates.push(
        updateStatusMutation.mutateAsync({
          id: activeApplicant.id,
          data: {
            status: statusToApply,
            notes: detailNotes,
            rejectionReason:
              statusToApply === ApplicationStatus.REJECTED || statusToApply === ApplicationStatus.WITHDRAWN
                ? detailRejectionReason || undefined
                : undefined,
          },
        })
      );
    }

    if (detailRating && detailRating !== activeApplicant.rating) {
      updates.push(rateApplicantMutation.mutateAsync({ id: activeApplicant.id, rating: detailRating }));
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    setDetailOpened(false);
    setActiveApplicant(null);
  };

  const handleRejectApplicant = async () => {
    if (!activeApplicant) return;

    await updateStatusMutation.mutateAsync({
      id: activeApplicant.id,
      data: {
        status: ApplicationStatus.REJECTED,
        notes: detailNotes,
        rejectionReason: detailRejectionReason || 'Not selected',
      },
    });

    setDetailOpened(false);
    setActiveApplicant(null);
  };

  const handleCreateApplicant = async () => {
    if (!newApplicant.candidateId || !newApplicant.jobOpeningId) {
      setActionError('Candidate and Job Opening are required');
      return;
    }
    await createApplicantMutation.mutateAsync(newApplicant);
  };

  const jobOptions = jobOpenings.map(job => ({
    value: job.id,
    label: `${job.jobTitle}${job.jobCode ? ` (${job.jobCode})` : ''}`,
  }));

  const candidateOptions = (candidatesQuery.data || []).map(candidate => {
    const name = candidate.fullName || `${candidate.firstName} ${candidate.lastName}`;
    return {
      value: candidate.id,
      label: `${name} · ${candidate.email}`,
    };
  });

  const archiveCounts = ARCHIVE_STATUSES.reduce<Record<ApplicationStatus, number>>((acc, status) => {
    acc[status] = pipelineData?.[status]?.length || 0;
    return acc;
  }, {} as Record<ApplicationStatus, number>);

  const selectedJobTitle = jobOpenings.find(job => job.id === selectedJobId)?.jobTitle;

  return (
    <AppLayout activeMenuItem="recruitment">
      <div className="p-6 space-y-6">
        <Group justify="space-between" align="flex-start" className="flex-wrap gap-4">
          <Stack gap={4}>
            <Text size="xl" fw={700}>Applicant Pipeline</Text>
            <Text size="sm" c="dimmed">Track candidates through each hiring stage</Text>
          </Stack>
          <Group gap="md" className="flex-wrap">
            <Select
              searchable
              clearable={false}
              value={selectedJobId}
              onChange={value => {
                setSelectedJobId(value);
                if (value) {
                  setNewApplicant(prev => ({ ...prev, jobOpeningId: value }));
                }
              }}
              data={jobOptions}
              placeholder={jobsLoading ? 'Loading job openings...' : 'Select job opening'}
              w={280}
            />
            <Button leftSection={<Plus size={16} />} onClick={() => {
              setNewApplicant(prev => ({
                ...prev,
                jobOpeningId: selectedJobId || prev.jobOpeningId,
              }));
              setNewOpened(true);
              setActionError(null);
            }}>
              New Application
            </Button>
          </Group>
        </Group>

        {actionError && (
          <Card withBorder radius="md" p="sm" className="bg-red-50">
            <Text size="sm" c="red">{actionError}</Text>
          </Card>
        )}

        {!selectedJobId ? (
          <Card withBorder radius="lg" p="xl">
            <Text size="sm" c="dimmed">Select a job opening to view the pipeline.</Text>
          </Card>
        ) : pipelineQuery.isLoading ? (
          <Card withBorder radius="lg" p="xl">
            <Text size="sm" c="dimmed">Loading pipeline for {selectedJobTitle || 'job opening'}...</Text>
          </Card>
        ) : pipelineQuery.isError ? (
          <Card withBorder radius="lg" p="xl">
            <Text size="sm" c="red">{getErrorMessage(pipelineQuery.error, 'Failed to load pipeline')}</Text>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-[1100px]">
                {ACTIVE_STATUSES.map(status => {
                  const applicants = (pipelineData?.[status] || []).slice().sort((a, b) => {
                    const aTime = a.appliedDate ? new Date(a.appliedDate).getTime() : 0;
                    const bTime = b.appliedDate ? new Date(b.appliedDate).getTime() : 0;
                    return bTime - aTime;
                  });
                  return (
                    <Card
                      key={status}
                      withBorder
                      radius="lg"
                      p="md"
                      className="min-w-[260px] max-w-[280px] flex-1 transition-all"
                      style={{ borderTop: `4px solid var(--mantine-color-${STATUS_COLORS[status]}-6)` }}
                    >
                      <Stack gap="sm">
                        <Group justify="space-between">
                          <Text fw={600}>{formatLabel(status)}</Text>
                          <Badge color={STATUS_COLORS[status]} variant="light">
                            {applicants.length}
                          </Badge>
                        </Group>

                        <Stack gap="sm">
                          {applicants.length === 0 ? (
                            <Text size="sm" c="dimmed">No applicants yet</Text>
                          ) : (
                            applicants.map(applicant => {
                              const quickLabel = (() => {
                                const index = ACTIVE_STATUSES.indexOf(applicant.status);
                                if (index >= 0 && index < ACTIVE_STATUSES.length - 1) {
                                  return `Move to ${formatLabel(ACTIVE_STATUSES[index + 1])}`;
                                }
                                if (applicant.status === ApplicationStatus.OFFERED) {
                                  return 'Mark Accepted';
                                }
                                return 'Update';
                              })();

                              return (
                                <Card
                                  key={applicant.id}
                                  withBorder
                                  radius="md"
                                  p="sm"
                                  className="transition-all hover:shadow-md cursor-pointer"
                                  onClick={() => openDetailModal(applicant)}
                                >
                                  <Stack gap={6}>
                                    <Group justify="space-between" align="flex-start">
                                      <Stack gap={2}>
                                        <Text fw={600} size="sm">
                                          {applicant.candidateName || 'Unnamed Candidate'}
                                        </Text>
                                        <Text size="xs" c="dimmed">Applied {formatDate(applicant.appliedDate)}</Text>
                                      </Stack>
                                      <Badge
                                        color={applicant.source ? SOURCE_COLORS[applicant.source] : 'gray'}
                                        variant="light"
                                      >
                                        {applicant.source ? formatLabel(applicant.source) : 'Other'}
                                      </Badge>
                                    </Group>

                                    <RatingStars value={applicant.rating || 0} readOnly />

                                    <Button
                                      size="xs"
                                      variant="light"
                                      rightSection={<ArrowRight size={14} />}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        quickAdvance(applicant);
                                      }}
                                      loading={updateStatusMutation.isPending}
                                    >
                                      {quickLabel}
                                    </Button>
                                  </Stack>
                                </Card>
                              );
                            })
                          )}
                        </Stack>
                      </Stack>
                    </Card>
                  );
                })}
              </div>
            </div>

            <Grid gutter="md">
              {ARCHIVE_STATUSES.map(status => (
                <Grid.Col key={status} span={{ base: 12, sm: 4 }}>
                  <Card withBorder radius="lg" p="md" className="transition-all">
                    <Group justify="space-between">
                      <Text fw={600}>{formatLabel(status)}</Text>
                      <Badge color={STATUS_COLORS[status]} variant="light">
                        {archiveCounts[status]}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" mt={6}>
                      Archived candidates
                    </Text>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          </div>
        )}
      </div>

      <Modal
        opened={detailOpened}
        onClose={() => {
          setDetailOpened(false);
          setActiveApplicant(null);
          setSelectedNextStatus(null);
        }}
        title="Applicant Details"
        size="lg"
        centered
      >
        {activeApplicant && (
          <Stack gap="md">
            <Grid gutter="sm">
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="sm" c="dimmed">Candidate</Text>
                <Text fw={600}>{activeApplicant.candidateName || 'Unnamed Candidate'}</Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="sm" c="dimmed">Job Opening</Text>
                <Text fw={600}>{activeApplicant.jobTitle || '—'}</Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <Text size="sm" c="dimmed">Status</Text>
                <Badge color={STATUS_COLORS[activeApplicant.status]} variant="light">
                  {formatLabel(activeApplicant.status)}
                </Badge>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <Text size="sm" c="dimmed">Source</Text>
                <Badge
                  color={activeApplicant.source ? SOURCE_COLORS[activeApplicant.source] : 'gray'}
                  variant="light"
                >
                  {activeApplicant.source ? formatLabel(activeApplicant.source) : 'Other'}
                </Badge>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <Text size="sm" c="dimmed">Applied</Text>
                <Text fw={500}>{formatDate(activeApplicant.appliedDate)}</Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="sm" c="dimmed">Expected Salary</Text>
                <Text fw={500}>
                  {activeApplicant.expectedSalary ? activeApplicant.expectedSalary.toLocaleString() : '—'}
                </Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="sm" c="dimmed">Offered Salary</Text>
                <Text fw={500}>
                  {activeApplicant.offeredSalary ? activeApplicant.offeredSalary.toLocaleString() : '—'}
                </Text>
              </Grid.Col>
            </Grid>

            <Select
              label="Move to stage"
              data={(STATUS_TRANSITIONS[activeApplicant.status] || [])
                .filter(status => status !== activeApplicant.status)
                .map(status => ({ value: status, label: formatLabel(status) }))}
              value={selectedNextStatus}
              onChange={(value) => setSelectedNextStatus(value as ApplicationStatus | null)}
              placeholder="Select next status"
              searchable
            />

            <Textarea
              label="Notes"
              value={detailNotes}
              onChange={(event) => setDetailNotes(event.currentTarget.value)}
              minRows={3}
            />

            <Textarea
              label="Rejection reason (optional)"
              value={detailRejectionReason}
              onChange={(event) => setDetailRejectionReason(event.currentTarget.value)}
              minRows={2}
            />

            <Stack gap={4}>
              <Text size="sm" fw={500}>Rating</Text>
              <RatingStars value={detailRating} onChange={setDetailRating} />
            </Stack>

            <Group justify="space-between" mt="sm">
              <Button
                color="red"
                variant="light"
                onClick={handleRejectApplicant}
                loading={updateStatusMutation.isPending}
              >
                Reject
              </Button>
              <Group>
                <Button variant="default" onClick={() => setDetailOpened(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateApplicant} loading={updateStatusMutation.isPending || rateApplicantMutation.isPending}>
                  Update
                </Button>
              </Group>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={newOpened}
        onClose={() => setNewOpened(false)}
        title="New Application"
        size="lg"
        centered
      >
        <Stack gap="md">
          <Select
            label="Candidate"
            placeholder="Search candidate"
            searchable
            data={candidateOptions}
            value={newApplicant.candidateId || null}
            onChange={(value) => {
              if (!value) return;
              const selectedCandidate = (candidatesQuery.data || []).find(candidate => candidate.id === value);
              setNewApplicant(prev => ({
                ...prev,
                candidateId: value,
                jobOpeningId: selectedCandidate?.jobOpeningId || prev.jobOpeningId,
              }));
            }}
            nothingFoundMessage={candidatesQuery.isLoading ? 'Loading candidates...' : 'No candidates found'}
          />

          <Select
            label="Job Opening"
            placeholder="Select job opening"
            data={jobOptions}
            value={newApplicant.jobOpeningId || null}
            onChange={(value) => value && setNewApplicant(prev => ({ ...prev, jobOpeningId: value }))}
            searchable
          />

          <Select
            label="Source"
            data={Object.values(ApplicationSource).map(source => ({
              value: source,
              label: formatLabel(source),
            }))}
            value={newApplicant.source}
            onChange={(value) => value && setNewApplicant(prev => ({ ...prev, source: value as ApplicationSource }))}
          />

          <TextInput
            label="Expected Salary"
            type="number"
            value={newApplicant.expectedSalary?.toString() || ''}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setNewApplicant(prev => ({
                ...prev,
                expectedSalary: value ? Number(value) : undefined,
              }));
            }}
          />

          <Textarea
            label="Notes"
            value={newApplicant.notes || ''}
            onChange={(event) => setNewApplicant(prev => ({ ...prev, notes: event.currentTarget.value }))}
            minRows={3}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setNewOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateApplicant} loading={createApplicantMutation.isPending}>
              Create Application
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AppLayout>
  );
}
