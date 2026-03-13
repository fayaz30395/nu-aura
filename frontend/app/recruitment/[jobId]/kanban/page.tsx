'use client';

import { useState, useMemo } from 'react';
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
  Switch,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconArrowRight,
  IconX,
  IconSend,
  IconSparkles,
} from '@tabler/icons-react';
import { AppLayout } from '@/components/layout';
import { StageBadge } from '@/components/recruitment/StageBadge';
import { OfferModal } from './OfferModal';
import { recruitmentService } from '@/lib/services/recruitment.service';
import { useRankedCandidates } from '@/lib/hooks/queries/useRecruitment';
import type { Candidate, RecruitmentStage } from '@/lib/types/recruitment';
import type { CandidateMatchResponse } from '@/lib/types/ai-recruitment';

// ── 13-stage NU-Hire pipeline ──────────────────────────────────────────
// Terminal / rejection stages are excluded from the main board columns.
const PIPELINE_STAGES: RecruitmentStage[] = [
  'RECRUITERS_PHONE_CALL',
  'PANEL_REVIEW',
  'PANEL_SHORTLISTED',
  'TECHNICAL_INTERVIEW_SCHEDULED',
  'TECHNICAL_INTERVIEW_COMPLETED',
  'MANAGEMENT_INTERVIEW_SCHEDULED',
  'MANAGEMENT_INTERVIEW_COMPLETED',
  'CLIENT_INTERVIEW_SCHEDULED',
  'CLIENT_INTERVIEW_COMPLETED',
  'HR_FINAL_INTERVIEW_COMPLETED',
  'OFFER_NDA_TO_BE_RELEASED',
];

const REJECTION_STAGES: RecruitmentStage[] = ['PANEL_REJECT', 'CANDIDATE_REJECTED'];

// Short labels for column headers
const STAGE_SHORT_LABEL: Record<RecruitmentStage, string> = {
  RECRUITERS_PHONE_CALL: 'Phone Call',
  PANEL_REVIEW: 'Panel Review',
  PANEL_REJECT: 'Panel Reject',
  PANEL_SHORTLISTED: 'Shortlisted',
  TECHNICAL_INTERVIEW_SCHEDULED: 'Tech Scheduled',
  TECHNICAL_INTERVIEW_COMPLETED: 'Tech Done',
  MANAGEMENT_INTERVIEW_SCHEDULED: 'Mgmt Scheduled',
  MANAGEMENT_INTERVIEW_COMPLETED: 'Mgmt Done',
  CLIENT_INTERVIEW_SCHEDULED: 'Client Scheduled',
  CLIENT_INTERVIEW_COMPLETED: 'Client Done',
  HR_FINAL_INTERVIEW_COMPLETED: 'HR Final',
  CANDIDATE_REJECTED: 'Rejected',
  OFFER_NDA_TO_BE_RELEASED: 'Offer / NDA',
};

function nextStage(stage: RecruitmentStage): RecruitmentStage | null {
  const idx = PIPELINE_STAGES.indexOf(stage);
  if (idx === -1 || idx === PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[idx + 1];
}

function prevStage(stage: RecruitmentStage): RecruitmentStage | null {
  const idx = PIPELINE_STAGES.indexOf(stage);
  if (idx <= 0) return null;
  return PIPELINE_STAGES[idx - 1];
}

// ── Score badge helper ─────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'green' : score >= 50 ? 'yellow' : 'red';
  return (
    <Tooltip label={`AI Match Score: ${score}%`}>
      <Badge size="xs" color={color} variant="light" leftSection={<IconSparkles size={10} />}>
        {score}%
      </Badge>
    </Tooltip>
  );
}

interface KanbanColumnProps {
  stage: RecruitmentStage;
  candidates: Candidate[];
  onMoveForward: (candidate: Candidate) => void;
  onMoveBackward: (candidate: Candidate) => void;
  onReject: (candidate: Candidate) => void;
  onOpenOffer: (candidate: Candidate) => void;
  isPending: boolean;
  pendingCandidateId: string | null;
  scoreMap: Map<string, number>;
}

