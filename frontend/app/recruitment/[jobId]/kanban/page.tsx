'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Title,
  Text,
  Stack,
  Group,
  Paper,
  Button,
  Loader,
  Center,
  Alert,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconArrowLeft, IconArrowRight, IconX, IconSend } from '@tabler/icons-react';
import { AppLayout } from '@/components/layout';
import { StageBadge } from '@/components/recruitment/StageBadge';
import { OfferModal } from './OfferModal';
import { recruitmentService } from '@/lib/services/recruitment.service';
import type { Candidate, CandidateStage } from '@/lib/types/recruitment';

// Pipeline order — HIRED and REJECTED are terminal stages.
const PIPELINE_STAGES: CandidateStage[] = [
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'ASSESSMENT',
  'OFFER',
  'HIRED',
];

const TERMINAL_STAGES: CandidateStage[] = ['HIRED', 'REJECTED'];

function nextStage(stage: CandidateStage): CandidateStage | null {
  const idx = PIPELINE_STAGES.indexOf(stage);
  if (idx === -1 || idx === PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[idx + 1];
}

interface KanbanColumnProps {
  stage: CandidateStage;
  candidates: Candidate[];
  onMoveForward: (candidate: Candidate) => void;
  onReject: (candidate: Candidate) => void;
  onOpenOffer: (candidate: Candidate) => void;
  isPending: boolean;
  pendingCandidateId: string | null;
}

function KanbanColumn({
  stage,
  candidates,
  onMoveForward,
  onReject,
  onOpenOffer,
  isPending,
  pendingCandidateId,
}: KanbanColumnProps) {
  const canAdvance = !TERMINAL_STAGES.includes(stage);
  const isOfferStage = stage === 'OFFER';

  return (
    <Stack
      style={{
        minWidth: 240,
        maxWidth: 280,
        flexShrink: 0,
        background: 'var(--mantine-color-gray-0)',
        borderRadius: 'var(--mantine-radius-md)',
        padding: 'var(--mantine-spacing-sm)',
      }}
      gap="xs"
    >
      {/* Column header */}
      <Group justify="space-between" align="center" mb={4}>
        <StageBadge stage={stage} />
        <Badge variant="outline" color="gray" size="xs" radius="sm">
          {candidates.length}
        </Badge>
      </Group>

      {/* Cards */}
      <ScrollArea style={{ maxHeight: 'calc(100vh - 220px)' }} scrollbarSize={4}>
        <Stack gap="xs">
          {candidates.length === 0 && (
            <Text size="xs" c="dimmed" ta="center" py="md">
              No candidates
            </Text>
          )}
          {candidates.map((candidate) => (
            <Paper
              key={candidate.id}
              withBorder
              p="sm"
              radius="sm"
              style={{ background: 'white' }}
            >
              <Stack gap={6}>
                <Text fw={600} size="sm" lineClamp={1}>
                  {candidate.fullName}
                </Text>
                {candidate.currentDesignation && (
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {candidate.currentDesignation}
                  </Text>
                )}
                {candidate.appliedDate && (
                  <Text size="xs" c="dimmed">
                    Applied: {new Date(candidate.appliedDate).toLocaleDateString()}
                  </Text>
                )}

                {/* Action buttons */}
                <Group gap={4} mt={4}>
                  {canAdvance && (
                    <Tooltip label={isOfferStage ? 'Generate Offer' : `Move to ${nextStage(stage) ?? ''}`}>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color={isOfferStage ? 'yellow' : 'blue'}
                        loading={isPending && pendingCandidateId === candidate.id}
                        onClick={() =>
                          isOfferStage ? onOpenOffer(candidate) : onMoveForward(candidate)
                        }
                        aria-label={isOfferStage ? 'Generate offer' : 'Move forward'}
                      >
                        {isOfferStage ? <IconSend size={14} /> : <IconArrowRight size={14} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {!TERMINAL_STAGES.includes(stage) && (
                    <Tooltip label="Reject">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="red"
                        loading={isPending && pendingCandidateId === candidate.id}
                        onClick={() => onReject(candidate)}
                        aria-label="Reject candidate"
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

export default function KanbanPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [offerCandidate, setOfferCandidate] = useState<Candidate | null>(null);
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(null);

  // ── Fetch candidates for this job ──────────────────────────────────────
  const {
    data: candidates = [],
    isLoading,
    error,
  } = useQuery<Candidate[]>({
    queryKey: ['kanban-candidates', jobId],
    queryFn: () => recruitmentService.getCandidatesByJob(jobId),
    enabled: !!jobId,
  });

  // ── Move stage mutation ────────────────────────────────────────────────
  const stageMutation = useMutation({
    mutationFn: ({ candidateId, stage }: { candidateId: string; stage: CandidateStage }) =>
      recruitmentService.moveCandidateStage(candidateId, { stage }),
    onMutate: ({ candidateId }) => {
      setPendingCandidateId(candidateId);
    },
    onSuccess: (_, { stage }) => {
      notifications.show({
        title: 'Stage updated',
        message: `Candidate moved to ${stage}`,
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['kanban-candidates', jobId] });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.message ?? 'Failed to update stage',
        color: 'red',
      });
    },
    onSettled: () => {
      setPendingCandidateId(null);
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────
  function handleMoveForward(candidate: Candidate) {
    const current = (candidate.currentStage as unknown as CandidateStage) ?? 'APPLIED';
    const target = nextStage(current);
    if (!target) return;
    stageMutation.mutate({ candidateId: candidate.id, stage: target });
  }

  function handleReject(candidate: Candidate) {
    stageMutation.mutate({ candidateId: candidate.id, stage: 'REJECTED' });
  }

  // ── Group candidates by stage ──────────────────────────────────────────
  function candidatesForStage(stage: CandidateStage): Candidate[] {
    return candidates.filter((c) => {
      // Map existing CandidateStatus / RecruitmentStage to CandidateStage where possible.
      // The API returns currentStage (RecruitmentStage) or status (CandidateStatus).
      // We treat our CandidateStage as the canonical Kanban stage stored in currentStage.
      const s = (c.currentStage as unknown as CandidateStage) ?? 'APPLIED';
      return s === stage;
    });
  }

  // Collect REJECTED candidates separately
  const rejectedCandidates = candidates.filter(
    (c) => (c.currentStage as unknown as CandidateStage) === 'REJECTED'
  );

  // ── Render ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AppLayout activeMenuItem="recruitment">
        <Center style={{ height: '60vh' }}>
          <Loader size="lg" />
        </Center>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout activeMenuItem="recruitment">
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Failed to load candidates" m="md">
          {(error as any)?.response?.data?.message ?? 'An unexpected error occurred.'}
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="recruitment">
      <Stack gap="md" p="md">
        {/* Page header */}
        <Group justify="space-between" align="center">
          <Group gap="sm" align="center">
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => router.push('/recruitment/jobs')}
              aria-label="Back to job openings"
            >
              <IconArrowLeft size={18} />
            </ActionIcon>
            <div>
              <Title order={3}>Recruitment Pipeline</Title>
              <Text size="sm" c="dimmed">
                Drag-free Kanban — click arrows to advance candidates
              </Text>
            </div>
          </Group>
          <Group gap="xs">
            <Badge variant="outline" color="red" size="sm">
              Rejected: {rejectedCandidates.length}
            </Badge>
            <Badge variant="outline" color="gray" size="sm">
              Total: {candidates.length}
            </Badge>
          </Group>
        </Group>

        {/* Kanban board */}
        <ScrollArea type="scroll" scrollbarSize={8}>
          <Group
            align="flex-start"
            gap="md"
            wrap="nowrap"
            style={{ paddingBottom: 16 }}
          >
            {PIPELINE_STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                candidates={candidatesForStage(stage)}
                onMoveForward={handleMoveForward}
                onReject={handleReject}
                onOpenOffer={(c) => setOfferCandidate(c)}
                isPending={stageMutation.isPending}
                pendingCandidateId={pendingCandidateId}
              />
            ))}
          </Group>
        </ScrollArea>

        {/* Rejected section (collapsed at bottom) */}
        {rejectedCandidates.length > 0 && (
          <Paper withBorder p="md" radius="md" mt="xs">
            <Group mb="sm" gap="xs">
              <Badge color="red" variant="light">
                Rejected
              </Badge>
              <Text size="sm" c="dimmed">
                {rejectedCandidates.length} candidate{rejectedCandidates.length > 1 ? 's' : ''}
              </Text>
            </Group>
            <Group gap="sm" wrap="wrap">
              {rejectedCandidates.map((c) => (
                <Paper key={c.id} withBorder p="xs" radius="sm" style={{ minWidth: 160 }}>
                  <Text size="sm" fw={500} lineClamp={1}>
                    {c.fullName}
                  </Text>
                  {c.appliedDate && (
                    <Text size="xs" c="dimmed">
                      {new Date(c.appliedDate).toLocaleDateString()}
                    </Text>
                  )}
                </Paper>
              ))}
            </Group>
          </Paper>
        )}
      </Stack>

      {/* Offer Letter Modal */}
      {offerCandidate && (
        <OfferModal
          opened={!!offerCandidate}
          onClose={() => setOfferCandidate(null)}
          candidate={offerCandidate}
          jobId={jobId}
        />
      )}
    </AppLayout>
  );
}
