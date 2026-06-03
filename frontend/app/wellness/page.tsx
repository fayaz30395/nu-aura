'use client';

import React, {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {
  Activity,
  AlertCircle,
  Apple,
  Brain,
  Calendar,
  Crown,
  Droplets,
  Flame,
  Footprints,
  Heart,
  Medal,
  Moon,
  Plus,
  RefreshCw,
  Star,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import {motion} from 'framer-motion';
import {AppLayout} from '@/components/layout/AppLayout';
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Stat,
  StatusBadge,
  Textarea,
} from '@/components/ui';
import {PageTransition, Reveal, Stagger} from '@/components/motion';
import {SkeletonCard} from '@/components/ui/Skeleton';
import {WELLNESS_FLAG} from '@/lib/status/vocabulary';
import {
  useActiveChallenges,
  useActivePrograms,
  useJoinChallenge,
  useLogHealth,
  useMyWellnessPoints,
  useWellnessLeaderboard,
} from '@/lib/hooks/queries/useWellness';
import type {HealthLog} from '@/lib/types/grow/wellness';
import {MetricType, ProgramCategory} from '@/lib/types/grow/wellness';
import {formatDate} from '@/lib/utils/format/date';

const healthLogSchema = z.object({
  metricType: z.string().min(1, 'Select a metric type'),
  value: z.coerce.number().positive('Value must be positive'),
  loggedAt: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

type HealthLogFormData = z.infer<typeof healthLogSchema>;

const getCategoryIcon = (category: ProgramCategory) => {
  switch (category) {
    case ProgramCategory.PHYSICAL_FITNESS:
      return <Activity className="h-5 w-5"/>;
    case ProgramCategory.MENTAL_HEALTH:
      return <Brain className="h-5 w-5"/>;
    case ProgramCategory.NUTRITION:
      return <Apple className="h-5 w-5"/>;
    case ProgramCategory.SLEEP:
      return <Moon className="h-5 w-5"/>;
    case ProgramCategory.STRESS_MANAGEMENT:
      return <Heart className="h-5 w-5"/>;
    default:
      return <Target className="h-5 w-5"/>;
  }
};

const getCategoryColor = (category: ProgramCategory) => {
  switch (category) {
    case ProgramCategory.PHYSICAL_FITNESS:
      return 'bg-[var(--accent-soft)] text-[var(--accent-text)]';
    case ProgramCategory.MENTAL_HEALTH:
      return 'bg-[var(--accent-soft)] text-[var(--accent-text)]';
    case ProgramCategory.NUTRITION:
      return 'bg-[var(--ok-bg)] text-[var(--ok-fg)]';
    case ProgramCategory.SLEEP:
      return 'bg-[var(--accent-soft)] text-[var(--accent-text)]';
    case ProgramCategory.STRESS_MANAGEMENT:
      return 'bg-[var(--warn-bg)] text-[var(--warn-fg)]';
    default:
      return 'bg-[var(--surface-hover)] text-[var(--text-2)]';
  }
};

const metricOptions = [
  {value: MetricType.STEPS, label: 'Steps', icon: Footprints, unit: 'steps'},
  {value: MetricType.SLEEP_HOURS, label: 'Sleep', icon: Moon, unit: 'hours'},
  {value: MetricType.WATER_INTAKE, label: 'Water', icon: Droplets, unit: 'glasses'},
  {value: MetricType.EXERCISE_MINUTES, label: 'Exercise', icon: Activity, unit: 'mins'},
  {value: MetricType.MEDITATION_MINUTES, label: 'Meditation', icon: Brain, unit: 'mins'},
];

export default function WellnessPage() {
  const [activeTab, setActiveTab] = useState<'programs' | 'challenges'>('programs');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const {
    register: registerLog,
    handleSubmit: handleLogSubmit,
    control: logControl,
    reset: resetLogForm,
    formState: {errors: logErrors},
  } = useForm<HealthLogFormData>({
    resolver: zodResolver(healthLogSchema),
    defaultValues: {
      metricType: MetricType.STEPS,
      value: 0,
      loggedAt: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  // React Query hooks
  const {
    data: programs = [],
    isLoading: programsLoading,
    isError: programsError,
    refetch: refetchPrograms
  } = useActivePrograms();
  const {
    data: challenges = [],
    isLoading: challengesLoading,
    isError: challengesError,
    refetch: refetchChallenges
  } = useActiveChallenges();
  const {data: leaderboard = [], isLoading: leaderboardLoading} = useWellnessLeaderboard(5);
  const {data: myPoints} = useMyWellnessPoints();
  const logHealthMutation = useLogHealth();
  const joinChallengeMutation = useJoinChallenge();

  const loading = programsLoading || challengesLoading || leaderboardLoading;
  const hasError = programsError || challengesError;

  const handleLogHealth = (formData: HealthLogFormData) => {
    logHealthMutation.mutate({
      metricType: formData.metricType as MetricType,
      value: formData.value,
      loggedAt: formData.loggedAt || new Date().toISOString(),
      notes: formData.notes,
    } as HealthLog, {
      onSuccess: () => {
        setIsLogModalOpen(false);
        resetLogForm({
          metricType: MetricType.STEPS,
          value: 0,
          loggedAt: new Date().toISOString().split('T')[0],
          notes: '',
        });
      },
    });
  };

  const handleJoinChallenge = (challengeId: string) => {
    joinChallengeMutation.mutate(challengeId);
  };

  // Stats
  const stats = {
    totalPoints: myPoints?.totalPoints || 0,
    currentStreak: myPoints?.streak || 0,
    level: myPoints?.level || 1,
    activeChallenges: challenges.filter((c) => c.isJoined).length,
  };

  const breadcrumbs = [
    {label: 'Dashboard', href: '/dashboard'},
    {label: 'Wellness'},
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="wellness">
      <PageTransition>
        <div className="space-y-6">
          {/* Header */}
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-aura-title text-[var(--text-1)]">
                  Employee Wellness
                </h1>
                <p className="text-[var(--text-2)] mt-1">
                  Track your health, join challenges, and earn rewards
                </p>
              </div>
              <PermissionGate permission={Permissions.WELLNESS_CREATE}>
                <Button onClick={() => setIsLogModalOpen(true)} className="hover-lift">
                  <Plus className="mr-2 h-4 w-4"/>
                  Log Health Metric
                </Button>
              </PermissionGate>
            </div>
          </Reveal>

        {/* Error State */}
        {hasError && (
          <Reveal>
            <Card className="border-[var(--err-bd)] bg-[var(--err-bg)]">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <AlertCircle className="h-5 w-5 text-[var(--err-fg)] flex-shrink-0"/>
                  <p className="text-sm text-[var(--err-fg)]">
                    Some wellness data could not be loaded. Showing available information.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  refetchPrograms();
                  refetchChallenges();
                }} className="focus-visible">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5"/>
                  Retry
                </Button>
              </CardContent>
            </Card>
          </Reveal>
        )}

        {/* Stats Cards */}
        <Stagger>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div>
              <Card className="hover-lift">
                <CardContent className="p-4">
                  <Stat
                    label="Total Points"
                    value={stats.totalPoints.toString()}
                    tone="success"
                    icon={<Trophy className="h-3.5 w-3.5"/>}
                  />
                </CardContent>
              </Card>
            </motion.div>
            <motion.div>
              <Card className="hover-lift">
                <CardContent className="p-4">
                  <Stat
                    label="Current Streak"
                    value={`${stats.currentStreak} days`}
                    tone="warning"
                    icon={<Flame className="h-3.5 w-3.5"/>}
                  />
                </CardContent>
              </Card>
            </motion.div>
            <motion.div>
              <Card className="hover-lift">
                <CardContent className="p-4">
                  <Stat
                    label="Level"
                    value={stats.level.toString()}
                    tone="accent"
                    icon={<Star className="h-3.5 w-3.5"/>}
                  />
                </CardContent>
              </Card>
            </motion.div>
            <motion.div>
              <Card className="hover-lift">
                <CardContent className="p-4">
                  <Stat
                    label="Active Challenges"
                    value={stats.activeChallenges.toString()}
                    tone="accent"
                    icon={<Target className="h-3.5 w-3.5"/>}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </Stagger>

        {/* Quick Log Section */}
        <Reveal>
          <Card className="hover-lift">
            <CardContent className="p-4">
              <h2 className="text-aura-title text-[var(--text-1)] mb-4">Quick Log</h2>
              <div className="flex flex-wrap gap-2">
                {metricOptions.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <button
                      key={metric.value}
                      onClick={() => {
                        resetLogForm({
                          metricType: metric.value,
                          value: 0,
                          loggedAt: new Date().toISOString().split('T')[0],
                          notes: '',
                        });
                        setIsLogModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-[var(--r-control)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-soft)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 press-scale"
                      aria-label={`Log ${metric.label}`}
                    >
                      <Icon className="h-4 w-4 text-[var(--accent)]"/>
                      <span className="text-xs font-medium text-[var(--text-2)]">{metric.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-[var(--border-soft)]">
                <button
                  onClick={() => setActiveTab('programs')}
                  aria-current={activeTab === 'programs' ? 'page' : undefined}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'programs'
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-2)] hover:text-[var(--text-1)]'
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]`}
                >
                  Programs
                </button>
                <button
                  onClick={() => setActiveTab('challenges')}
                  aria-current={activeTab === 'challenges' ? 'page' : undefined}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'challenges'
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-2)] hover:text-[var(--text-1)]'
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]`}
                >
                  Challenges
                </button>
              </div>

            {loading ? (
              <Stagger>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {Array.from({length: 4}).map((_, i) => (
                    <motion.div key={i}>
                      <SkeletonCard />
                    </motion.div>
                  ))}
                </div>
              </Stagger>
            ) : activeTab === 'programs' ? (
              // Programs Grid
              programs.length === 0 ? (
                <Card className="border-[var(--border-soft)]">
                  <CardContent className="p-0">
                    <EmptyState
                      icon={<Heart className="h-8 w-8"/>}
                      title="No wellness programs available"
                      description="New programs will appear here when HR launches fitness, mental health, or nutrition initiatives."
                    />
                  </CardContent>
                </Card>
              ) : (
                <Stagger>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {programs.map((program) => (
                      <motion.div key={program.id}>
                        <Card className="overflow-hidden hover-lift border-[var(--border-soft)]">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className={`rounded-[var(--r-lg)] p-3 flex-shrink-0 ${getCategoryColor(program.category)}`}>
                                {getCategoryIcon(program.category)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h2 className="font-semibold text-[var(--text-1)] truncate">
                                    {program.name}
                                  </h2>
                                  {program.isFeatured && (
                                    <StatusBadge status="FEATURED" domain={WELLNESS_FLAG} />
                                  )}
                                </div>
                                <p className="text-[var(--text-3)] mt-1 line-clamp-2 text-sm">
                                  {program.description || 'Join this wellness program'}
                                </p>
                                <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-3)]">
                                  {program.pointsReward && (
                                    <span className="flex items-center gap-1">
                                      <Trophy className="h-3.5 w-3.5"/>
                                      <span className="num">{program.pointsReward}</span>
                                      <span>pts</span>
                                    </span>
                                  )}
                                  {program.participantCount && (
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3.5 w-3.5"/>
                                      <span className="num">{program.participantCount}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </Stagger>
              )
            ) : (
              // Challenges Grid
              challenges.length === 0 ? (
                <Card className="border-[var(--border-soft)]">
                  <CardContent className="p-0">
                    <EmptyState
                      icon={<Target className="h-8 w-8"/>}
                      title="No active challenges"
                      description="Step count, hydration, and mindfulness challenges will appear here when HR launches them."
                    />
                  </CardContent>
                </Card>
              ) : (
                <Stagger>
                  <div className="space-y-4">
                    {challenges.map((challenge) => (
                      <motion.div key={challenge.id}>
                        <Card className="overflow-hidden hover-lift border-[var(--border-soft)]">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h2 className="font-semibold text-[var(--text-1)]">
                                  {challenge.name}
                                </h2>
                                <p className="text-[var(--text-2)] mt-1 text-sm line-clamp-2">
                                  {challenge.description || 'Join this challenge and compete!'}
                                </p>
                              </div>
                              <StatusBadge
                                status={challenge.isJoined ? 'JOINED' : 'OPEN'}
                                domain={WELLNESS_FLAG}
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-[var(--text-3)]">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5"/>
                                {formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Trophy className="h-3.5 w-3.5"/>
                                <span className="num">{challenge.pointsReward}</span>
                                <span>pts</span>
                              </span>
                              {challenge.isTeamBased && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5"/>
                                  Team
                                </span>
                              )}
                            </div>
                            {!challenge.isJoined && (
                              <PermissionGate permission={Permissions.WELLNESS_CREATE}>
                                <Button
                                  size="sm"
                                  className="mt-3 focus-visible"
                                  onClick={() => handleJoinChallenge(challenge.id)}
                                  disabled={joinChallengeMutation.isPending}
                                >
                                  {joinChallengeMutation.isPending ? 'Joining...' : 'Join Challenge'}
                                </Button>
                              </PermissionGate>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </Stagger>
              )
            )}
          </div>

            {/* Sidebar - Leaderboard */}
            <Reveal>
              <div className="space-y-4">
                <Card className="border-[var(--border-soft)]">
                  <CardContent className="p-4">
                    <h2 className="flex items-center gap-2 text-aura-title text-[var(--text-1)] mb-4">
                      <Crown className="h-5 w-5 text-[var(--warn-fg)]"/>
                      Wellness Leaderboard
                    </h2>
                    {leaderboard.length === 0 ? (
                      <EmptyState
                        size="compact"
                        icon={<Trophy className="w-full h-full"/>}
                        title="No leaderboard yet"
                        description="Join a challenge to start earning points."
                      />
                    ) : (
                      <Stagger>
                        <div className="space-y-2">
                          {leaderboard.map((entry, index) => (
                            <motion.div
                              key={entry.employeeId}
                              className="flex items-center gap-2 p-2 rounded-[var(--r-md)] bg-[var(--surface)]"
                            >
                              <div
                                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold flex-shrink-0 ${index === 0 ? 'bg-[var(--warn-fg)] text-white' :
                                  index === 1 ? 'bg-[var(--text-2)] text-white' :
                                    index === 2 ? 'bg-[var(--ok-fg)] text-white' :
                                      'bg-[var(--surface-hover)] text-[var(--text-2)]'
                                }`}>
                                {index === 0 ? <Crown className="h-4 w-4"/> :
                                  index === 1 ? <Medal className="h-4 w-4"/> :
                                    index === 2 ? <Medal className="h-4 w-4"/> :
                                      <span className="num">{entry.rank}</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[var(--text-1)] text-sm truncate">
                                  {entry.employeeName}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-[var(--ok-fg)] num">
                                  {entry.points}
                                </p>
                                <p className="text-[var(--text-3)] text-xs">pts</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </Stagger>
                    )}
                  </CardContent>
                </Card>
              </div>
            </Reveal>
          </div>
        </Reveal>

        {/* Log Health Modal */}
        <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)}>
          <ModalHeader>
            <h2 className="text-aura-title text-[var(--text-1)]">
              Log Health Metric
            </h2>
          </ModalHeader>
          <form onSubmit={handleLogSubmit(handleLogHealth)}>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label htmlFor="wellness-log-metric-type" className="block text-xs font-medium text-aura-micro text-[var(--text-2)] mb-2">
                    Metric Type
                  </label>
                  <Controller
                    name="metricType"
                    control={logControl}
                    render={({field}) => (
                      <Select
                        id="wellness-log-metric-type"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      >
                        {metricOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    )}
                  />
                  {logErrors.metricType && (
                    <p className="text-xs text-[var(--err-fg)] mt-1">{logErrors.metricType.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="wellness-log-value" className="block text-xs font-medium text-aura-micro text-[var(--text-2)] mb-2">
                    Value
                  </label>
                  <Input
                    id="wellness-log-value"
                    type="number"
                    {...registerLog('value')}
                    placeholder="Enter value"
                    className="focus-visible"
                  />
                  {logErrors.value && (
                    <p className="text-xs text-[var(--err-fg)] mt-1">{logErrors.value.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="wellness-log-date" className="block text-xs font-medium text-aura-micro text-[var(--text-2)] mb-2">
                    Date
                  </label>
                  <Input
                    id="wellness-log-date"
                    type="date"
                    {...registerLog('loggedAt')}
                    className="focus-visible"
                  />
                  {logErrors.loggedAt && (
                    <p className="text-xs text-[var(--err-fg)] mt-1">{logErrors.loggedAt.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="wellness-log-notes" className="block text-xs font-medium text-aura-micro text-[var(--text-2)] mb-2">
                    Notes
                  </label>
                  <Textarea
                    id="wellness-log-notes"
                    {...registerLog('notes')}
                    placeholder="Add any notes..."
                    rows={2}
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => setIsLogModalOpen(false)} className="focus-visible">
                Cancel
              </Button>
              <Button type="submit" disabled={logHealthMutation.isPending} className="focus-visible">
                {logHealthMutation.isPending ? 'Logging...' : 'Log Metric'}
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      </div>
    </PageTransition>
    </AppLayout>
  );
}
