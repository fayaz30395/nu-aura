// Wellness Types

export enum ProgramType {
  ONGOING = 'ONGOING',
  CHALLENGE = 'CHALLENGE',
  WORKSHOP = 'WORKSHOP',
  CAMPAIGN = 'CAMPAIGN',
  ASSESSMENT = 'ASSESSMENT',
}

export enum ProgramCategory {
  PHYSICAL_FITNESS = 'PHYSICAL_FITNESS',
  MENTAL_HEALTH = 'MENTAL_HEALTH',
  NUTRITION = 'NUTRITION',
  SLEEP = 'SLEEP',
  STRESS_MANAGEMENT = 'STRESS_MANAGEMENT',
  FINANCIAL_WELLNESS = 'FINANCIAL_WELLNESS',
  SOCIAL_WELLNESS = 'SOCIAL_WELLNESS',
  PREVENTIVE_HEALTH = 'PREVENTIVE_HEALTH',
  WORK_LIFE_BALANCE = 'WORK_LIFE_BALANCE',
}

export enum MetricType {
  STEPS = 'STEPS',
  SLEEP_HOURS = 'SLEEP_HOURS',
  WATER_INTAKE = 'WATER_INTAKE',
  EXERCISE_MINUTES = 'EXERCISE_MINUTES',
  CALORIES = 'CALORIES',
  WEIGHT = 'WEIGHT',
  MEDITATION_MINUTES = 'MEDITATION_MINUTES',
  MOOD_SCORE = 'MOOD_SCORE',
}

export interface WellnessProgram {
  id: string;
  name: string;
  description?: string;
  programType: ProgramType;
  category: ProgramCategory;
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  pointsReward?: number;
  budgetAmount?: number;
  isActive: boolean;
  isFeatured: boolean;
  imageUrl?: string;
  externalLink?: string;
  instructions?: string;
  participantCount?: number;
}

export interface WellnessChallenge {
  id: string;
  programId?: string;
  name: string;
  description?: string;
  challengeType: string;
  targetValue?: number;
  targetUnit?: string;
  startDate: string;
  endDate: string;
  pointsReward: number;
  badgeReward?: string;
  isTeamBased: boolean;
  maxTeamSize?: number;
  isActive: boolean;
  participantCount?: number;
  isJoined?: boolean;
}

export interface HealthLog {
  id?: string;
  employeeId?: string;
  metricType: MetricType;
  value: number;
  unit?: string;
  loggedAt: string;
  notes?: string;
}

export interface WellnessPoints {
  id: string;
  employeeId: string;
  employeeName?: string;
  totalPoints: number;
  currentBalance: number;
  pointsEarnedThisMonth?: number;
  level?: number;
  streak?: number;
}

export interface LeaderboardEntry {
  rank: number;
  employeeId: string;
  employeeName: string;
  points: number;
  avatar?: string;
}

export interface WellnessDashboard {
  totalPoints: number;
  pointsThisMonth: number;
  currentStreak: number;
  challengesCompleted: number;
  activeChallenges: WellnessChallenge[];
  featuredPrograms: WellnessProgram[];
  recentHealthLogs: HealthLog[];
  leaderboard: LeaderboardEntry[];
}
