'use client';

import {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Calendar, Heart, Info, Plus, RefreshCw, Star, Target, Trophy, Users,} from 'lucide-react';
import {AppLayout} from '@/components/layout/AppLayout';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Textarea,
} from '@/components/ui';
import {
  useActiveChallenges,
  useActivePrograms,
  useCreateWellnessChallenge,
  useCreateWellnessProgram,
  useUpcomingChallenges,
} from '@/lib/hooks/queries/useWellness';
import type {ProgramCategory, ProgramType} from '@/lib/types/grow/wellness';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const programSchema = z.object({
  name: z.string().min(1, 'Program name is required').max(150),
  description: z.string().optional(),
  programType: z.enum(['ONGOING', 'CHALLENGE', 'WORKSHOP', 'CAMPAIGN', 'ASSESSMENT']),
  category: z.enum([
    'PHYSICAL_FITNESS',
    'MENTAL_HEALTH',
    'NUTRITION',
    'SLEEP',
    'STRESS_MANAGEMENT',
    'FINANCIAL_WELLNESS',
    'SOCIAL_WELLNESS',
    'PREVENTIVE_HEALTH',
    'WORK_LIFE_BALANCE',
  ]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  maxParticipants: z.coerce.number().positive().optional().or(z.literal('')),
  pointsReward: z.coerce.number().min(0).optional().or(z.literal('')),
  isFeatured: z.boolean().default(false),
  instructions: z.string().optional(),
  externalLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type ProgramFormData = z.infer<typeof programSchema>;

const challengeSchema = z.object({
  name: z.string().min(1, 'Challenge name is required').max(150),
  description: z.string().optional(),
  challengeType: z.string().min(1, 'Challenge type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  pointsReward: z.coerce.number().min(0).default(0),
  targetValue: z.coerce.number().positive().optional().or(z.literal('')),
  targetUnit: z.string().optional(),
  isTeamBased: z.boolean().default(false),
  maxTeamSize: z.coerce.number().positive().optional().or(z.literal('')),
  programId: z.string().optional(),
});

type ChallengeFormData = z.infer<typeof challengeSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  PHYSICAL_FITNESS: 'Physical Fitness',
  MENTAL_HEALTH: 'Mental Health',
  NUTRITION: 'Nutrition',
  SLEEP: 'Sleep',
  STRESS_MANAGEMENT: 'Stress Management',
  FINANCIAL_WELLNESS: 'Financial Wellness',
  SOCIAL_WELLNESS: 'Social Wellness',
  PREVENTIVE_HEALTH: 'Preventive Health',
  WORK_LIFE_BALANCE: 'Work-Life Balance',
};

const PROGRAM_TYPE_LABELS: Record<string, string> = {
  ONGOING: 'Ongoing',
  CHALLENGE: 'Challenge',
  WORKSHOP: 'Workshop',
  CAMPAIGN: 'Campaign',
  ASSESSMENT: 'Assessment',
};

// ─── Program Card ─────────────────────────────────────────────────────────────

function ProgramCard({program}: {
  program: {
    id: string;
    name: string;
    description?: string;
    category: string;
    programType: string;
    isActive: boolean;
    isFeatured: boolean;
    pointsReward?: number;
    participantCount?: number
  }
}) {
  return (
    <Card className="border border-[var(--border-main)] hover:shadow-[var(--shadow-elevated)] transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                {program.name}
              </span>
              {program.isFeatured && (
                <Badge variant="warning" className="text-xs flex items-center gap-1">
                  <Star size={10}/>
                  Featured
                </Badge>
              )}
              <Badge variant={program.isActive ? 'success' : 'secondary'} className="text-xs">
                {program.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {program.description && (
              <p className="text-caption line-clamp-2 mb-2">
                {program.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-caption">
              <span
                className='bg-accent-subtle text-accent px-2 py-0.5 rounded-full font-medium'>
                {CATEGORY_LABELS[program.category] ?? program.category}
              </span>
              <span className="bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
                {PROGRAM_TYPE_LABELS[program.programType] ?? program.programType}
              </span>
              {program.pointsReward != null && (
                <span className="flex items-center gap-1">
                  <Trophy size={10}/>
                  {program.pointsReward} pts
                </span>
              )}
              {program.participantCount != null && (
                <span className="flex items-center gap-1">
                  <Users size={10}/>
                  {program.participantCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Challenge Card ───────────────────────────────────────────────────────────

function ChallengeCard({challenge}: {
  challenge: {
    id: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    pointsReward: number;
    isTeamBased: boolean;
    isActive: boolean;
    participantCount?: number
  }
}) {
  const start = new Date(challenge.startDate);
  const end = new Date(challenge.endDate);
  return (
    <Card className="border border-[var(--border-main)] hover:shadow-[var(--shadow-elevated)] transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                {challenge.name}
              </span>
              <Badge variant={challenge.isActive ? 'success' : 'secondary'} className="text-xs">
                {challenge.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {challenge.isTeamBased && (
                <Badge variant="primary" className="text-xs flex items-center gap-1">
                  <Users size={10}/>
                  Team
                </Badge>
              )}
            </div>
            {challenge.description && (
              <p className="text-caption line-clamp-1 mb-2">
                {challenge.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-caption">
              <span className="flex items-center gap-1">
                <Calendar size={10}/>
                {start.toLocaleDateString()} – {end.toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Trophy size={10}/>
                {challenge.pointsReward} pts
              </span>
              {challenge.participantCount != null && (
                <span className="flex items-center gap-1">
                  <Users size={10}/>
                  {challenge.participantCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Create Program Modal ─────────────────────────────────────────────────────

function CreateProgramModal({
                              isOpen,
                              onClose,
                            }: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const createProgramMutation = useCreateWellnessProgram();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: {errors},
  } = useForm<ProgramFormData>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: '',
      description: '',
      programType: 'ONGOING',
      category: 'PHYSICAL_FITNESS',
      isFeatured: false,
    },
  });

  const onSubmit = async (data: ProgramFormData) => {
    await createProgramMutation.mutateAsync({
      name: data.name,
      description: data.description,
      programType: data.programType as ProgramType,
      category: data.category as ProgramCategory,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
      maxParticipants: data.maxParticipants ? Number(data.maxParticipants) : undefined,
      pointsReward: data.pointsReward ? Number(data.pointsReward) : undefined,
      isFeatured: data.isFeatured,
      isActive: true,
      instructions: data.instructions,
      externalLink: data.externalLink || undefined,
    });
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create Wellness Program</h2>
      </ModalHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Program Name <span className='text-status-danger-text'>*</span>
              </label>
              <Input {...register('name')} placeholder="e.g. 30-Day Step Challenge"/>
              {errors.name && <p className='text-xs text-status-danger-text mt-1'>{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Description
              </label>
              <Textarea {...register('description')} placeholder="Describe the program…" rows={2}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Type <span className='text-status-danger-text'>*</span>
                </label>
                <Select {...register('programType')}>
                  {Object.entries(PROGRAM_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Category <span className='text-status-danger-text'>*</span>
                </label>
                <Select {...register('category')}>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Start Date
                </label>
                <Input {...register('startDate')} type="date"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  End Date
                </label>
                <Input {...register('endDate')} type="date"/>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Points Reward
                </label>
                <Input {...register('pointsReward')} type="number" min={0} placeholder="0"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Max Participants
                </label>
                <Input {...register('maxParticipants')} type="number" min={1} placeholder="Unlimited"/>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                External Link (Optional)
              </label>
              <Input {...register('externalLink')} type="url" placeholder="https://…"/>
              {errors.externalLink && (
                <p className='text-xs text-status-danger-text mt-1'>{errors.externalLink.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Instructions (Optional)
              </label>
              <Textarea {...register('instructions')} placeholder="Step-by-step instructions…" rows={2}/>
            </div>

            <div className="flex items-center gap-2">
              <Controller
                name="isFeatured"
                control={control}
                render={({field}) => (
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="rounded border-[var(--border-main)]"
                  />
                )}
              />
              <label htmlFor="isFeatured" className="text-body-secondary cursor-pointer">
                Feature this program on the wellness page
              </label>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createProgramMutation.isPending}>
            {createProgramMutation.isPending ? 'Creating…' : 'Create Program'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ─── Create Challenge Modal ───────────────────────────────────────────────────

function CreateChallengeModal({
                                isOpen,
                                onClose,
                                programs,
                              }: {
  isOpen: boolean;
  onClose: () => void;
  programs: Array<{ id: string; name: string }>;
}) {
  const createChallengeMutation = useCreateWellnessChallenge();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: {errors},
  } = useForm<ChallengeFormData>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      name: '',
      description: '',
      challengeType: 'STEPS',
      startDate: '',
      endDate: '',
      pointsReward: 0,
      isTeamBased: false,
    },
  });

  const onSubmit = async (data: ChallengeFormData) => {
    await createChallengeMutation.mutateAsync({
      programId: data.programId || null,
      data: {
        name: data.name,
        description: data.description,
        challengeType: data.challengeType,
        startDate: data.startDate,
        endDate: data.endDate,
        pointsReward: Number(data.pointsReward),
        targetValue: data.targetValue ? Number(data.targetValue) : undefined,
        targetUnit: data.targetUnit,
        isTeamBased: data.isTeamBased,
        maxTeamSize: data.maxTeamSize ? Number(data.maxTeamSize) : undefined,
        isActive: true,
      },
    });
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create Wellness Challenge</h2>
      </ModalHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Challenge Name <span className='text-status-danger-text'>*</span>
              </label>
              <Input {...register('name')} placeholder="e.g. 10,000 Steps a Day"/>
              {errors.name && <p className='text-xs text-status-danger-text mt-1'>{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Description
              </label>
              <Textarea {...register('description')} placeholder="What is this challenge about?" rows={2}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Challenge Type <span className='text-status-danger-text'>*</span>
                </label>
                <Select {...register('challengeType')}>
                  <option value="STEPS">Steps</option>
                  <option value="SLEEP">Sleep</option>
                  <option value="WATER_INTAKE">Water Intake</option>
                  <option value="EXERCISE">Exercise</option>
                  <option value="MEDITATION">Meditation</option>
                  <option value="NUTRITION">Nutrition</option>
                  <option value="CUSTOM">Custom</option>
                </Select>
                {errors.challengeType && (
                  <p className='text-xs text-status-danger-text mt-1'>{errors.challengeType.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Points Reward
                </label>
                <Input {...register('pointsReward')} type="number" min={0} placeholder="0"/>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Start Date <span className='text-status-danger-text'>*</span>
                </label>
                <Input {...register('startDate')} type="date"/>
                {errors.startDate && (
                  <p className='text-xs text-status-danger-text mt-1'>{errors.startDate.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  End Date <span className='text-status-danger-text'>*</span>
                </label>
                <Input {...register('endDate')} type="date"/>
                {errors.endDate && (
                  <p className='text-xs text-status-danger-text mt-1'>{errors.endDate.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Target Value
                </label>
                <Input {...register('targetValue')} type="number" min={1} placeholder="e.g. 10000"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Target Unit
                </label>
                <Input {...register('targetUnit')} placeholder="e.g. steps, minutes"/>
              </div>
            </div>

            {programs.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Link to Program (Optional)
                </label>
                <Select {...register('programId')}>
                  <option value="">Standalone challenge</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Controller
                  name="isTeamBased"
                  control={control}
                  render={({field}) => (
                    <input
                      type="checkbox"
                      id="isTeamBased"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="rounded border-[var(--border-main)]"
                    />
                  )}
                />
                <label htmlFor="isTeamBased" className="text-body-secondary cursor-pointer">
                  Team-based challenge
                </label>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createChallengeMutation.isPending}>
            {createChallengeMutation.isPending ? 'Creating…' : 'Create Challenge'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function WellnessAdminPage() {
  const [activeTab, setActiveTab] = useState<'programs' | 'challenges'>('programs');
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  const {data: programs = [], isLoading: programsLoading, refetch: refetchPrograms} = useActivePrograms();
  const {
    data: activeChallenges = [],
    isLoading: activeChallengesLoading,
    refetch: refetchChallenges
  } = useActiveChallenges();
  const {data: upcomingChallenges = [], isLoading: upcomingLoading} = useUpcomingChallenges();

  const allChallenges = [...activeChallenges, ...upcomingChallenges].filter(
    (c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx
  );

  const isLoading = programsLoading || activeChallengesLoading || upcomingLoading;

  return (
    <AppLayout breadcrumbs={[{label: 'Wellness', href: '/wellness'}, {label: 'Admin'}]} activeMenuItem="wellness">
      <PermissionGate
        permission={Permissions.WELLNESS_MANAGE}
        fallback={
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[var(--text-secondary)] font-medium">Access Denied</p>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              You need WELLNESS_MANAGE permission to access this page.
            </p>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">
                Wellness Admin
              </h1>
              <p className="text-[var(--text-secondary)] skeuo-deboss text-sm mt-1">
                Create and manage wellness programs and challenges
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchPrograms();
                  refetchChallenges();
                }}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4"/>
                Refresh
              </Button>
              {activeTab === 'programs' ? (
                <Button onClick={() => setShowProgramModal(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4"/>
                  New Program
                </Button>
              ) : (
                <Button onClick={() => setShowChallengeModal(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4"/>
                  New Challenge
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className='rounded-lg bg-accent-subtle p-4'>
                  <Heart className='h-5 w-5 text-accent'/>
                </div>
                <div>
                  <p className="text-caption">Active Programs</p>
                  <p className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">{programs.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className='rounded-lg bg-status-success-bg p-4'>
                  <Target className='h-5 w-5 text-status-success-text'/>
                </div>
                <div>
                  <p className="text-caption">Active Challenges</p>
                  <p
                    className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">{activeChallenges.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className='rounded-lg bg-status-warning-bg p-4'>
                  <Calendar className='h-5 w-5 text-status-warning-text'/>
                </div>
                <div>
                  <p className="text-caption">Upcoming Challenges</p>
                  <p
                    className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">{upcomingChallenges.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'programs' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('programs')}
            >
              Programs ({programs.length})
            </Button>
            <Button
              variant={activeTab === 'challenges' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('challenges')}
            >
              Challenges ({allChallenges.length})
            </Button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className='h-6 w-6 animate-spin text-accent mr-4'/>
              <span className="text-[var(--text-muted)]">Loading…</span>
            </div>
          ) : activeTab === 'programs' ? (
            programs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Info className="h-10 w-10 text-[var(--text-muted)] mb-4"/>
                  <p className="font-medium text-[var(--text-secondary)]">No programs yet</p>
                  <p className="text-body-muted mt-1 mb-4">
                    Create your first wellness program to get started
                  </p>
                  <Button onClick={() => setShowProgramModal(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4"/>
                    Create Program
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {programs.map((program) => (
                  <ProgramCard key={program.id} program={program}/>
                ))}
              </div>
            )
          ) : (
            allChallenges.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Info className="h-10 w-10 text-[var(--text-muted)] mb-4"/>
                  <p className="font-medium text-[var(--text-secondary)]">No challenges yet</p>
                  <p className="text-body-muted mt-1 mb-4">
                    Create your first wellness challenge
                  </p>
                  <Button onClick={() => setShowChallengeModal(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4"/>
                    Create Challenge
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {allChallenges.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge}/>
                ))}
              </div>
            )
          )}
        </div>

        {/* Modals */}
        <CreateProgramModal isOpen={showProgramModal} onClose={() => setShowProgramModal(false)}/>
        <CreateChallengeModal
          isOpen={showChallengeModal}
          onClose={() => setShowChallengeModal(false)}
          programs={programs}
        />
      </PermissionGate>
    </AppLayout>
  );
}