function KanbanColumn({
  stage,
  candidates,
  onMoveForward,
  onMoveBackward,
  onReject,
  onOpenOffer,
  isPending,
  pendingCandidateId,
  scoreMap,
}: KanbanColumnProps) {
  const isOfferStage = stage === 'OFFER_NDA_TO_BE_RELEASED';
  const isTerminal = isOfferStage; // last pipeline column — no further advance
  const next = nextStage(stage);
  const prev = prevStage(stage);

  return (
    <Stack
      style={{
        minWidth: 220,
        maxWidth: 260,
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
                <Group justify="space-between" align="center" gap={4}>
                  <Text fw={600} size="sm" lineClamp={1} style={{ flex: 1 }}>
                    {candidate.fullName}
                  </Text>
                  {scoreMap.has(candidate.id) && (
                    <ScoreBadge score={scoreMap.get(candidate.id)!} />
                  )}
                </Group>
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
                  {prev && (
                    <Tooltip label={`Move back to ${STAGE_SHORT_LABEL[prev]}`}>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="gray"
                        loading={isPending && pendingCandidateId === candidate.id}
                        onClick={() => onMoveBackward(candidate)}
                        aria-label="Move backward"
                      >
                        <IconArrowLeft size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {!isTerminal && next && (
                    <Tooltip label={`Move to ${STAGE_SHORT_LABEL[next]}`}>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="blue"
                        loading={isPending && pendingCandidateId === candidate.id}
                        onClick={() => onMoveForward(candidate)}
                        aria-label="Move forward"
                      >
                        <IconArrowRight size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {isOfferStage && (
                    <Tooltip label="Generate Offer">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="yellow"
                        loading={isPending && pendingCandidateId === candidate.id}
                        onClick={() => onOpenOffer(candidate)}
                        aria-label="Generate offer"
                      >
                        <IconSend size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
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
  const [sortByScore, setSortByScore] = useState(false);

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

  // ── Fetch AI ranked scores (non-blocking) ──────────────────────────────
  const { data: rankedCandidates } = useRankedCandidates(jobId, !!jobId);

  // Build a map of candidateId → overallScore for quick lookup
  const scoreMap = useMemo(() => {
    const map = new Map<string, number>();
    if (rankedCandidates) {
      rankedCandidates.forEach((rc: CandidateMatchResponse) => {
        map.set(rc.candidateId, rc.overallScore);
      });
    }
    return map;
  }, [rankedCandidates]);

  // ── Move stage mutation ────────────────────────────────────────────────
  const stageMutation = useMutation({
    mutationFn: ({ candidateId, stage }: { candidateId: string; stage: RecruitmentStage }) =>
      recruitmentService.moveCandidateStage(candidateId, { stage }),
    onMutate: ({ candidateId }) => {
      setPendingCandidateId(candidateId);
    },
    onSuccess: (_, { stage }) => {
      notifications.show({
        title: 'Stage updated',
        message: `Candidate moved to ${STAGE_SHORT_LABEL[stage] ?? stage}`,
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['kanban-candidates', jobId] });
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
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
    const current = (candidate.currentStage as RecruitmentStage) ?? 'RECRUITERS_PHONE_CALL';
    const target = nextStage(current);
    if (!target) return;
    stageMutation.mutate({ candidateId: candidate.id, stage: target });
  }

  function handleMoveBackward(candidate: Candidate) {
    const current = (candidate.currentStage as RecruitmentStage) ?? 'RECRUITERS_PHONE_CALL';
    const target = prevStage(current);
    if (!target) return;
    stageMutation.mutate({ candidateId: candidate.id, stage: target });
  }

  function handleReject(candidate: Candidate) {
    stageMutation.mutate({ candidateId: candidate.id, stage: 'CANDIDATE_REJECTED' });
  }

  // ── Group candidates by stage ──────────────────────────────────────────
  function candidatesForStage(stage: RecruitmentStage): Candidate[] {
    const filtered = candidates.filter((c) => {
      const s = (c.currentStage as RecruitmentStage) ?? 'RECRUITERS_PHONE_CALL';
      return s === stage;
    });

    if (sortByScore && scoreMap.size > 0) {
      return [...filtered].sort((a, b) => {
        const sa = scoreMap.get(a.id) ?? -1;
        const sb = scoreMap.get(b.id) ?? -1;
        return sb - sa; // Descending
      });
    }

    return filtered;
  }

  // Collect rejected candidates (PANEL_REJECT + CANDIDATE_REJECTED)
  const rejectedCandidates = candidates.filter((c) =>
    REJECTION_STAGES.includes(c.currentStage as RecruitmentStage)
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
          {(error as Error & { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'An unexpected error occurred.'}
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
                13-stage pipeline — use arrows to move candidates forward or backward
              </Text>
            </div>
          </Group>
          <Group gap="sm">
            {scoreMap.size > 0 && (
              <Tooltip label="Sort candidates within each column by AI match score">
                <Switch
                  label="Rank by AI Score"
                  size="xs"
                  checked={sortByScore}
                  onChange={(e) => setSortByScore(e.currentTarget.checked)}
                />
              </Tooltip>
            )}
            <Badge variant="outline" color="red" size="sm">
              Rejected: {rejectedCandidates.length}
            </Badge>
            <Badge variant="outline" color="gray" size="sm">
              Total: {candidates.length}
            </Badge>
          </Group>
        </Group>

        {/* Kanban board — horizontally scrollable */}
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
                onMoveBackward={handleMoveBackward}
                onReject={handleReject}
                onOpenOffer={(c) => setOfferCandidate(c)}
                isPending={stageMutation.isPending}
                pendingCandidateId={pendingCandidateId}
                scoreMap={scoreMap}
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
                  <Text size="xs" c="dimmed">
                    {(c.currentStage as RecruitmentStage) === 'PANEL_REJECT' ? 'Panel Reject' : 'Rejected'}
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
