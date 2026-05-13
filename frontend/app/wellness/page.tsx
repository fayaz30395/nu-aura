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
      return 'bg-accent-100 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400';
    case ProgramCategory.MENTAL_HEALTH:
      return 'bg-accent-100 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400';
    case ProgramCategory.NUTRITION:
      return 'bg-success-100 dark:bg-success-500/10 text-success-600 dark:text-success-400';
    case ProgramCategory.SLEEP:
      return 'bg-accent-100 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400';
    case ProgramCategory.STRESS_MANAGEMENT:
      return 'bg-warning-100 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400';
    default:
      return 'bg-[var(--bg-card-hover)] text-[var(--text-secondary)]';
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Employee Wellness
            </h1>
            <p className="text-[var(--text-secondary)]">
              Track your health, join challenges, and earn rewards
            </p>
          </div>
          <PermissionGate permission={Permissions.WELLNESS_CREATE}>
            <Button onClick={() => setIsLogModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4"/>
              Log Health Metric
            </Button>
          </PermissionGate>
        </div>

        {/* Error State */}
        {hasError && (
          <Card className="border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950/20">
            <CardContent className="p-4 row-between">
              <div className="flex items-center gap-4">
                <AlertCircle className="h-5 w-5 text-danger-500 flex-shrink-0"/>
                <p className="text-sm text-danger-600 dark:text-danger-400">
                  Some wellness data could not be loaded. Showing available information.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                refetchPrograms();
                refetchChallenges();
              }}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5"/>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="card-aura">
            <CardContent className="p-4">
              <Stat
                label="Total Points"
                value={stats.totalPoints}
                tone="success"
                icon={<Trophy className="h-3.5 w-3.5"/>}
              />
            </CardContent>
          </Card>
          <Card className="card-aura">
            <CardContent className="p-4">
              <Stat
                label="Current Streak"
                value={`${stats.currentStreak} days`}
                tone="warning"
                icon={<Flame className="h-3.5 w-3.5"/>}
              />
            </CardContent>
          </Card>
          <Card className="card-aura">
            <CardContent className="p-4">
              <Stat
                label="Level"
                value={stats.level}
                tone="accent"
                icon={<Star className="h-3.5 w-3.5"/>}
              />
            </CardContent>
          </Card>
          <Card className="card-aura">
            <CardContent className="p-4">
              <Stat
                label="Active Challenges"
                value={stats.activeChallenges}
                tone="accent"
                icon={<Target className="h-3.5 w-3.5"/>}
              />
            </CardContent>
          </Card>
        </div>

        {/* Quick Log Section */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Quick Log</h3>
            <div className="flex flex-wrap gap-4">
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
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
                  >
                    <Icon className="h-5 w-5 text-accent-500"/>
                    <span className="text-sm font-medium text-[var(--text-secondary)]">{metric.label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'programs' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('programs')}
              >
                Programs
              </Button>
              <Button
                variant={activeTab === 'challenges' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('challenges')}
              >
                Challenges
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div
                  className="h-8 w-8 animate-spin rounded-full border-4 border-accent-500 border-t-transparent"></div>
              </div>
            ) : activeTab === 'programs' ? (
              // Programs Grid
              programs.length === 0 ? (
                <Card className="card-aura">
                  <CardContent className="p-0">
                    <EmptyState
                      icon={<Heart className="h-8 w-8"/>}
                      title="No wellness programs available"
                      description="Check back later for new programs"
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {programs.map((program) => (
                    <Card key={program.id}
                          className="overflow-hidden hover:shadow-[var(--shadow-dropdown)] transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`rounded-lg p-4 ${getCategoryColor(program.category)}`}>
                            {getCategoryIcon(program.category)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold text-[var(--text-primary)]">
                                {program.name}
                              </h3>
                              {program.isFeatured && (
                                <StatusBadge status="FEATURED" domain={WELLNESS_FLAG} compact/>
                              )}
                            </div>
                            <p className="text-body-secondary mt-1 line-clamp-2">
                              {program.description || 'Join this wellness program'}
                            </p>
                            <div className="flex items-center gap-4 mt-4 text-caption">
                              {program.pointsReward && (
                                <span className="flex items-center gap-1">
                                  <Trophy className="h-3 w-3"/>
                                  {program.pointsReward} pts
                                </span>
                              )}
                              {program.participantCount && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3"/>
                                  {program.participantCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              // Challenges Grid
              challenges.length === 0 ? (
                <Card className="card-aura">
                  <CardContent className="p-0">
                    <EmptyState
                      icon={<Target className="h-8 w-8"/>}
                      title="No active challenges"
                      description="Check back later for new challenges"
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {challenges.map((challenge) => (
                    <Card key={challenge.id}
                          className="overflow-hidden hover:shadow-[var(--shadow-dropdown)] transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-[var(--text-primary)]">
                              {challenge.name}
                            </h3>
                            <p className="text-body-secondary mt-1">
                              {challenge.description || 'Join this challenge and compete!'}
                            </p>
                          </div>
                          <StatusBadge
                            status={challenge.isJoined ? 'JOINED' : 'OPEN'}
                            domain={WELLNESS_FLAG}
                          />
                        </div>
                        <div className="flex items-center gap-4 mt-4 text-body-muted">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4"/>
                            {formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy className="h-4 w-4"/>
                            {challenge.pointsReward} pts
                          </span>
                          {challenge.isTeamBased && (
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4"/>
                              Team
                            </span>
                          )}
                        </div>
                        {!challenge.isJoined && (
                          <PermissionGate permission={Permissions.WELLNESS_CREATE}>
                            <Button
                              size="sm"
                              className="mt-4"
                              onClick={() => handleJoinChallenge(challenge.id)}
                              disabled={joinChallengeMutation.isPending}
                            >
                              {joinChallengeMutation.isPending ? 'Joining...' : 'Join Challenge'}
                            </Button>
                          </PermissionGate>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Sidebar - Leaderboard */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="flex items-center gap-2 text-xl font-semibold text-[var(--text-primary)] mb-4">
                  <Crown className="h-5 w-5 text-warning-500"/>
                  Wellness Leaderboard
                </h3>
                {leaderboard.length === 0 ? (
                  <p className="text-body-muted">No data yet</p>
                ) : (
                  <div className="space-y-4">
                    {leaderboard.map((entry, index) => (
                      <div
                        key={entry.employeeId}
                        className="flex items-center gap-4 p-2 rounded-lg bg-[var(--bg-secondary)]"
                      >
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full ${index === 0 ? 'bg-warning-500 text-white' :
                            index === 1 ? 'bg-[var(--text-muted)] text-white' :
                              index === 2 ? 'bg-warning-600 text-white' :
                                'bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                          }`}>
                          {index === 0 ? <Crown className="h-4 w-4"/> :
                            index === 1 ? <Medal className="h-4 w-4"/> :
                              index === 2 ? <Medal className="h-4 w-4"/> :
                                <span className="text-sm font-medium">{entry.rank}</span>}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-[var(--text-primary)] text-sm">
                            {entry.employeeName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-success-600 dark:text-success-400">
                            {entry.points}
                          </p>
                          <p className="text-caption">pts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Log Health Modal */}
        <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)}>
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Log Health Metric
            </h2>
          </ModalHeader>
          <form onSubmit={handleLogSubmit(handleLogHealth)}>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Metric Type
                  </label>
                  <Controller
                    name="metricType"
                    control={logControl}
                    render={({field}) => (
                      <Select
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
                    <p className="text-xs text-danger-500 mt-1">{logErrors.metricType.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Value
                  </label>
                  <Input
                    type="number"
                    {...registerLog('value')}
                    placeholder="Enter value"
                  />
                  {logErrors.value && (
                    <p className="text-xs text-danger-500 mt-1">{logErrors.value.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Date
                  </label>
                  <Input
                    type="date"
                    {...registerLog('loggedAt')}
                  />
                  {logErrors.loggedAt && (
                    <p className="text-xs text-danger-500 mt-1">{logErrors.loggedAt.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Notes (Optional)
                  </label>
                  <Textarea
                    {...registerLog('notes')}
                    placeholder="Add any notes..."
                    rows={2}
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => setIsLogModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={logHealthMutation.isPending}>
                {logHealthMutation.isPending ? 'Logging...' : 'Log Metric'}
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
