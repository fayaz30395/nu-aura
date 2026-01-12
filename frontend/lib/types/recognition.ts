// Recognition Types

export enum RecognitionType {
  KUDOS = 'KUDOS',
  APPRECIATION = 'APPRECIATION',
  ACHIEVEMENT = 'ACHIEVEMENT',
  MILESTONE = 'MILESTONE',
  SPOT_AWARD = 'SPOT_AWARD',
  PEER_NOMINATION = 'PEER_NOMINATION',
  MANAGER_RECOGNITION = 'MANAGER_RECOGNITION',
  TEAM_RECOGNITION = 'TEAM_RECOGNITION',
}

export enum RecognitionCategory {
  TEAMWORK = 'TEAMWORK',
  INNOVATION = 'INNOVATION',
  CUSTOMER_FOCUS = 'CUSTOMER_FOCUS',
  LEADERSHIP = 'LEADERSHIP',
  PROBLEM_SOLVING = 'PROBLEM_SOLVING',
  GOING_EXTRA_MILE = 'GOING_EXTRA_MILE',
  MENTORSHIP = 'MENTORSHIP',
  QUALITY = 'QUALITY',
  INITIATIVE = 'INITIATIVE',
  COLLABORATION = 'COLLABORATION',
  COMMUNICATION = 'COMMUNICATION',
  OTHER = 'OTHER',
}

export enum ReactionType {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  CELEBRATE = 'CELEBRATE',
  SUPPORT = 'SUPPORT',
  INSIGHTFUL = 'INSIGHTFUL',
}

export interface Recognition {
  id: string;
  giverId: string;
  giverName?: string;
  receiverId: string;
  receiverName?: string;
  type: RecognitionType;
  category?: RecognitionCategory;
  title: string;
  message?: string;
  pointsAwarded: number;
  isPublic: boolean;
  isAnonymous: boolean;
  badgeId?: string;
  badgeName?: string;
  likesCount: number;
  commentsCount: number;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  recognizedAt: string;
  createdAt: string;
}

export interface RecognitionRequest {
  receiverId: string;
  type: RecognitionType;
  category?: RecognitionCategory;
  title: string;
  message?: string;
  pointsAwarded?: number;
  isPublic?: boolean;
  isAnonymous?: boolean;
  badgeId?: string;
}

export interface RecognitionBadge {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  pointsValue: number;
  isActive: boolean;
  category?: string;
}

export interface EmployeePoints {
  id: string;
  employeeId: string;
  employeeName?: string;
  totalPointsEarned: number;
  currentBalance: number;
  pointsGiven: number;
  recognitionsReceived: number;
  recognitionsGiven: number;
  rank?: number;
}

export interface Milestone {
  id: string;
  employeeId: string;
  employeeName?: string;
  milestoneType: string;
  title: string;
  description?: string;
  achievedDate?: string;
  upcomingDate?: string;
}

export interface EngagementDashboard {
  totalRecognitions: number;
  recognitionsThisMonth: number;
  totalPointsAwarded: number;
  activeUsers: number;
  topReceivers: EmployeePoints[];
  topGivers: EmployeePoints[];
  recognitionsByCategory: Record<string, number>;
  recentRecognitions: Recognition[];
}
