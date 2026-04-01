'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Title,
  Text,
  Stack,
  Group,
  Paper,
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
  IconGripVertical,
} from '@tabler/icons-react';
// TODO(bundle): DragDropContext/Droppable/Draggable from @hello-pangea/dnd cannot be
// trivially dynamic-imported because CandidateCard (uses Draggable) and KanbanColumn
// (uses Droppable) are defined in this file and coupled to local types/handlers.
// To code-split the DnD library, move CandidateCard, KanbanColumn, and the
// DragDropContext wrapper into a separate KanbanBoard.tsx file and dynamic-import that.
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { AppLayout } from '@/components/layout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { StageBadge } from '@/components/recruitment/StageBadge';
import { OfferModal } from './OfferModal';
import { recruitmentService } from '@/lib/services/hire/recruitment.service';
import { useRankedCandidates } from '@/lib/hooks/queries/useRecruitment';
import type { Candidate, RecruitmentStage } from '@/lib/types/hire/recruitment';
import type { CandidateMatchResponse } from '@/lib/types/hire/ai-recruitment';

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
  TECHNICAL_INTERVIEW_SCHEDULED: 'Tech Interview',
  TECHNICAL_INTERVIEW_COMPLETED: 'Tech Done',
  MANAGEMENT_INTERVIEW_SCHEDULED: 'Mgmt Interview',
  MANAGEMENT_INTERVIEW_COMPLETED: 'Mgmt Done',
  CLIENT_INTERVIEW_SCHEDULED: 'Client Interview',
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

// ── Draggable candidate card ───────────────────────────────────────────
interface CandidateCardProps {
  candidate: Candidate;
  index: number;
  stage: RecruitmentStage;
  onMoveForward: (candidate: Candidate) => void;
  onMoveBackward: (candidate: Candidate) => void;
  onReject: (candidate: Candidate) => void;
  onOpenOffer: (candidate: Candidate) => void;
  isPending: boolean;
  pendingCandidateId: string | null;
  score: number | undefined;
}

function CandidateCard({
  candidate,
  index,
  stage,
  onMoveForward,
  onMoveBackward,
  onReject,
  onOpenOffer,
  isPending,
  pendingCandidateId,
  score,
}: CandidateCardProps) {
  const isOfferStage = stage === 'OFFER_NDA_TO_BE_RELEASED';
  const isTerminal = isOfferStage;
  const next = nextStage(stage);
  const prev = prevStage(stage);
  const isThisPending = isPending && pendingCandidateId === candidate.id;

  return (
    <Draggable draggableId={candidate.id} index={index}>
      {(provided, snapshot) => (
        <Paper
          ref={provided.innerRef}
          {...provided.draggableProps}
          withBorder
          p="sm"
          radius="sm"
          style={{
            ...provided.draggableProps.style,
            background: snapshot.isDragging
              ? 'var(--bg-secondary)'
              : 'white',
            boxShadow: snapshot.isDragging
              ? '0 8px 24px rgba(0,0,0,0.15)'
              : undefined,
            opacity: isThisPending ? 0.6 : 1,
          }}
        >
          <Stack gap={6}>
            <Group justify="space-between" align="center" gap={4}>
              <Group gap={4} style={{ flex: 1, minWidth: 0 }}>
                <div
                  {...provided.dragHandleProps}
                  style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}
                >
                  <IconGripVertical size={14} color="var(--text-muted)" />
                </div>
                <Text fw={600} size="sm" lineClamp={1} style={{ flex: 1 }}>
                  {candidate.fullName}
                </Text>
              </Group>
              {score !== undefined && <ScoreBadge score={score} />}
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
                    loading={isThisPending}
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
                    loading={isThisPending}
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
                    loading={isThisPending}
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
                  loading={isThisPending}
                  onClick={() => onReject(candidate)}
                  aria-label="Reject candidate"
                >
                  <IconX size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Stack>
        </Paper>
      )}
    </Draggable>
  );
}

// ── Droppable kanban column ────────────────────────────────────────────
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
  return (
    <Stack
      style={{
        minWidth: 220,
        maxWidth: 260,
        width: 240,
        flexShrink: 0,
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

      {/* Droppable area */}
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              minHeight: 80,
              maxHeight: 'calc(100vh - 240px)',
              overflowY: 'auto',
              background: snapshot.isDraggingOver
                ? 'var(--bg-secondary)'
                : 'var(--bg-main)',
              borderRadius: 'var(--mantine-radius-md)',
              padding: 'var(--mantine-spacing-xs)',
              border: snapshot.isDraggingOver
                ? '2px dashed var(--accent-primary)'
                : '2px solid transparent',
              transition: 'background 200ms ease, border 200ms ease',
            }}
          >
            <Stack gap="xs">
              {candidates.length === 0 && !snapshot.isDraggingOver && (
                <Text size="xs" c="dimmed" ta="center" py="md">
                  No candidates
                </Text>
              )}
              {candidates.map((candidate, index) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  index={index}
                  stage={stage}
                  onMoveForward={onMoveForward}
                  onMoveBackward={onMoveBackward}
                  onReject={onReject}
                  onOpenOffer={onOpenOffer}
                  isPending={isPending}
                  pendingCandidateId={pendingCandidateId}
                  score={scoreMap.get(candidate.id)}
                />
              ))}
            </Stack>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </Stack>
  );
}

// ── Main page component ────────────────────────────────────────────────
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

  // ── Drag-and-drop handler ──────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { draggableId, destination, source } = result;

      // Dropped outside a valid droppable or back in the same column
      if (!destination) return;
      if (destination.droppableId === source.droppableId) return;

      const targetStage = destination.droppableId as RecruitmentStage;

      // Fire mutation
      stageMutation.mutate({ candidateId: draggableId, stage: targetStage });
    },
    [stageMutation]
  );

  // ── Button handlers ───────────────────────────────────────────────────
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
      {/* DEF-52: Gate entire kanban page on RECRUITMENT_VIEW to prevent UI leak */}
      <PermissionGate
        anyOf={[Permissions.RECRUITMENT_VIEW, Permissions.CANDIDATE_VIEW]}
        fallback={
          <Center style={{ height: '60vh' }}>
            <Alert icon={<IconAlertCircle size={16} />} color="orange" title="Access Denied">
              You do not have permission to view the recruitment pipeline.
            </Alert>
          </Center>
        }
      >
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
              <Title order={3} className="skeuo-emboss">Recruitment Pipeline</Title>
              <Text size="sm" c="dimmed">
                Drag candidates between stages or use arrows to move forward / backward
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
            <Badge variant="outline" color="red" size="sm" className="badge-status">
              Rejected: {rejectedCandidates.length}
            </Badge>
            <Badge variant="outline" color="gray" size="sm" className="badge-status">
              Total: {candidates.length}
            </Badge>
          </Group>
        </Group>

        {/* Kanban board — drag-and-drop enabled, horizontally scrollable */}
        <DragDropContext onDragEnd={handleDragEnd}>
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
        </DragDropContext>

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
      </PermissionGate>
    </AppLayout>
  );
}
