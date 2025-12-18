'use client';

import React, { useState, useEffect } from 'react';
import {
  Heart,
  Plus,
  Trophy,
  Target,
  Flame,
  Footprints,
  Moon,
  Apple,
  Brain,
  Users,
  Calendar,
  TrendingUp,
  Droplets,
  Activity,
  Star,
  Crown,
  Medal,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Card,
  CardContent,
  Button,
  Input,
  Select,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Badge,
  Textarea,
} from '@/components/ui';
import { wellnessService } from '@/lib/services/wellness.service';
import type { WellnessProgram, WellnessChallenge, HealthLog, WellnessPoints, LeaderboardEntry } from '@/lib/types/wellness';
import { ProgramCategory, MetricType } from '@/lib/types/wellness';

const getCategoryIcon = (category: ProgramCategory) => {
  switch (category) {
    case ProgramCategory.PHYSICAL_FITNESS:
      return <Activity className="h-5 w-5" />;
    case ProgramCategory.MENTAL_HEALTH:
      return <Brain className="h-5 w-5" />;
    case ProgramCategory.NUTRITION:
      return <Apple className="h-5 w-5" />;
    case ProgramCategory.SLEEP:
      return <Moon className="h-5 w-5" />;
    case ProgramCategory.STRESS_MANAGEMENT:
      return <Heart className="h-5 w-5" />;
    default:
      return <Target className="h-5 w-5" />;
  }
};

const getCategoryColor = (category: ProgramCategory) => {
  switch (category) {
    case ProgramCategory.PHYSICAL_FITNESS:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case ProgramCategory.MENTAL_HEALTH:
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case ProgramCategory.NUTRITION:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case ProgramCategory.SLEEP:
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
    case ProgramCategory.STRESS_MANAGEMENT:
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const metricOptions = [
  { value: MetricType.STEPS, label: 'Steps', icon: Footprints, unit: 'steps' },
  { value: MetricType.SLEEP_HOURS, label: 'Sleep', icon: Moon, unit: 'hours' },
  { value: MetricType.WATER_INTAKE, label: 'Water', icon: Droplets, unit: 'glasses' },
  { value: MetricType.EXERCISE_MINUTES, label: 'Exercise', icon: Activity, unit: 'mins' },
  { value: MetricType.MEDITATION_MINUTES, label: 'Meditation', icon: Brain, unit: 'mins' },
];

export default function WellnessPage() {
  const [programs, setPrograms] = useState<WellnessProgram[]>([]);
  const [challenges, setChallenges] = useState<WellnessChallenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myPoints, setMyPoints] = useState<WellnessPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'programs' | 'challenges'>('programs');

  // Modal states
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logFormData, setLogFormData] = useState<Partial<HealthLog>>({
    metricType: MetricType.STEPS,
    value: 0,
    loggedAt: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [programsData, challengesData, leaderboardData, pointsData] = await Promise.all([
        wellnessService.getActivePrograms().catch(() => []),
        wellnessService.getActiveChallenges().catch(() => []),
        wellnessService.getLeaderboard(5).catch(() => []),
        wellnessService.getMyPoints().catch(() => null),
      ]);

      setPrograms(programsData);
      setChallenges(challengesData);
      setLeaderboard(leaderboardData);
      setMyPoints(pointsData);
    } catch (error) {
      console.error('Error fetching wellness data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogHealth = async () => {
    try {
      await wellnessService.logHealth({
        ...logFormData,
        loggedAt: logFormData.loggedAt || new Date().toISOString(),
      } as HealthLog);
      setIsLogModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error logging health metric:', error);
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      await wellnessService.joinChallenge(challengeId);
      fetchData();
    } catch (error) {
      console.error('Error joining challenge:', error);
    }
  };

  // Stats
  const stats = {
    totalPoints: myPoints?.totalPoints || 0,
    currentStreak: myPoints?.streak || 0,
    level: myPoints?.level || 1,
    activeChallenges: challenges.filter((c) => c.isJoined).length,
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Wellness' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs} activeMenuItem="wellness">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
              Employee Wellness
            </h1>
            <p className="text-surface-600 dark:text-surface-400">
              Track your health, join challenges, and earn rewards
            </p>
          </div>
          <Button onClick={() => setIsLogModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Health Metric
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500 p-3">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Total Points</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.totalPoints}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-3 dark:bg-orange-900">
                  <Flame className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Current Streak</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.currentStreak} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900">
                  <Star className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Level</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.level}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900">
                  <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">Active Challenges</p>
                  <p className="text-2xl font-bold text-surface-900 dark:text-white">{stats.activeChallenges}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Log Section */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Quick Log</h3>
            <div className="flex flex-wrap gap-3">
              {metricOptions.map((metric) => {
                const Icon = metric.icon;
                return (
                  <button
                    key={metric.value}
                    onClick={() => {
                      setLogFormData({ ...logFormData, metricType: metric.value });
                      setIsLogModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                  >
                    <Icon className="h-5 w-5 text-primary-500" />
                    <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{metric.label}</span>
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
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
              </div>
            ) : activeTab === 'programs' ? (
              // Programs Grid
              programs.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Heart className="h-12 w-12 text-surface-400" />
                    <p className="mt-4 text-lg font-medium text-surface-900 dark:text-white">
                      No wellness programs available
                    </p>
                    <p className="text-surface-600 dark:text-surface-400">
                      Check back later for new programs
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {programs.map((program) => (
                    <Card key={program.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`rounded-lg p-3 ${getCategoryColor(program.category)}`}>
                            {getCategoryIcon(program.category)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold text-surface-900 dark:text-white">
                                {program.name}
                              </h3>
                              {program.isFeatured && (
                                <Badge variant="warning" className="text-xs">Featured</Badge>
                              )}
                            </div>
                            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1 line-clamp-2">
                              {program.description || 'Join this wellness program'}
                            </p>
                            <div className="flex items-center gap-3 mt-3 text-xs text-surface-500">
                              {program.pointsReward && (
                                <span className="flex items-center gap-1">
                                  <Trophy className="h-3 w-3" />
                                  {program.pointsReward} pts
                                </span>
                              )}
                              {program.participantCount && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
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
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Target className="h-12 w-12 text-surface-400" />
                    <p className="mt-4 text-lg font-medium text-surface-900 dark:text-white">
                      No active challenges
                    </p>
                    <p className="text-surface-600 dark:text-surface-400">
                      Check back later for new challenges
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {challenges.map((challenge) => (
                    <Card key={challenge.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-surface-900 dark:text-white">
                              {challenge.name}
                            </h3>
                            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                              {challenge.description || 'Join this challenge and compete!'}
                            </p>
                          </div>
                          <Badge variant={challenge.isJoined ? 'success' : 'default'}>
                            {challenge.isJoined ? 'Joined' : 'Open'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-4 text-sm text-surface-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(challenge.startDate).toLocaleDateString()} - {new Date(challenge.endDate).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy className="h-4 w-4" />
                            {challenge.pointsReward} pts
                          </span>
                          {challenge.isTeamBased && (
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              Team
                            </span>
                          )}
                        </div>
                        {!challenge.isJoined && (
                          <Button
                            size="sm"
                            className="mt-4"
                            onClick={() => handleJoinChallenge(challenge.id)}
                          >
                            Join Challenge
                          </Button>
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
                <h3 className="flex items-center gap-2 text-lg font-semibold text-surface-900 dark:text-white mb-4">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Wellness Leaderboard
                </h3>
                {leaderboard.length === 0 ? (
                  <p className="text-sm text-surface-500">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map((entry, index) => (
                      <div
                        key={entry.employeeId}
                        className="flex items-center gap-3 p-2 rounded-lg bg-surface-50 dark:bg-surface-800"
                      >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-amber-600 text-white' :
                          'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300'
                        }`}>
                          {index === 0 ? <Crown className="h-4 w-4" /> :
                           index === 1 ? <Medal className="h-4 w-4" /> :
                           index === 2 ? <Medal className="h-4 w-4" /> :
                           <span className="text-sm font-medium">{entry.rank}</span>}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-surface-900 dark:text-white text-sm">
                            {entry.employeeName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 dark:text-green-400">
                            {entry.points}
                          </p>
                          <p className="text-xs text-surface-500">pts</p>
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
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
              Log Health Metric
            </h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Metric Type
                </label>
                <Select
                  value={logFormData.metricType}
                  onChange={(e) => setLogFormData({ ...logFormData, metricType: e.target.value as MetricType })}
                >
                  {metricOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Value
                </label>
                <Input
                  type="number"
                  value={logFormData.value}
                  onChange={(e) => setLogFormData({ ...logFormData, value: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter value"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Date
                </label>
                <Input
                  type="date"
                  value={logFormData.loggedAt?.split('T')[0]}
                  onChange={(e) => setLogFormData({ ...logFormData, loggedAt: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Notes (Optional)
                </label>
                <Textarea
                  value={logFormData.notes}
                  onChange={(e) => setLogFormData({ ...logFormData, notes: e.target.value })}
                  placeholder="Add any notes..."
                  rows={2}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsLogModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogHealth}>
              Log Metric
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </AppLayout>
  );
}
